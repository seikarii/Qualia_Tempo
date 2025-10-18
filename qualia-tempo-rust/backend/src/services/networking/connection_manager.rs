//! # Responsibility
//! Manages client connection registry and room assignment.
//!
//! ---
//!
//! This service maintains an in-memory registry of active connections using
//! lock-free data structures for maximum performance.

// Allow private_interfaces warning - Shaku's Component macro generates a Parameters struct
// that exposes the private Connection type. This is acceptable as the type is only used
// internally by Shaku's DI container.
#![allow(private_interfaces)]

use shaku::Component;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use tracing::{instrument, debug, warn};
use anyhow::Result;
use async_trait::async_trait;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use shared_core::traits::IConnectionManagerService;
use crate::services::interfaces::ILogger;

/// # Responsibility
/// Represents a single client connection with metadata.
#[derive(Debug, Clone)]
#[allow(dead_code)] // connected_at used for audit/debugging purposes
struct Connection {
    id: Uuid,
    room_id: Option<String>,
    connected_at: DateTime<Utc>,
    last_heartbeat: DateTime<Utc>,
}

/// # Responsibility
/// Manages the registry of active client connections and room assignments.
///
/// ---
///
/// Uses RwLock for concurrent access. Optimized for high read frequency
/// (checking room membership) with occasional writes (connect/disconnect).
#[derive(Component, Clone)]
#[shaku(interface = IConnectionManagerService)]
pub struct ConnectionManagerService {
    connections: Arc<RwLock<HashMap<Uuid, Connection>>>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

impl ConnectionManagerService {
    /// Creates a new ConnectionManagerService
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            logger,
        }
    }
    
    /// Updates the heartbeat timestamp for a connection
    #[instrument(skip(self))]
    pub async fn update_heartbeat(&self, connection_id: Uuid) -> Result<()> {
        let mut connections = self.connections.write().await;
        
        if let Some(conn) = connections.get_mut(&connection_id) {
            conn.last_heartbeat = Utc::now();
            debug!("Updated heartbeat for connection: {}", connection_id);
            Ok(())
        } else {
            anyhow::bail!("Connection not found: {}", connection_id)
        }
    }
}

#[async_trait]
impl IConnectionManagerService for ConnectionManagerService {
    #[instrument(skip(self))]
    async fn register_connection(&self, connection_id: Uuid, room_id: Option<String>) -> Result<()> {
        let mut connections = self.connections.write().await;
        
        let now = Utc::now();
        let connection = Connection {
            id: connection_id,
            room_id: room_id.clone(),
            connected_at: now,
            last_heartbeat: now,
        };
        
        connections.insert(connection_id, connection);
        
        let room_info = room_id.as_deref().unwrap_or("default");
        self.logger.info(&format!(
            "Registered connection {} in room '{}' (total: {})",
            connection_id,
            room_info,
            connections.len()
        ));
        
        Ok(())
    }
    
    #[instrument(skip(self))]
    async fn unregister_connection(&self, connection_id: Uuid) -> Result<()> {
        let mut connections = self.connections.write().await;
        
        if let Some(conn) = connections.remove(&connection_id) {
            let room_info = conn.room_id.as_deref().unwrap_or("default");
            self.logger.info(&format!(
                "Unregistered connection {} from room '{}' (remaining: {})",
                connection_id,
                room_info,
                connections.len()
            ));
            Ok(())
        } else {
            warn!("Attempted to unregister non-existent connection: {}", connection_id);
            anyhow::bail!("Connection not found: {}", connection_id)
        }
    }
    
    #[instrument(skip(self))]
    async fn get_room_connections(&self, room_id: &str) -> Result<Vec<Uuid>> {
        let connections = self.connections.read().await;
        
        let room_connections: Vec<Uuid> = connections
            .values()
            .filter(|conn| {
                conn.room_id.as_deref() == Some(room_id)
            })
            .map(|conn| conn.id)
            .collect();
        
        debug!("Room '{}' has {} connections", room_id, room_connections.len());
        
        Ok(room_connections)
    }
    
    #[instrument(skip(self))]
    async fn move_to_room(&self, connection_id: Uuid, room_id: String) -> Result<()> {
        let mut connections = self.connections.write().await;
        
        if let Some(conn) = connections.get_mut(&connection_id) {
            let old_room = conn.room_id.clone().unwrap_or_else(|| "default".to_string());
            conn.room_id = Some(room_id.clone());
            
            self.logger.info(&format!(
                "Moved connection {} from room '{}' to '{}'",
                connection_id,
                old_room,
                room_id
            ));
            
            Ok(())
        } else {
            warn!("Attempted to move non-existent connection: {}", connection_id);
            anyhow::bail!("Connection not found: {}", connection_id)
        }
    }
    
    fn active_connection_count(&self) -> usize {
        // Using try_read to avoid blocking if lock is held
        // Returns 0 if lock unavailable (safe default)
        self.connections.try_read()
            .map(|conns| conns.len())
            .unwrap_or(0)
    }
    
    fn room_count(&self) -> usize {
        self.connections.try_read()
            .map(|conns| {
                let mut rooms = std::collections::HashSet::new();
                for conn in conns.values() {
                    if let Some(ref room) = conn.room_id {
                        rooms.insert(room.clone());
                    }
                }
                rooms.len()
            })
            .unwrap_or(0)
    }
    
    #[instrument(skip(self))]
    async fn cleanup_dead_connections(&self) -> Result<usize> {
        let mut connections = self.connections.write().await;
        
        let timeout_threshold = Utc::now() - chrono::Duration::seconds(30);
        let mut dead_connections = Vec::new();
        
        for (id, conn) in connections.iter() {
            if conn.last_heartbeat < timeout_threshold {
                dead_connections.push(*id);
            }
        }
        
        let count = dead_connections.len();
        
        for id in dead_connections {
            connections.remove(&id);
            debug!("Cleaned up dead connection: {}", id);
        }
        
        if count > 0 {
            self.logger.info(&format!("Cleaned up {} dead connections", count));
        }
        
        Ok(count)
    }
}

// Default implementation for manual instantiation (with logger)
impl Default for ConnectionManagerService {
    fn default() -> Self {
        Self::new(Arc::new(crate::services::core::QualiaLogger::new()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::QualiaLogger;
    
    fn create_test_service() -> ConnectionManagerService {
        ConnectionManagerService::new(Arc::new(QualiaLogger::default()))
    }
    
    #[tokio::test]
    async fn test_register_and_unregister_connection() {
        let service = create_test_service();
        let conn_id = Uuid::new_v4();
        
        // Register connection
        service.register_connection(conn_id, Some("test_room".to_string()))
            .await
            .expect("Failed to register connection");
        
        assert_eq!(service.active_connection_count(), 1);
        
        // Unregister connection
        service.unregister_connection(conn_id)
            .await
            .expect("Failed to unregister connection");
        
        assert_eq!(service.active_connection_count(), 0);
    }
    
    #[tokio::test]
    async fn test_get_room_connections() {
        let service = create_test_service();
        let conn1 = Uuid::new_v4();
        let conn2 = Uuid::new_v4();
        let conn3 = Uuid::new_v4();
        
        service.register_connection(conn1, Some("room1".to_string())).await.unwrap();
        service.register_connection(conn2, Some("room1".to_string())).await.unwrap();
        service.register_connection(conn3, Some("room2".to_string())).await.unwrap();
        
        let room1_conns = service.get_room_connections("room1").await.unwrap();
        assert_eq!(room1_conns.len(), 2);
        assert!(room1_conns.contains(&conn1));
        assert!(room1_conns.contains(&conn2));
        
        let room2_conns = service.get_room_connections("room2").await.unwrap();
        assert_eq!(room2_conns.len(), 1);
        assert!(room2_conns.contains(&conn3));
    }
    
    #[tokio::test]
    async fn test_move_to_room() {
        let service = create_test_service();
        let conn_id = Uuid::new_v4();
        
        service.register_connection(conn_id, Some("room1".to_string())).await.unwrap();
        
        let room1_conns = service.get_room_connections("room1").await.unwrap();
        assert_eq!(room1_conns.len(), 1);
        
        service.move_to_room(conn_id, "room2".to_string()).await.unwrap();
        
        let room1_conns = service.get_room_connections("room1").await.unwrap();
        assert_eq!(room1_conns.len(), 0);
        
        let room2_conns = service.get_room_connections("room2").await.unwrap();
        assert_eq!(room2_conns.len(), 1);
    }
    
    #[tokio::test]
    async fn test_room_count() {
        let service = create_test_service();
        
        service.register_connection(Uuid::new_v4(), Some("room1".to_string())).await.unwrap();
        service.register_connection(Uuid::new_v4(), Some("room2".to_string())).await.unwrap();
        service.register_connection(Uuid::new_v4(), Some("room1".to_string())).await.unwrap();
        
        assert_eq!(service.room_count(), 2);
    }
    
    #[tokio::test]
    async fn test_cleanup_dead_connections() {
        let service = create_test_service();
        let conn_id = Uuid::new_v4();
        
        service.register_connection(conn_id, Some("test_room".to_string())).await.unwrap();
        
        // Manually manipulate last_heartbeat to simulate timeout
        {
            let mut connections = service.connections.write().await;
            if let Some(conn) = connections.get_mut(&conn_id) {
                conn.last_heartbeat = Utc::now() - chrono::Duration::seconds(60);
            }
        }
        
        let cleaned = service.cleanup_dead_connections().await.unwrap();
        assert_eq!(cleaned, 1);
        assert_eq!(service.active_connection_count(), 0);
    }
    
    #[tokio::test]
    async fn test_unregister_nonexistent_connection() {
        let service = create_test_service();
        let conn_id = Uuid::new_v4();
        
        let result = service.unregister_connection(conn_id).await;
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_heartbeat_update() {
        let service = create_test_service();
        let conn_id = Uuid::new_v4();
        
        service.register_connection(conn_id, Some("test_room".to_string())).await.unwrap();
        
        // Update heartbeat
        service.update_heartbeat(conn_id).await.unwrap();
        
        // Verify connection is still alive after cleanup
        let cleaned = service.cleanup_dead_connections().await.unwrap();
        assert_eq!(cleaned, 0);
        assert_eq!(service.active_connection_count(), 1);
    }
}

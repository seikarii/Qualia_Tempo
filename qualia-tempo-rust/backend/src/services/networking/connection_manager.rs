//! # Responsibility
//! Manages connection registry and lifecycle tracking.
//!
//! ---
//!
//! Uses dashmap for lock-free concurrent access to connection registry.

use async_trait::async_trait;
use anyhow::Result;
use dashmap::DashMap;
use shared_core::traits::{IConnectionManagerService, ILogger};
use shaku::Component;
use std::sync::Arc;
use tokio::time::Instant;

/// # Responsibility
/// Connection metadata for tracking and diagnostics.
#[derive(Debug, Clone)]
pub struct ConnectionMetadata {
    pub connection_id: String,
    pub connected_at: Instant,
    pub last_heartbeat: Instant,
}

/// # Responsibility
/// Tracks and manages all active WebSocket connections.
///
/// ---
///
/// Uses DashMap for lock-free concurrent access patterns.
/// COMPLIANCE: QUALIA.CODE.RUST §4.3 - Lock-free data structures.
#[derive(Component)]
#[shaku(interface = IConnectionManagerService)]
pub struct ConnectionManagerService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    /// Connection registry (connection_id -> metadata)
    connections: Arc<DashMap<String, ConnectionMetadata>>,
}

impl ConnectionManagerService {
    /// Creates new instance (called by Shaku)
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self {
            logger,
            connections: Arc::new(DashMap::new()),
        }
    }
    
    /// Removes stale connections (no heartbeat for 30+ seconds)
    ///
    /// # Errors
    /// Returns error if unregister_connection fails for any stale connection.
    pub async fn cleanup_stale_connections(&self) -> Result<usize> {
        let stale_threshold = tokio::time::Duration::from_secs(30);
        let now = Instant::now();
        
        let stale_ids: Vec<String> = self.connections
            .iter()
            .filter(|entry| now.duration_since(entry.last_heartbeat) > stale_threshold)
            .map(|entry| entry.connection_id.clone())
            .collect();
        
        let count = stale_ids.len();
        
        for id in stale_ids {
            self.unregister_connection(&id).await?;
            self.logger.warn(&format!("Removed stale connection: {id}"));
        }
        
        Ok(count)
    }
}

#[async_trait]
impl IConnectionManagerService for ConnectionManagerService {
    async fn register_connection(&self, connection_id: String) -> Result<()> {
        let now = Instant::now();
        let metadata = ConnectionMetadata {
            connection_id: connection_id.clone(),
            connected_at: now,
            last_heartbeat: now,
        };
        
        self.connections.insert(connection_id.clone(), metadata);
        self.logger.info(&format!("Connection registered: {connection_id}"));
        
        Ok(())
    }
    
    async fn unregister_connection(&self, connection_id: &str) -> Result<()> {
        if self.connections.remove(connection_id).is_some() {
            self.logger.info(&format!("Connection unregistered: {connection_id}"));
        }
        Ok(())
    }
    
    fn update_heartbeat(&self, connection_id: &str) {
        if let Some(mut conn) = self.connections.get_mut(connection_id) {
            conn.last_heartbeat = Instant::now();
        }
    }
    
    fn active_connection_count(&self) -> usize {
        self.connections.len()
    }
    
    fn get_active_connections(&self) -> Vec<String> {
        self.connections
            .iter()
            .map(|entry| entry.connection_id.clone())
            .collect()
    }
}

// Note: Default implementation removed as it conflicts with Shaku Component pattern
// ConnectionManagerService is instantiated via DI container only

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    use std::sync::Arc;

    fn create_test_service() -> ConnectionManagerService {
        let mock_logger = MockLogger::with_defaults();
        
        ConnectionManagerService {
            logger: Arc::new(mock_logger),
            connections: Arc::new(DashMap::new()),
        }
    }

    #[tokio::test]
    async fn test_connection_manager_creation() {
        let service = create_test_service();
        
        assert_eq!(service.active_connection_count(), 0, "Should start with 0 connections");
    }

    #[tokio::test]
    async fn test_register_connection() {
        let service = create_test_service();
        
        let result = service.register_connection("conn-001".to_string()).await;
        
        assert!(result.is_ok(), "Should register connection successfully");
        assert_eq!(service.active_connection_count(), 1, "Should have 1 active connection");
    }

    #[tokio::test]
    async fn test_unregister_connection() {
        let service = create_test_service();
        
        service.register_connection("conn-001".to_string()).await.expect("Test should not panic");
        assert_eq!(service.active_connection_count(), 1);
        
        let result = service.unregister_connection("conn-001").await;
        
        assert!(result.is_ok(), "Should unregister connection successfully");
        assert_eq!(service.active_connection_count(), 0, "Should have 0 active connections");
    }

    #[tokio::test]
    async fn test_unregister_nonexistent_connection() {
        let service = create_test_service();
        
        // Unregistering non-existent connection should not fail
        let result = service.unregister_connection("nonexistent").await;
        assert!(result.is_ok(), "Unregistering nonexistent connection should be idempotent");
    }

    #[tokio::test]
    async fn test_update_heartbeat() {
        let service = create_test_service();
        
        service.register_connection("conn-001".to_string()).await.expect("Test should not panic");
        
        // Get initial heartbeat timestamp
        let initial_heartbeat = service.connections.get("conn-001").expect("Test should not panic").last_heartbeat;
        
        // Wait a bit to ensure timestamp changes
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        
        // Update heartbeat
        service.update_heartbeat("conn-001");
        
        // Get updated heartbeat
        let updated_heartbeat = service.connections.get("conn-001").expect("Test should not panic").last_heartbeat;
        
        assert!(updated_heartbeat > initial_heartbeat, "Heartbeat should be updated");
    }

    #[tokio::test]
    async fn test_get_active_connections() {
        let service = create_test_service();
        
        service.register_connection("conn-001".to_string()).await.expect("Test should not panic");
        service.register_connection("conn-002".to_string()).await.expect("Test should not panic");
        service.register_connection("conn-003".to_string()).await.expect("Test should not panic");
        
        let active = service.get_active_connections();
        
        assert_eq!(active.len(), 3, "Should return 3 active connections");
        assert!(active.contains(&"conn-001".to_string()));
        assert!(active.contains(&"conn-002".to_string()));
        assert!(active.contains(&"conn-003".to_string()));
    }

    #[tokio::test]
    async fn test_cleanup_stale_connections() {
        let service = create_test_service();
        
        // Register connection
        service.register_connection("conn-001".to_string()).await.expect("Test should not panic");
        
        // Manually set heartbeat to 35 seconds ago (beyond 30s threshold)
        {
            let mut conn = service.connections.get_mut("conn-001").expect("Test should not panic");
            conn.last_heartbeat = Instant::now() - tokio::time::Duration::from_secs(35);
        }
        
        // Cleanup stale connections
        let removed_count = service.cleanup_stale_connections().await.expect("Test should not panic");
        
        assert_eq!(removed_count, 1, "Should remove 1 stale connection");
        assert_eq!(service.active_connection_count(), 0, "Should have 0 connections after cleanup");
    }

    #[tokio::test]
    async fn test_cleanup_does_not_remove_fresh_connections() {
        let service = create_test_service();
        
        // Register connections
        service.register_connection("conn-001".to_string()).await.expect("Test should not panic");
        service.register_connection("conn-002".to_string()).await.expect("Test should not panic");
        
        // Update heartbeat for conn-001 (fresh)
        service.update_heartbeat("conn-001");
        
        // Set conn-002 heartbeat to stale (35 seconds ago)
        {
            let mut conn = service.connections.get_mut("conn-002").expect("Test should not panic");
            conn.last_heartbeat = Instant::now() - tokio::time::Duration::from_secs(35);
        }
        
        // Cleanup
        let removed_count = service.cleanup_stale_connections().await.expect("Test should not panic");
        
        assert_eq!(removed_count, 1, "Should remove only stale connection");
        assert_eq!(service.active_connection_count(), 1, "Should keep fresh connection");
        
        let active = service.get_active_connections();
        assert!(active.contains(&"conn-001".to_string()), "Fresh connection should remain");
        assert!(!active.contains(&"conn-002".to_string()), "Stale connection should be removed");
    }

    #[tokio::test]
    async fn test_concurrent_registration() {
        let service = Arc::new(create_test_service());
        
        let mut handles = vec![];
        
        // Spawn 100 concurrent registration tasks
        for i in 0..100 {
            let service_clone = service.clone();
            let handle = tokio::spawn(async move {
                service_clone.register_connection(format!("conn-{i:03}")).await
            });
            handles.push(handle);
        }
        
        // Wait for all tasks
        for handle in handles {
            handle.await.expect("Test should not panic").expect("Test should not panic");
        }
        
        assert_eq!(service.active_connection_count(), 100, "Should register all 100 connections");
    }

    #[tokio::test]
    async fn test_connection_metadata_fields() {
        let service = create_test_service();
        
        service.register_connection("conn-001".to_string()).await.expect("Test should not panic");
        
        let metadata = service.connections.get("conn-001").expect("Test should not panic");
        
        assert_eq!(metadata.connection_id, "conn-001");
        assert!(metadata.connected_at.elapsed().as_secs() < 1, "Should be recently connected");
        assert!(metadata.last_heartbeat.elapsed().as_secs() < 1, "Heartbeat should be recent");
    }
}

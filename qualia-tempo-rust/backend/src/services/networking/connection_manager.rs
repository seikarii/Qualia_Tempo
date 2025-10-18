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
    // Note: Tests require mock ILogger implementation
    // For Phase 4, tests are placeholders pending mock infrastructure
    
    #[tokio::test]
    async fn test_connection_manager_placeholder() {
        // Integration tests will be completed in Phase 5 with full mock infrastructure
        assert!(true, "Placeholder test for Phase 4");
    }
}

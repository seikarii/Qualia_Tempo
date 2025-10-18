//! # Responsibility
//! Networking interface trait definitions for WebSocket and state streaming.
//!
//! ---
//!
//! These traits define the contract for all networking-related services.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Interface;

/// # Responsibility
/// Manages individual WebSocket connections and message routing.
///
/// ---
///
/// Implementations MUST handle:
/// - Connection lifecycle (connect, heartbeat, disconnect)
/// - Bidirectional message serialization
/// - Error handling and reconnection logic
///
/// NOTE: Axum-specific WebSocket handling lives in backend::services::networking::websocket
/// This trait focuses on business logic, not framework integration.
#[async_trait]
pub trait IWebSocketService: Interface + Send + Sync {
    /// Handles a WebSocket connection lifecycle
    async fn handle_connection(&self, connection_id: String) -> Result<()>;
    
    /// Sends a message to a specific connection
    async fn send_message(&self, connection_id: &str, message: Vec<u8>) -> Result<()>;
    
    /// Broadcasts a message to all connections
    async fn broadcast_message(&self, message: Vec<u8>) -> Result<usize>;
}

/// # Responsibility
/// Manages game state packaging and streaming at 60 FPS.
///
/// ---
///
/// MUST implement rate limiting and compression for efficient bandwidth usage.
#[async_trait]
pub trait IGameStateStreamingService: Interface + Send + Sync {
    /// Packages and broadcasts current game state to all connected clients
    async fn stream_state(&self) -> Result<()>;
    
    /// Sets the streaming rate (updates per second)
    fn set_rate(&mut self, updates_per_second: u32);
}

/// # Responsibility
/// Tracks active connections and manages connection registry.
///
/// ---
///
/// Handles connection lifecycle events and cleanup of dead connections.
#[async_trait]
pub trait IConnectionManagerService: Interface + Send + Sync {
    /// Registers a new connection
    async fn register_connection(&self, connection_id: String) -> Result<()>;
    
    /// Unregisters a connection
    async fn unregister_connection(&self, connection_id: &str) -> Result<()>;
    
    /// Updates last heartbeat timestamp for a connection
    fn update_heartbeat(&self, connection_id: &str);
    
    /// Returns count of active connections
    fn active_connection_count(&self) -> usize;
    
    /// Returns all active connection IDs
    fn get_active_connections(&self) -> Vec<String>;
}

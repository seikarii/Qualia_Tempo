//! # Responsibility
//! WebSocket service interface for real-time client-server communication.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use tokio::sync::mpsc;
use shared_core::events::GameEvent;
use shared_core::contracts::PlayerAction;
use uuid::Uuid;

/// # Responsibility
/// Manages WebSocket connections for real-time bidirectional communication.
///
/// ---
///
/// This service handles:
/// - Client connection/disconnection lifecycle
/// - Bidirectional message routing (client actions → server, server events → clients)
/// - Connection limits and health monitoring
/// - Binary serialization with bincode for performance
#[async_trait]
pub trait IWebSocketService: Interface {
    /// Starts the WebSocket server and begins accepting connections.
    ///
    /// # Errors
    /// Returns error if server fails to bind to configured port.
    async fn start(&self) -> Result<()>;
    
    /// Broadcasts a game event to all connected clients.
    ///
    /// # Arguments
    /// * `event` - The game event to broadcast
    ///
    /// # Returns
    /// Number of clients that successfully received the message
    async fn broadcast_event(&self, event: GameEvent) -> Result<usize>;
    
    /// Sends a game event to a specific client.
    ///
    /// # Arguments
    /// * `client_id` - UUID of the target client
    /// * `event` - The game event to send
    ///
    /// # Errors
    /// Returns error if client is not connected or send fails
    async fn send_to_client(&self, client_id: Uuid, event: GameEvent) -> Result<()>;
    
    /// Returns the number of currently connected clients.
    fn get_connection_count(&self) -> usize;
    
    /// Disconnects a specific client.
    ///
    /// # Arguments
    /// * `client_id` - UUID of the client to disconnect
    async fn disconnect_client(&self, client_id: Uuid) -> Result<()>;
    
    /// Shuts down the WebSocket server and disconnects all clients.
    async fn shutdown(&self) -> Result<()>;
}

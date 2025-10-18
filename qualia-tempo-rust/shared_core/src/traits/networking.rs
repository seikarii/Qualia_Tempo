//! # Responsibility
//! Defines trait interfaces for networking services.
//!
//! ---
//!
//! These traits define the contracts for WebSocket communication and state streaming.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use uuid::Uuid;
use crate::contracts::CombatState;

/// # Responsibility
/// Manages client connection registry and room assignment.
///
/// ---
///
/// This service maintains an in-memory registry of active connections using
/// lock-free data structures for maximum performance. Handles connection
/// lifecycle, room management, and dead connection cleanup.
#[async_trait]
pub trait IConnectionManagerService: Interface {
    /// Registers a new client connection with optional room assignment
    async fn register_connection(&self, connection_id: Uuid, room_id: Option<String>) -> Result<()>;
    
    /// Unregisters a client connection
    async fn unregister_connection(&self, connection_id: Uuid) -> Result<()>;
    
    /// Gets all connection IDs in a specific room
    async fn get_room_connections(&self, room_id: &str) -> Result<Vec<Uuid>>;
    
    /// Moves a connection to a different room
    async fn move_to_room(&self, connection_id: Uuid, room_id: String) -> Result<()>;
    
    /// Gets the current number of active connections (non-blocking)
    fn active_connection_count(&self) -> usize;
    
    /// Gets the current number of unique rooms (non-blocking)
    fn room_count(&self) -> usize;
    
    /// Cleans up connections that haven't sent heartbeat within threshold
    async fn cleanup_dead_connections(&self) -> Result<usize>;
}

/// # Responsibility
/// Manages WebSocket connections and message broadcasting.
///
/// ---
///
/// This service handles client connections, message routing, and broadcast
/// distribution to all connected clients.
#[async_trait]
pub trait IWebSocketService: Interface {
    /// Broadcasts a message to all connected WebSocket clients
    async fn broadcast(&self, message: String) -> Result<usize>;
    
    /// Gets the current number of connected clients
    fn connection_count(&self) -> usize;
}

/// # Responsibility
/// Streams game state updates to connected clients.
///
/// ---
///
/// This service subscribes to game events and converts them into WebSocket
/// messages for real-time client updates.
#[async_trait]
pub trait IGameStateStreamingService: Interface {
    /// Starts the state streaming loop
    async fn start(&self) -> Result<()>;
    
    /// Stops the state streaming loop
    async fn stop(&self) -> Result<()>;
    
    /// Manually streams a specific combat state (for testing)
    async fn stream_state(&self, state: &CombatState) -> Result<()>;
}

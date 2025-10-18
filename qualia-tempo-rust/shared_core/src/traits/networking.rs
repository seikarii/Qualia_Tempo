//! # Responsibility
//! Defines trait interfaces for networking services.
//!
//! ---
//!
//! These traits define the contracts for WebSocket communication and state streaming.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use crate::contracts::CombatState;

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

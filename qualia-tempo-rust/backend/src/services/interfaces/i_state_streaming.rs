//! # Responsibility
//! State streaming service interface for efficient CombatState broadcasting.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::contracts::CombatState;
use uuid::Uuid;

/// # Responsibility
/// Manages efficient streaming of CombatState to multiple clients.
///
/// ---
///
/// This service provides:
/// - Batching of state updates to reduce network overhead
/// - Optional gzip compression for bandwidth optimization
/// - Delta compression (future enhancement)
/// - Per-client subscription management
#[async_trait]
pub trait IStateStreamingService: Interface {
    /// Starts the state streaming service, subscribing to combat state updates.
    async fn start(&self) -> Result<()>;
    
    /// Broadcasts the current combat state to all subscribed clients.
    ///
    /// # Arguments
    /// * `state` - The combat state to broadcast
    ///
    /// # Returns
    /// Number of clients that successfully received the state
    async fn broadcast_state(&self, state: CombatState) -> Result<usize>;
    
    /// Sends combat state to a specific client.
    ///
    /// # Arguments
    /// * `client_id` - UUID of the target client
    /// * `state` - The combat state to send
    ///
    /// # Errors
    /// Returns error if client is not subscribed or send fails
    async fn send_state_to_client(&self, client_id: Uuid, state: CombatState) -> Result<()>;
    
    /// Subscribes a client to combat state updates.
    ///
    /// # Arguments
    /// * `client_id` - UUID of the client to subscribe
    async fn subscribe_client(&self, client_id: Uuid) -> Result<()>;
    
    /// Unsubscribes a client from combat state updates.
    ///
    /// # Arguments
    /// * `client_id` - UUID of the client to unsubscribe
    async fn unsubscribe_client(&self, client_id: Uuid) -> Result<()>;
    
    /// Returns the number of currently subscribed clients.
    fn get_subscriber_count(&self) -> usize;
    
    /// Enables or disables gzip compression for state broadcasts.
    ///
    /// # Arguments
    /// * `enabled` - Whether to enable compression
    fn set_compression(&self, enabled: bool);
    
    /// Shuts down the state streaming service.
    async fn shutdown(&self) -> Result<()>;
}

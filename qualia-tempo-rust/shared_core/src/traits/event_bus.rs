//! # Responsibility
//! Defines the IEventBus trait for lock-free event distribution.

use shaku::Interface;
use crate::events::GameEvent;

/// # Responsibility
/// Provides lock-free event distribution using tokio::sync::broadcast.
///
/// ---
///
/// Per ARCHITECTURE.RUST v2.0, EventBus MUST use tokio::sync::broadcast
/// for zero-lock event propagation. Services subscribe to receive events
/// and emit to broadcast to all subscribers.
pub trait IEventBus: Interface + Send + Sync {
    /// Emits an event to all subscribers
    ///
    /// Returns Ok(subscriber_count) on success, Err if no active subscribers
    fn emit(&self, event: GameEvent) -> Result<usize, tokio::sync::broadcast::error::SendError<GameEvent>>;
    
    /// Creates a new subscription to receive events
    ///
    /// Each subscriber gets independent event stream with lag detection
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<GameEvent>;
}

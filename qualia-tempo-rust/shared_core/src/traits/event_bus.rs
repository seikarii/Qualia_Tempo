//! # Responsibility
//! Defines the IEventBus trait for event distribution.
//!
//! ---
//!
//! Implemented by EventBusService using tokio::sync::broadcast per QUALIA.CODE.RUST.

use crate::events::GameEvent;
use shaku::Interface;
use tokio::sync::broadcast;

/// # Responsibility
/// Provides event distribution capabilities throughout the application.
///
/// ---
///
/// CRITICAL: Implementation MUST use tokio::sync::broadcast.
/// Manual implementations with Arc<RwLock<Vec<...>>> are PROHIBITED.
pub trait IEventBus: Interface + Send + Sync {
    /// Emit an event to all subscribers
    ///
    /// # Returns
    /// Ok(subscriber_count) on success, Err if no active subscribers
    ///
    /// # Errors
    /// Returns `SendError` if there are no active subscribers
    #[allow(clippy::result_large_err)] // GameEvent is large by design (enum with Vec<f32>)
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;

    /// Subscribe to receive events
    ///
    /// # Returns
    /// A broadcast receiver that will receive all future events
    fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
}

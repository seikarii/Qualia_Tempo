//! # Responsibility
//! Defines the `EventBus` interface for lock-free event distribution.

use crate::events::GameEvent;
use shaku::Interface;
use tokio::sync::broadcast;

/// # Responsibility
/// Provides lock-free event distribution using `tokio::sync::broadcast`.
///
/// ---
///
/// Implemented by `EventBusService` using `tokio::sync::broadcast` channel.
/// This is the ONLY approved `EventBus` implementation pattern (QUALIA.CODE.RUST §4.1).
/// No Arc<`RwLock`<Vec<...>>> patterns allowed.
pub trait IEventBus: Interface + Send + Sync {
    /// Emit an event to all subscribers (fire-and-forget)
    ///
    /// # Errors
    /// Returns `SendError` if no active receivers exist (not a failure condition)
    #[allow(clippy::result_large_err)]
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;

    /// Subscribe to events (returns a receiver for the calling task)
    fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
}

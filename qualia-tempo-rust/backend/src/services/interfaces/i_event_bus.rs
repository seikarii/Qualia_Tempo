//! # Responsibility
//! Defines the `IEventBus` trait interface for lock-free event distribution.
//!
//! ---
//!
//! This is the core communication mechanism between all services. Uses
//! `tokio::sync::broadcast` for zero-lock contention under high load.

use shaku::Interface;
use tokio::sync::broadcast;
use shared_core::events::GameEvent;

/// # Responsibility
/// Manages event distribution to multiple subscribers using broadcast channels.
///
/// ---
///
/// Implemented by `EventBusService` using `tokio::sync::broadcast`. This is the
/// ONLY correct implementation - manual `RwLock` implementations are FORBIDDEN
/// per QUALIA.CODE.RUST §4.2.
pub trait IEventBus: Interface {
    /// Emit an event to all subscribers
    ///
    /// # Returns
    /// - Ok(usize): Number of active receivers that received the event
    /// - Err: No active receivers (not a failure condition)
    ///
    /// # Errors
    /// Returns `SendError` if no active subscribers exist (not a critical failure)
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;

    /// Subscribe to events, receiving a new receiver handle
    ///
    /// # Returns
    /// A `broadcast::Receiver` that can be used to receive events
    fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
}

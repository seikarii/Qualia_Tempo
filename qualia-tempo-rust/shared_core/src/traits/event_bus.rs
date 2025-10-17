//! # Responsibility
//! Defines the IEventBus trait for event distribution.

use shaku::Interface;

/// # Responsibility
/// Provides lock-free event distribution via tokio::sync::broadcast.
///
/// ---
///
/// All services that emit or subscribe to events must use this trait.
/// The implementation MUST use tokio::sync::broadcast (per QUALIA.CODE.RUST §3.1).
pub trait IEventBus<TEvent>: Interface
where
    TEvent: Clone + Send + 'static,
{
    /// Emit an event to all subscribers.
    /// Returns the number of active subscribers.
    fn emit(&self, event: TEvent) -> Result<usize, tokio::sync::broadcast::error::SendError<TEvent>>;
    
    /// Subscribe to events.
    /// Returns a receiver that yields events.
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<TEvent>;
}

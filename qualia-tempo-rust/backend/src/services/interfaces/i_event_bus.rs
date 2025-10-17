//! # Responsibility
//! EventBus trait interface for event distribution.

use shaku::Interface;
use tokio::sync::broadcast;
use shared_core::events::GameEvent;

/// # Responsibility
/// Provides lock-free event distribution using tokio::sync::broadcast.
pub trait IEventBus: Interface {
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;
    fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
}

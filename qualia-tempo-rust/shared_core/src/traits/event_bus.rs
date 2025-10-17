//! # Responsibility
//! Defines the event bus trait interface.

use shaku::Interface;
use anyhow::Result;
use crate::events::game_events::GameEvent;

/// # Responsibility
/// Provides event distribution throughout the application.
///
/// ---
///
/// Implementations MUST use tokio::sync::broadcast for lock-free distribution.
pub trait IEventBus: Interface {
    fn emit(&self, event: GameEvent) -> Result<usize>;
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<GameEvent>;
}

//! # Responsibility
//! Gameplay service trait definitions.

use shaku::Interface;
use anyhow::Result;
use shared_core::contracts::{PlayerAction, QualiaState};

/// # Responsibility
/// Interface for the game logic service.
#[async_trait::async_trait]
pub trait IGameLogicService: Interface {
    /// Process a player action and return the resulting qualia state.
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
}

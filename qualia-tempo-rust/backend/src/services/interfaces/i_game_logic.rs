//! # Responsibility
//! Defines the `IGameLogicService` trait interface for core game logic.
//!
//! ---
//!
//! This service processes player actions, calculates qualia state transitions,
//! validates game rules (combos, life, victory/defeat conditions), and coordinates
//! game state updates.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Interface;
use shared_core::contracts::{CombatState, PlayerAction, QualiaState};

/// # Responsibility
/// Processes player actions and calculates game state updates.
///
/// ---
///
/// This is the authoritative game logic service. It consumes `PlayerAction` events,
/// applies game rules, calculates `QualiaState` changes, and emits state update events.
#[async_trait]
pub trait IGameLogicService: Interface + Send + Sync {
    /// Process a single player action and return the resulting qualia state.
    ///
    /// # Arguments
    /// * `action` - The player action to process
    ///
    /// # Returns
    /// * `Ok(QualiaState)` - The updated qualia state after processing the action
    /// * `Err(anyhow::Error)` - If processing fails
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;

    /// Update the complete combat state based on time delta.
    ///
    /// # Arguments
    /// * `dt` - Delta time in seconds since last update
    ///
    /// # Returns
    /// * `Ok(CombatState)` - The complete updated combat state
    /// * `Err(anyhow::Error)` - If update fails
    async fn update_game_state(&self, dt: f32) -> Result<CombatState>;

    /// Get the current player score.
    ///
    /// # Returns
    /// * Current score value
    fn get_current_score(&self) -> u32;

    /// Check if the player has been defeated.
    ///
    /// # Returns
    /// * `true` if player health <= 0, `false` otherwise
    fn is_player_defeated(&self) -> bool;

    /// Check if the boss has been defeated.
    ///
    /// # Returns
    /// * `true` if boss health <= 0, `false` otherwise
    fn is_boss_defeated(&self) -> bool;
}

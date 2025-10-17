//! # Responsibility
//! Defines the IGameLogicService trait for core game rule processing.
//!
//! ---
//!
//! This interface handles player actions, damage calculation, combo management,
//! and score updates. It's the authoritative source for game state mutations.

use shaku::Interface;
use async_trait::async_trait;
use shared_core::contracts::{PlayerAction, QualiaState, PlayerState, BossState};
use shared_core::events::GameEvent;
use anyhow::Result;

/// # Responsibility
/// Core game logic interface for processing player actions and updating game state.
///
/// ---
///
/// Implementations must:
/// - Process PlayerAction events
/// - Calculate damage, health updates, combo multipliers
/// - Emit QualiaStateUpdated, ComboUpdated, ScoreUpdated events
/// - Enforce game rules (health boundaries, combo caps, etc.)
#[async_trait]
pub trait IGameLogicService: Interface + Send + Sync {
    /// Processes a player action and returns the updated qualia state.
    ///
    /// # Arguments
    /// - `action`: The player action to process
    /// - `current_qualia`: Current qualia state before action
    /// - `current_player`: Current player state
    /// - `current_boss`: Current boss state
    ///
    /// # Returns
    /// Result containing:
    /// - New qualia state after action processing
    /// - Game events to emit (damage, combo, score updates)
    async fn process_action(
        &self,
        action: PlayerAction,
        current_qualia: QualiaState,
        current_player: &PlayerState,
        current_boss: &BossState,
    ) -> Result<(QualiaState, Vec<GameEvent>)>;

    /// Calculates damage dealt to boss based on accuracy and combo.
    ///
    /// # Arguments
    /// - `accuracy`: Hit accuracy (0.0 - 1.0)
    /// - `combo`: Current combo count
    ///
    /// # Returns
    /// Damage value (clamped to [0.0, max_damage])
    fn calculate_damage(&self, accuracy: f32, combo: u32) -> f32;

    /// Updates combo count based on action success.
    ///
    /// # Arguments
    /// - `current_combo`: Current combo count
    /// - `action_success`: Whether action was successful
    /// - `accuracy`: Action accuracy (0.0 - 1.0)
    ///
    /// # Returns
    /// New combo count (0 on failure, incremented on success)
    fn update_combo(&self, current_combo: u32, action_success: bool, accuracy: f32) -> u32;

    /// Calculates score for an action.
    ///
    /// # Arguments
    /// - `base_score`: Base score for action type
    /// - `accuracy`: Action accuracy (0.0 - 1.0)
    /// - `combo`: Current combo multiplier
    ///
    /// # Returns
    /// Final score value
    fn calculate_score(&self, base_score: u32, accuracy: f32, combo: u32) -> u32;

    /// Checks if player is defeated (health <= 0).
    fn is_player_defeated(&self, player: &PlayerState) -> bool;

    /// Checks if boss is defeated (health <= 0).
    fn is_boss_defeated(&self, boss: &BossState) -> bool;
}

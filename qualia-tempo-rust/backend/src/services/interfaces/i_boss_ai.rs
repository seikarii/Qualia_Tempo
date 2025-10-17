//! # Responsibility
//! Defines the IBossAIService trait for boss AI decision-making.
//!
//! ---
//!
//! This interface listens to QualiaStateUpdated events and decides boss attack patterns
//! based on player performance and current game phase.

use shaku::Interface;
use async_trait::async_trait;
use shared_core::contracts::{QualiaState, BossState};
use shared_core::events::GameEvent;
use anyhow::Result;

/// # Responsibility
/// Boss AI interface for reactive attack pattern selection.
///
/// ---
///
/// Implementations must:
/// - React to player qualia state changes
/// - Select appropriate attack patterns based on aggression level
/// - Handle boss phase transitions
/// - Emit BossAction events
#[async_trait]
pub trait IBossAIService: Interface + Send + Sync {
    /// Decides next boss action based on player qualia state.
    ///
    /// # Arguments
    /// - `qualia_state`: Current player qualia state
    /// - `boss_state`: Current boss state
    ///
    /// # Returns
    /// Boss action event to execute
    async fn decide_next_action(
        &self,
        qualia_state: &QualiaState,
        boss_state: &BossState,
    ) -> Result<GameEvent>;

    /// Calculates boss aggression level based on qualia state.
    ///
    /// # Arguments
    /// - `qualia_state`: Current player qualia state
    ///
    /// # Returns
    /// Aggression level (0.0 - 1.0)
    fn calculate_aggression(&self, qualia_state: &QualiaState) -> f32;

    /// Determines if boss should transition to next phase.
    ///
    /// # Arguments
    /// - `boss_state`: Current boss state
    ///
    /// # Returns
    /// True if phase transition should occur
    fn should_transition_phase(&self, boss_state: &BossState) -> bool;

    /// Gets next boss phase.
    ///
    /// # Arguments
    /// - `current_phase`: Current boss phase
    ///
    /// # Returns
    /// Next phase index
    fn get_next_phase(&self, current_phase: u8) -> u8;
}

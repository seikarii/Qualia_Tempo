//! # Responsibility
//! Defines the ICombatOrchestratorService trait for combat coordination.
//!
//! ---
//!
//! This interface orchestrates GameLogic, BossAI, and PatternSystem services
//! to coordinate full combat flow and game phase transitions.

use shaku::Interface;
use async_trait::async_trait;
use shared_core::contracts::{CombatState, PlayerAction};
use shared_core::events::GameEvent;
use anyhow::Result;

/// # Responsibility
/// Combat orchestrator interface for coordinating all combat systems.
///
/// ---
///
/// Implementations must:
/// - Coordinate GameLogic + BossAI + PatternSystem
/// - Detect victory/defeat conditions
/// - Manage game phase transitions
/// - Emit GamePhaseChanged events
/// - Maintain authoritative CombatState
#[async_trait]
pub trait ICombatOrchestratorService: Interface + Send + Sync {
    /// Processes a full combat tick (player action + boss reaction).
    ///
    /// # Arguments
    /// - `action`: Player action to process
    /// - `current_state`: Current combat state
    ///
    /// # Returns
    /// New combat state and events to emit
    async fn process_combat_tick(
        &self,
        action: PlayerAction,
        state: &mut CombatState,
        current_beat: f64,
    ) -> Result<()>;

    /// Checks if victory condition is met.
    ///
    /// # Arguments
    /// - `state`: Current combat state
    ///
    /// # Returns
    /// True if player has won
    fn check_victory(&self, state: &CombatState) -> bool;

    /// Checks if defeat condition is met.
    ///
    /// # Arguments
    /// - `state`: Current combat state
    ///
    /// # Returns
    /// True if player has lost
    fn check_defeat(&self, state: &CombatState) -> bool;

    /// Transitions to next game phase.
    ///
    /// # Arguments
    /// - `current_state`: Current combat state
    ///
    /// # Returns
    /// Updated combat state with new phase
    async fn transition_phase(&self, current_state: CombatState) -> Result<CombatState>;

    /// Initializes new combat session.
    ///
    /// # Returns
    /// Initial combat state
    async fn initialize_combat(&self) -> Result<CombatState>;
}

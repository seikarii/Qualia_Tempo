//! # Responsibility
//! Defines gameplay-related service trait interfaces.
//!
//! ---
//!
//! This module contains traits for core gameplay services: game logic,
//! boss AI, pattern execution, and qualia calculation.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Interface;
use crate::contracts::{
    CombatState, PlayerAction, QualiaState, PatternData, BossState
};

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
    fn get_current_score(&self) -> u32;

    /// Check if the player has been defeated.
    fn is_player_defeated(&self) -> bool;

    /// Check if the boss has been defeated.
    fn is_boss_defeated(&self) -> bool;
}

/// # Responsibility
/// Controls boss AI behavior and decision-making.
///
/// ---
///
/// Subscribes to `QualiaStateUpdated` events and reacts to player performance
/// by selecting attack patterns, adjusting difficulty, and emitting `BossAttack` events.
#[async_trait]
pub trait IBossAIService: Interface + Send + Sync {
    /// Start the boss AI event loop.
    ///
    /// # Returns
    /// * `Ok(())` - AI started successfully
    /// * `Err(anyhow::Error)` - If startup fails
    async fn start(&self) -> Result<()>;

    /// Stop the boss AI event loop.
    ///
    /// # Returns
    /// * `Ok(())` - AI stopped successfully
    /// * `Err(anyhow::Error)` - If shutdown fails
    async fn stop(&self) -> Result<()>;

    /// Manually trigger a boss attack pattern.
    ///
    /// # Arguments
    /// * `pattern_id` - Identifier of the pattern to execute
    ///
    /// # Returns
    /// * `Ok(())` - Pattern triggered successfully
    /// * `Err(anyhow::Error)` - If pattern is invalid or execution fails
    async fn trigger_pattern(&self, pattern_id: &str) -> Result<()>;

    /// Get the current boss state.
    ///
    /// # Returns
    /// * Current `BossState`
    fn get_boss_state(&self) -> BossState;
}

/// # Responsibility
/// Executes boss attack patterns and manages projectile/AOE spawning.
///
/// ---
///
/// Consumes `BossAttack` events emitted by `BossAIService` and translates them
/// into gameplay mechanics (projectile spawns, damage zones, etc.).
#[async_trait]
pub trait IPatternSystemService: Interface + Send + Sync {
    /// Start the pattern system event loop.
    ///
    /// # Returns
    /// * `Ok(())` - Pattern system started successfully
    /// * `Err(anyhow::Error)` - If startup fails
    async fn start(&self) -> Result<()>;

    /// Stop the pattern system event loop.
    ///
    /// # Returns
    /// * `Ok(())` - Pattern system stopped successfully
    /// * `Err(anyhow::Error)` - If shutdown fails
    async fn stop(&self) -> Result<()>;

    /// Execute a specific attack pattern immediately.
    ///
    /// # Arguments
    /// * `pattern` - The pattern data to execute
    ///
    /// # Returns
    /// * `Ok(())` - Pattern executed successfully
    /// * `Err(anyhow::Error)` - If execution fails
    async fn execute_pattern(&self, pattern: &PatternData) -> Result<()>;

    /// Load attack patterns from configuration.
    ///
    /// # Arguments
    /// * `patterns` - Vector of pattern data to load
    ///
    /// # Returns
    /// * `Ok(())` - Patterns loaded successfully
    /// * `Err(anyhow::Error)` - If loading fails
    async fn load_patterns(&self, patterns: Vec<PatternData>) -> Result<()>;
}

/// # Responsibility
/// Calculates `QualiaState` from `PlayerAction` with accuracy and timing analysis.
///
/// ---
///
/// This service encapsulates the core qualia calculation logic, applying
/// modifiers for combos, accuracy, timing, and other gameplay factors.
#[async_trait]
pub trait IQualiaProcessorService: Interface + Send + Sync {
    /// Calculate qualia state from a player action.
    ///
    /// # Arguments
    /// * `action` - The player action to analyze
    /// * `previous_state` - The previous qualia state (for decay/momentum)
    ///
    /// # Returns
    /// * `Ok(QualiaState)` - The calculated qualia state
    /// * `Err(anyhow::Error)` - If calculation fails
    async fn calculate_qualia(
        &self,
        action: &PlayerAction,
        previous_state: &QualiaState,
    ) -> Result<QualiaState>;

    /// Apply decay to qualia state over time.
    ///
    /// # Arguments
    /// * `state` - Current qualia state
    /// * `dt` - Delta time in seconds
    ///
    /// # Returns
    /// * Decayed qualia state
    fn apply_decay(&self, state: &QualiaState, dt: f32) -> QualiaState;

    /// Calculate combo multiplier from current combo count.
    ///
    /// # Arguments
    /// * `combo` - Current combo count
    ///
    /// # Returns
    /// * Combo multiplier (1.0 = no bonus, > 1.0 = bonus)
    fn get_combo_multiplier(&self, combo: u32) -> f32;
}

/// # Responsibility
/// Coordinates all combat-related services to produce unified `CombatState`.
///
/// ---
///
/// This service aggregates outputs from `GameLogicService`, `BossAIService`,
/// and `PatternSystemService` into a single authoritative `CombatState` that
/// is streamed to clients. It ensures all subsystems remain synchronized.
#[async_trait]
pub trait ICombatOrchestratorService: Interface + Send + Sync {
    /// Start the combat orchestrator and all managed subsystems.
    ///
    /// # Returns
    /// * `Ok(())` - All subsystems started successfully
    /// * `Err(anyhow::Error)` - If any subsystem fails to start
    async fn start(&self) -> Result<()>;

    /// Stop the combat orchestrator and all managed subsystems.
    ///
    /// # Returns
    /// * `Ok(())` - All subsystems stopped successfully
    /// * `Err(anyhow::Error)` - If any subsystem fails to stop
    async fn stop(&self) -> Result<()>;

    /// Get the current aggregated combat state.
    ///
    /// # Returns
    /// * `Ok(CombatState)` - The complete combat state snapshot
    /// * `Err(anyhow::Error)` - If state cannot be retrieved
    async fn get_current_state(&self) -> Result<CombatState>;

    /// Update the combat state with time delta.
    ///
    /// # Arguments
    /// * `dt` - Delta time in seconds since last update
    ///
    /// # Returns
    /// * `Ok(CombatState)` - The updated combat state
    /// * `Err(anyhow::Error)` - If update fails
    async fn update(&self, dt: f32) -> Result<CombatState>;
}

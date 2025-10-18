//! # Responsibility
//! Defines all gameplay-related service interfaces.
//!
//! ---
//!
//! These traits define the contracts for gameplay services in the backend.
//! All implementations must follow Shaku DI patterns.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Interface;

use crate::contracts::{
    BossState, CombatState, PlayerAction, QualiaState, PatternData, HarmonyMap,
};

/// # Responsibility
/// Validates and processes player actions, orchestrates musical combat.
///
/// ---
///
/// ARCHITECTURAL NOTE: This service VALIDATES QualiaState from frontend,
/// it does NOT calculate it. Real-time calculation happens in frontend Web Worker.
#[async_trait]
pub trait IGameLogicService: Interface + Send + Sync {
    /// Processes a player action and validates the associated qualia state.
    ///
    /// # Arguments
    /// * `action` - The player action to process
    /// * `frontend_qualia` - QualiaState calculated by frontend (requires validation)
    ///
    /// # Returns
    /// Validated and consolidated QualiaState
    async fn process_action(
        &self,
        action: PlayerAction,
        frontend_qualia: QualiaState,
    ) -> Result<QualiaState>;

    /// Updates the game state based on elapsed time.
    async fn update_game_state(&self, dt: f32) -> Result<CombatState>;

    /// Returns the current player score.
    fn get_current_score(&self) -> u32;
}

/// # Responsibility
/// Validates QualiaState received from frontend for anti-cheat.
///
/// ---
///
/// Applies heuristic validation to detect impossible values and temporal inconsistencies.
#[async_trait]
pub trait IQualiaValidator: Interface + Send + Sync {
    /// Validates a qualia state against the player action that generated it.
    ///
    /// # Arguments
    /// * `state` - QualiaState from frontend
    /// * `action` - Player action that triggered the state
    ///
    /// # Returns
    /// Validated state (may be penalized if cheating detected)
    async fn validate(&self, state: QualiaState, action: PlayerAction) -> Result<QualiaState>;

    /// Checks if state values are within physically possible bounds.
    fn is_valid_range(&self, state: &QualiaState) -> bool;

    /// Checks temporal coherence (no impossible jumps between frames).
    fn is_temporally_consistent(&self, prev: &QualiaState, current: &QualiaState, dt: f32) -> bool;
}

/// # Responsibility
/// Implements boss AI behavior based on player qualia state.
///
/// ---
///
/// Subscribes to QualiaStateValidated events and reacts with attack patterns.
#[async_trait]
pub trait IBossAIService: Interface + Send + Sync {
    /// Starts the boss AI loop (subscribes to events).
    async fn start(&self) -> Result<()>;

    /// Stops the boss AI loop.
    async fn stop(&self) -> Result<()>;

    /// Selects next attack pattern based on current qualia state.
    fn select_pattern(&self, qualia: &QualiaState, boss_state: &BossState) -> String;

    /// Updates boss state based on time and player actions.
    async fn update(&self, dt: f32, qualia: &QualiaState) -> Result<BossState>;
}

/// # Responsibility
/// Executes boss attack patterns and spawns projectiles/zones.
///
/// ---
///
/// Manages the lifecycle of active patterns and their telegraphs.
#[async_trait]
pub trait IPatternSystemService: Interface + Send + Sync {
    /// Executes a named attack pattern.
    ///
    /// # Arguments
    /// * `pattern_id` - Identifier of the pattern to execute
    /// * `boss_position` - Current boss position for spawn calculations
    async fn execute_pattern(&self, pattern_id: &str, boss_position: (f32, f32)) -> Result<()>;

    /// Updates all active patterns.
    async fn update(&self, dt: f32) -> Result<()>;

    /// Loads pattern definitions from data.
    ///
    /// # Errors
    /// Returns error if pattern data is invalid or malformed.
    async fn load_patterns(&self, patterns: Vec<PatternData>) -> Result<()>;
}

/// # Responsibility
/// Manages musical harmony analysis for combat (MUSIC.RUST.md §2).
///
/// ---
///
/// Provides harmony context for generative music generation.
/// All methods are async to support event-driven architecture.
#[async_trait]
pub trait IHarmonyAnalysis: Interface + Send + Sync {
    /// Analyzes a song and generates its harmony map.
    ///
    /// # Errors
    /// Returns error if audio data is invalid or analysis fails.
    async fn analyze_song(&self, audio_data: &[f32], sample_rate: u32) -> Result<HarmonyMap>;

    /// Returns the current chord at a given timestamp.
    ///
    /// # Errors
    /// Returns error if timestamp is out of range or no harmony data available.
    async fn get_current_chord_at_time(&self, timestamp_ms: f64) -> Result<ChordProgression>;

    /// Returns the current key signature.
    ///
    /// # Errors
    /// Returns error if no harmony analysis has been performed yet.
    async fn get_current_key(&self) -> Result<String>;
}

/// # Responsibility
/// Validates player actions against musical harmony (MUSIC.RUST.md §4).
///
/// ---
///
/// Determines if player input creates harmonic or chaotic effects.
#[async_trait]
pub trait IMusicalCoherenceService: Interface + Send + Sync {
    /// Scores a player action based on current harmonic context.
    ///
    /// # Returns
    /// * `f32` - Coherence score: 1.0 = perfect harmony, 0.0 = chaos, -1.0 = dissonance
    ///
    /// # Errors
    /// Returns error if harmony context is unavailable.
    async fn score_action_coherence(
        &self,
        action: PlayerAction,
        timestamp_ms: f64,
    ) -> Result<f32>;
}

/// # Responsibility
/// Orchestrates generative note events based on gameplay state (MUSIC.RUST.md §4).
///
/// ---
///
/// Emits PlayGenerativeNote events to the EventBus for frontend audio synthesis.
#[async_trait]
pub trait IGenerativeNoteOrchestratorService: Interface + Send + Sync {
    /// Emits a note event based on player action.
    ///
    /// # Errors
    /// Returns error if note emission fails.
    async fn emit_note_for_action(&self, action: PlayerAction, qualia_state: QualiaState) -> Result<()>;

    /// Updates the orchestrator state (e.g., fades out layers).
    async fn update(&self, dt: f32) -> Result<()>;
}

/// # Responsibility
/// Temporary stub for ChordProgression until audio contracts are fully implemented.
#[derive(Debug, Clone)]
pub struct ChordProgression {
    pub root_note: String,
    pub chord_type: String,
    pub scale_degrees: Vec<i32>,
}

/// # Responsibility
/// Coordinates all gameplay services into a unified combat state.
///
/// ---
///
/// Aggregates state from GameLogic, BossAI, and PatternSystem.
#[async_trait]
pub trait ICombatOrchestrator: Interface + Send + Sync {
    /// Returns the current aggregated combat state.
    async fn get_combat_state(&self) -> Result<CombatState>;

    /// Starts the combat session.
    async fn start_combat(&self) -> Result<()>;

    /// Ends the combat session.
    async fn end_combat(&self) -> Result<()>;

    /// Updates the combat state based on elapsed time.
    async fn update(&self, dt: f32) -> Result<()>;
}

//! # Responsibility
//! Trait interfaces for gameplay services.

use async_trait::async_trait;
use shaku::Interface;
use anyhow::Result;
use shared_core::contracts::{PlayerAction, QualiaState};

/// # Responsibility
/// Interface for the core game logic orchestration service.
///
/// ---
///
/// Processes player actions, calculates qualia state, and coordinates game flow.
#[async_trait]
pub trait IGameLogicService: Interface {
    /// Process a player action and return the new qualia state.
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
}

/// # Responsibility
/// Represents boss AI phases aligned with song progression.
///
/// ---
///
/// Per GDD.md: Boss phases transition based on song progress percentage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BossPhase {
    /// 0-15% song progress: Gentle introduction, long telegraphs
    Intro,
    /// 15-50% song progress: Normal difficulty
    Standard,
    /// 50-85% song progress: Increased aggression, shorter telegraphs
    Intensified,
    /// 85-100% song progress: Maximum intensity, minimal telegraphs
    Final,
}

/// # Responsibility
/// Interface for boss AI behavior and phase management.
///
/// ---
///
/// Controls boss difficulty scaling based on song progress and player performance.
/// Per GDD.md: Boss attacks synchronize to music with dynamic telegraph durations.
#[async_trait]
pub trait IBossAI: Interface {
    /// Update boss AI state based on song progress and qualia state.
    /// Returns true if phase changed.
    async fn update(&self, song_progress: f32, qualia: QualiaState) -> Result<bool>;
    
    /// Get current boss phase.
    fn current_phase(&self) -> BossPhase;
    
    /// Calculate current aggression level (0.0-1.0) based on phase and player combo.
    fn current_aggression(&self) -> f32;
    
    /// Calculate telegraph duration in milliseconds for current phase/aggression.
    fn calculate_telegraph_duration(&self) -> u64;
}

/// # Responsibility
/// Represents a detected combo pattern with timing and context.
///
/// ---
///
/// Contains the matched pattern ID, keys pressed, and timing information
/// for validation and effect triggering.
#[derive(Debug, Clone, PartialEq)]
pub struct DetectedCombo {
    /// ID of the matched combo pattern (e.g., "vortex", "attractor")
    pub pattern_id: String,
    /// Keys that were pressed to trigger this combo
    pub keys: Vec<char>,
    /// Timestamp when combo was completed (ms)
    pub timestamp: u64,
    /// Whether this combo is beneficial (true) or malicious (false)
    pub is_beneficial: bool,
    /// Calculated harmonic score (0.0-1.0) at time of detection
    pub harmonic_score: f32,
}

/// # Responsibility
/// Represents an input event for pattern recognition.
///
/// ---
///
/// Captures key presses with timestamps for combo detection.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InputEvent {
    /// Key pressed (Q, E, R, T, F, G, C)
    pub key: char,
    /// Timestamp when key was pressed (ms)
    pub timestamp: u64,
}

/// # Responsibility
/// Interface for pattern recognition and combo detection system.
///
/// ---
///
/// Detects musical combos from player input sequences, analyzes harmonic
/// context, and determines beneficial vs malicious combo effects per GDD.md §3.4.
#[async_trait]
pub trait IPatternSystem: Interface {
    /// Register a new input event for pattern matching.
    /// Returns detected combo if pattern was completed.
    async fn register_input(&self, event: InputEvent) -> Result<Option<DetectedCombo>>;
    
    /// Calculate current harmonic score based on qualia state and musical context.
    /// Returns value in range [0.0, 1.0] where higher is more harmonic.
    fn calculate_harmonic_score(&self, qualia: QualiaState) -> f32;
    
    /// Clear input history (e.g., on combo completion or timeout).
    async fn clear_input_buffer(&self) -> Result<()>;
    
    /// Get current input buffer for debugging/telemetry.
    fn get_input_buffer(&self) -> Vec<InputEvent>;
}

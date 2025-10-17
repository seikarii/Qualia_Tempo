//! # Responsibility
//! Defines the IPatternSystemService trait for boss attack pattern management.
//!
//! ---
//!
//! This interface loads, validates, and executes boss attack patterns from combat data files.

use shaku::Interface;
use async_trait::async_trait;
use shared_core::contracts::PatternData;
use anyhow::Result;

/// # Responsibility
/// Pattern system interface for boss attack choreography.
///
/// ---
///
/// Implementations must:
/// - Load patterns from combat_data/*.json files
/// - Validate pattern timing and structure
/// - Execute patterns with beat synchronization
/// - Handle pattern chaining and randomization
#[async_trait]
pub trait IPatternSystemService: Interface + Send + Sync {
    /// Loads a pattern by ID from combat data.
    ///
    /// # Arguments
    /// - `pattern_id`: Unique pattern identifier
    ///
    /// # Returns
    /// Pattern data structure
    async fn load_pattern(&self, pattern_id: &str) -> Result<PatternData>;

    /// Validates pattern timing against song BPM.
    ///
    /// # Arguments
    /// - `pattern`: Pattern to validate
    /// - `song_bpm`: Song tempo in beats per minute
    ///
    /// # Returns
    /// True if pattern timing is valid
    fn validate_pattern_timing(&self, pattern: &PatternData, song_bpm: f32) -> bool;

    /// Executes a pattern and emits attack events.
    ///
    /// # Arguments
    /// - `pattern`: Pattern to execute
    /// - `current_beat`: Current beat in song
    ///
    /// # Returns
    /// Vector of attack events to emit
    async fn execute_pattern(&self, pattern: &PatternData, current_beat: f64) -> Result<Vec<shared_core::events::GameEvent>>;

    /// Gets random pattern for current boss phase.
    ///
    /// # Arguments
    /// - `phase`: Current boss phase
    ///
    /// # Returns
    /// Random pattern ID for phase
    fn get_random_pattern_for_phase(&self, phase: u8) -> String;
}

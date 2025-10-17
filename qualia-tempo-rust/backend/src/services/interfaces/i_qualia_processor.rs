//! # Responsibility
//! Defines the IQualiaProcessorService trait for qualia state calculation.
//!
//! ---
//!
//! This interface calculates qualia dimensions (intensity, harmony, chaos, kairos, transcendence)
//! from player actions with accuracy-based modulation.

use shaku::Interface;
use async_trait::async_trait;
use shared_core::contracts::{PlayerAction, QualiaState};
use anyhow::Result;

/// # Responsibility
/// Qualia processor interface for state calculation from player input.
///
/// ---
///
/// Implementations must:
/// - Calculate intensity/harmony/chaos/kairos/transcendence from actions
/// - Apply decay rates over time
/// - Clamp values to [0.0, 1.0] range
/// - Prevent NaN/Inf from invalid input
#[async_trait]
pub trait IQualiaProcessorService: Interface + Send + Sync {
    /// Processes player action into qualia state update.
    ///
    /// # Arguments
    /// - `action`: Player action to process
    /// - `previous_state`: Previous qualia state
    /// - `delta_time`: Time since last update (seconds)
    ///
    /// # Returns
    /// New qualia state after action processing
    async fn process_action(
        &self,
        action: &PlayerAction,
        previous_state: &QualiaState,
        delta_time: f32,
    ) -> Result<QualiaState>;

    /// Applies decay to qualia state over time.
    ///
    /// # Arguments
    /// - `state`: Current qualia state
    /// - `delta_time`: Time elapsed (seconds)
    ///
    /// # Returns
    /// Decayed qualia state
    fn apply_decay(&self, state: &QualiaState, delta_time: f32) -> QualiaState;

    /// Calculates intensity from action type and accuracy.
    ///
    /// # Arguments
    /// - `action`: Player action
    /// - `accuracy`: Action accuracy (0.0 - 1.0)
    ///
    /// # Returns
    /// Intensity contribution (0.0 - 1.0)
    fn calculate_intensity(&self, action: &PlayerAction, accuracy: f32) -> f32;

    /// Calculates harmony from note sequences.
    ///
    /// # Arguments
    /// - `recent_notes`: Recent note sequence
    ///
    /// # Returns
    /// Harmony score (0.0 - 1.0)
    fn calculate_harmony(&self, recent_notes: &[char]) -> f32;

    /// Calculates chaos from timing variance.
    ///
    /// # Arguments
    /// - `timing_variance`: Variance from beat timing
    ///
    /// # Returns
    /// Chaos score (0.0 - 1.0)
    fn calculate_chaos(&self, timing_variance: f32) -> f32;
}

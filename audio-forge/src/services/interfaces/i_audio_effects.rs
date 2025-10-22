//! # Responsibility
//! Trait definition for real-time audio effects processing.

use crate::contracts::effect_parameters::EffectConfig;
use anyhow::Result;
use shaku::Interface;

/// # Responsibility
/// Real-time audio effects: 8D, drop, bass/treble boost.
///
/// ---
///
/// Applies DSP effects to stereo audio samples in-place.
/// All methods modify the provided sample buffer directly.
pub trait IAudioEffects: Interface {
    /// # Responsibility
    /// Apply 8D audio effect (circular panning).
    ///
    /// ---
    ///
    /// Modulates left/right channels based on rotation phase.
    /// Requires elapsed time for rotation calculation.
    fn apply_8d_effect(
        &self,
        samples: &mut [f32],
        sample_rate: u32,
        elapsed_time: f32,
    ) -> Result<()>;

    /// # Responsibility
    /// Apply drop effect (volume reduction).
    ///
    /// ---
    ///
    /// Reduces amplitude of all samples by drop amount.
    fn apply_drop_effect(&self, samples: &mut [f32]) -> Result<()>;

    /// # Responsibility
    /// Apply bass boost to low frequencies (DIRECTIVE 11: sample_rate parameter added).
    ///
    /// ---
    ///
    /// Uses biquad LowShelf filter @ 250Hz. Requires sample_rate for accurate
    /// coefficient calculation. Gain is applied via dB conversion.
    fn apply_bass_boost(&self, samples: &mut [f32], sample_rate: u32) -> Result<()>;

    /// # Responsibility
    /// Apply treble boost to high frequencies (DIRECTIVE 11: sample_rate parameter added).
    ///
    /// ---
    ///
    /// Uses biquad HighShelf filter @ 3kHz. Requires sample_rate for accurate
    /// coefficient calculation. Gain is applied via dB conversion.
    fn apply_treble_boost(&self, samples: &mut [f32], sample_rate: u32) -> Result<()>;

    /// # Responsibility
    /// Get current effect configuration.
    fn get_config(&self) -> EffectConfig;

    /// # Responsibility
    /// Update effect configuration (thread-safe).
    fn set_config(&self, config: EffectConfig);
}

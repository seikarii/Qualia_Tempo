//! # Responsibility
//! Trait definition for real-time audio effects processing.

use crate::contracts::effect_parameters::EffectConfig;
use crate::errors::AudioEffectsError;
use shaku::Interface;

/// # Responsibility
/// Real-time audio effects: drop, bass/treble boost.
///
/// ---
///
/// Applies DSP effects to stereo audio samples in-place.
/// All methods modify the provided sample buffer directly.
pub trait IAudioEffects: Interface {
    /// # Responsibility
    /// Apply professional EDM-style drop effect with multiband processing.
    ///
    /// ---
    ///
    /// Uses Linkwitz-Riley crossover to separate into 3 bands:
    /// - Sub-bass (20-80Hz): Boosted
    /// - Bass (80-250Hz): Saturated
    /// - Mid-highs (250Hz+): Attenuated by drop_amount
    ///
    /// **FIXED**: Now accepts sample_rate parameter for accurate filter coefficients.
    fn apply_drop_effect(&self, samples: &mut [f32], sample_rate: u32) -> Result<(), AudioEffectsError>;

    /// # Responsibility
    /// Apply bass boost to low frequencies (DIRECTIVE 11: sample_rate parameter added).
    ///
    /// ---
    ///
    /// Uses biquad LowShelf filter @ 250Hz. Requires sample_rate for accurate
    /// coefficient calculation. Gain is applied via dB conversion.
    fn apply_bass_boost(&self, samples: &mut [f32], sample_rate: u32) -> Result<(), AudioEffectsError>;

    /// # Responsibility
    /// Apply treble boost to high frequencies (DIRECTIVE 11: sample_rate parameter added).
    ///
    /// ---
    ///
    /// Uses biquad HighShelf filter @ 3kHz. Requires sample_rate for accurate
    /// coefficient calculation. Gain is applied via dB conversion.
    fn apply_treble_boost(&self, samples: &mut [f32], sample_rate: u32) -> Result<(), AudioEffectsError>;

    /// # Responsibility
    /// Get current effect configuration.
    fn get_config(&self) -> EffectConfig;

    /// # Responsibility
    /// Update effect configuration (thread-safe).
    fn set_config(&self, config: EffectConfig);
}

//! # Responsibility
//! Configuration data structures for audio effects.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for all audio effects.
///
/// ---
///
/// Controls enable/disable state and parameters for each effect.
/// All effects are disabled by default.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectConfig {
    /// Enable 8D audio effect
    pub effect_8d_enabled: bool,
    /// 8D rotation speed in Hz (rotations per second)
    pub effect_8d_rotation_hz: f32,
    /// 8D effect intensity [0.0, 1.0]
    pub effect_8d_intensity: f32,

    /// Enable drop effect
    pub drop_effect_enabled: bool,
    /// Drop amount [0.0, 1.0] where 1.0 = complete silence
    pub drop_amount: f32,

    /// Enable bass boost
    pub bass_boost_enabled: bool,
    /// Bass boost gain multiplier [1.0, 3.0]
    pub bass_boost_gain: f32,

    /// Enable treble boost
    pub treble_boost_enabled: bool,
    /// Treble boost gain multiplier [1.0, 3.0]
    pub treble_boost_gain: f32,

    /// Enable pitch shifting (Hz changer)
    pub pitch_shift_enabled: bool,
    /// Target reference frequency in Hz (default 440, alternatives: 432, 528)
    pub reference_frequency: f32,
}

impl Default for EffectConfig {
    fn default() -> Self {
        Self {
            effect_8d_enabled: false,
            effect_8d_rotation_hz: 0.25, // 4-second rotation
            effect_8d_intensity: 0.8,

            drop_effect_enabled: false,
            drop_amount: 0.5,

            bass_boost_enabled: false,
            bass_boost_gain: 1.5,

            treble_boost_enabled: false,
            treble_boost_gain: 1.5,

            pitch_shift_enabled: false,
            reference_frequency: 440.0, // Standard A4 tuning
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_effect_config_default() {
        let config = EffectConfig::default();
        assert!(!config.effect_8d_enabled);
        assert!(!config.drop_effect_enabled);
        assert!(!config.bass_boost_enabled);
        assert!(!config.treble_boost_enabled);
    }

    #[test]
    fn test_effect_config_serialization() {
        let config = EffectConfig::default();
        let yaml = serde_yaml::to_string(&config).unwrap();
        assert!(yaml.contains("effect_8d_enabled"));

        let deserialized: EffectConfig = serde_yaml::from_str(&yaml).unwrap();
        assert_eq!(
            config.effect_8d_rotation_hz,
            deserialized.effect_8d_rotation_hz
        );
    }

    #[test]
    fn test_effect_config_clamp_ranges() {
        let config = EffectConfig {
            effect_8d_intensity: 1.2, // Should be clamped by service
            bass_boost_gain: 5.0,     // Should be clamped by service
            ..Default::default()
        };

        // Service layer will clamp, but config allows any values
        assert!(config.effect_8d_intensity > 1.0);
        assert!(config.bass_boost_gain > 3.0);
    }
}

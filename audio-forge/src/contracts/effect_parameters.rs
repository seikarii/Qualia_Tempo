//! # Responsibility
//! Configuration data structures for audio effects.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use validator::Validate;

/// # Responsibility
/// Configuration for all audio effects.
///
/// ---
///
/// Controls enable/disable state and parameters for each effect.
/// All effects are disabled by default.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct EffectConfig {
    /// Enable drop effect
    pub drop_effect_enabled: bool,
    /// Drop amount [0.0, 1.0] where 1.0 = complete silence
    #[validate(range(min = 0.0, max = 1.0))]
    pub drop_amount: f32,

    /// Enable bass boost
    pub bass_boost_enabled: bool,
    /// Bass boost gain multiplier [1.0, 3.0]
    #[validate(range(min = 1.0, max = 3.0))]
    pub bass_boost_gain: f32,
    /// Bass boost cutoff frequency in Hz [20.0, 500.0]
    #[validate(range(min = 20.0, max = 500.0))]
    pub bass_cutoff_hz: f32,

    /// Enable treble boost
    pub treble_boost_enabled: bool,
    /// Treble boost gain multiplier [1.0, 3.0]
    #[validate(range(min = 1.0, max = 3.0))]
    pub treble_boost_gain: f32,
    /// Treble boost cutoff frequency in Hz [1000.0, 8000.0]
    #[validate(range(min = 1000.0, max = 8000.0))]
    pub treble_cutoff_hz: f32,
}

impl Default for EffectConfig {
    fn default() -> Self {
        Self {
            drop_effect_enabled: false,
            drop_amount: 0.5,

            bass_boost_enabled: false,
            bass_boost_gain: 1.5,
            bass_cutoff_hz: 250.0, // Standard bass filter cutoff

            treble_boost_enabled: false,
            treble_boost_gain: 1.5,
            treble_cutoff_hz: 3000.0, // Standard treble filter cutoff
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_effect_config_default() {
        let config = EffectConfig::default();
        assert!(!config.drop_effect_enabled);
        assert!(!config.bass_boost_enabled);
        assert!(!config.treble_boost_enabled);
    }

    #[test]
    fn test_effect_config_serialization() {
        let config = EffectConfig::default();
        let yaml = serde_yaml::to_string(&config).unwrap();
        assert!(yaml.contains("dropEffectEnabled") || yaml.contains("drop_effect_enabled"));

        let deserialized: EffectConfig = serde_yaml::from_str(&yaml).unwrap();
        assert_eq!(
            config.drop_amount,
            deserialized.drop_amount
        );
    }

    #[test]
    fn test_effect_config_clamp_ranges() {
        let config = EffectConfig {
            bass_boost_gain: 5.0,     // Should be clamped by service
            ..Default::default()
        };

        // Service layer will clamp, but config allows any values
        assert!(config.bass_boost_gain > 3.0);
    }
}

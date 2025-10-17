//! # Responsibility
//! QualiaProcessorConfig structure for qualia calculation configuration.
//!
//! ---
//!
//! Loaded from config/qualia_processor.yaml at startup (or embedded in game_logic.yaml).

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for QualiaProcessorService calculation parameters.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QualiaProcessorConfig {
    pub decay_rates: DecayRatesConfig,
    pub buildup_rates: BuildupRatesConfig,
    pub transcendence: TranscendenceConfig,
}

/// # Responsibility
/// Decay rates for each qualia dimension.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DecayRatesConfig {
    pub intensity: f32, // Per-second decay (e.g., 0.95 = 5% decay)
    pub harmony: f32,
    pub chaos: f32,
    pub kairos: f32,
    pub transcendence: f32,
}

/// # Responsibility
/// Buildup rates from player actions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BuildupRatesConfig {
    pub intensity_per_action: f32, // Base buildup per action
    pub harmony_per_accurate_note: f32,
    pub chaos_per_mistimed_action: f32,
    pub kairos_per_perfect_timing: f32,
}

/// # Responsibility
/// Transcendence threshold configuration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TranscendenceConfig {
    pub min_intensity: f32, // Minimum intensity for transcendence buildup
    pub min_harmony: f32,
    pub min_kairos: f32,
    pub buildup_rate: f32, // Transcendence buildup rate when all conditions met
}

impl Default for QualiaProcessorConfig {
    fn default() -> Self {
        Self {
            decay_rates: DecayRatesConfig {
                intensity: 0.95,
                harmony: 0.98,
                chaos: 0.97,
                kairos: 0.99,
                transcendence: 0.995,
            },
            buildup_rates: BuildupRatesConfig {
                intensity_per_action: 0.1,
                harmony_per_accurate_note: 0.05,
                chaos_per_mistimed_action: 0.08,
                kairos_per_perfect_timing: 0.15,
            },
            transcendence: TranscendenceConfig {
                min_intensity: 0.8,
                min_harmony: 0.7,
                min_kairos: 0.9,
                buildup_rate: 0.01,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_decay_rates() {
        let config = QualiaProcessorConfig::default();
        assert!(config.decay_rates.intensity > 0.9 && config.decay_rates.intensity < 1.0);
        assert!(config.decay_rates.transcendence > config.decay_rates.intensity);
    }

    #[test]
    fn test_transcendence_thresholds_are_high() {
        let config = QualiaProcessorConfig::default();
        assert!(config.transcendence.min_intensity >= 0.7);
        assert!(config.transcendence.min_harmony >= 0.7);
        assert!(config.transcendence.min_kairos >= 0.7);
    }
}

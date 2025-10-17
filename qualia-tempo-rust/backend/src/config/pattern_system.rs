//! # Responsibility
//! Configuration for the pattern recognition system.
//!
//! ---
//!
//! Defines combo patterns, timing windows, and harmonic thresholds
//! for the emergent musical combo system per GDD.md §3.4 and §3.7.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents a single combo pattern definition.
///
/// ---
///
/// Each pattern maps a sequence of keys to a combo type (beneficial or malicious).
/// The effect is determined by harmonic context at runtime.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ComboPattern {
    /// Unique identifier for the combo (e.g., "vortex", "attractor")
    pub id: String,
    /// Sequence of keys that trigger this combo (e.g., ['Q', 'E', 'R'])
    pub keys: Vec<char>,
    /// Whether this is a beneficial (harmonic) or malicious (chaotic) combo
    pub is_beneficial: bool,
    /// Human-readable name for the combo effect
    pub effect_name: String,
}

/// # Responsibility
/// Configuration for the pattern recognition system.
///
/// ---
///
/// Loaded from YAML at startup. Defines all recognized combo patterns,
/// timing windows for input sequences, and harmonic analysis thresholds.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternSystemConfig {
    /// Maximum time window (ms) between inputs to be considered part of same combo
    pub input_window_ms: u64,
    
    /// Minimum harmonic score (0.0-1.0) required for beneficial combos
    pub harmonic_threshold: f32,
    
    /// Maximum harmonic score (0.0-1.0) allowed for malicious combos
    pub chaos_threshold: f32,
    
    /// All recognized combo patterns
    pub patterns: Vec<ComboPattern>,
}

impl Default for PatternSystemConfig {
    fn default() -> Self {
        Self {
            input_window_ms: 1000, // 1 second window for combo inputs
            harmonic_threshold: 0.6, // 60% harmony for beneficial combos
            chaos_threshold: 0.4, // Below 40% harmony triggers malicious combos
            patterns: Self::default_patterns(),
        }
    }
}

impl PatternSystemConfig {
    /// # Responsibility
    /// Creates default combo patterns from GDD.md §3.7.
    ///
    /// ---
    ///
    /// Defines all 11 base combos (6 beneficial + 5 malicious).
    fn default_patterns() -> Vec<ComboPattern> {
        vec![
            // Beneficial Combos (Harmonic)
            ComboPattern {
                id: "vortex".to_string(),
                keys: vec!['Q', 'E', 'R'],
                is_beneficial: true,
                effect_name: "Vortex (Area Control)".to_string(),
            },
            ComboPattern {
                id: "attractor".to_string(),
                keys: vec!['Q', 'R', 'F'],
                is_beneficial: true,
                effect_name: "Attractor (Massive Collection)".to_string(),
            },
            ComboPattern {
                id: "repulsor".to_string(),
                keys: vec!['T', 'E', 'R'],
                is_beneficial: true,
                effect_name: "Repulsor (Defense)".to_string(),
            },
            ComboPattern {
                id: "multiplier".to_string(),
                keys: vec!['Q', 'E', 'T'],
                is_beneficial: true,
                effect_name: "Combo Multiplier (+50%)".to_string(),
            },
            ComboPattern {
                id: "healing".to_string(),
                keys: vec!['F', 'G', 'C'],
                is_beneficial: true,
                effect_name: "Healing (Gradual Restore)".to_string(),
            },
            ComboPattern {
                id: "complete_scale".to_string(),
                keys: vec!['Q', 'E', 'R', 'T', 'F', 'G', 'C'],
                is_beneficial: true,
                effect_name: "Complete Scale (Full Heal + Shield)".to_string(),
            },
            // Malicious Combos (Chaotic)
            ComboPattern {
                id: "sound_wall".to_string(),
                keys: vec!['Q', 'T', 'G'],
                is_beneficial: false,
                effect_name: "Sound Wall (Movement Block)".to_string(),
            },
            ComboPattern {
                id: "damage_zone".to_string(),
                keys: vec!['E', 'F', 'C'],
                is_beneficial: false,
                effect_name: "Damage Zone (DoT Area)".to_string(),
            },
            ComboPattern {
                id: "inverse_repulsor".to_string(),
                keys: vec!['R', 'G', 'T'],
                is_beneficial: false,
                effect_name: "Inverse Repulsor (Push Toward Boss)".to_string(),
            },
            ComboPattern {
                id: "hostile_attractor".to_string(),
                keys: vec!['Q', 'G', 'C'],
                is_beneficial: false,
                effect_name: "Hostile Attractor (Boss Attracted)".to_string(),
            },
            ComboPattern {
                id: "audio_interference".to_string(),
                keys: vec!['T', 'F', 'R'],
                is_beneficial: false,
                effect_name: "Audio Interference (Reduced Precision)".to_string(),
            },
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_has_all_combos() {
        let config = PatternSystemConfig::default();
        
        // Should have 11 patterns (6 beneficial + 5 malicious)
        assert_eq!(config.patterns.len(), 11);
        
        let beneficial_count = config.patterns.iter().filter(|p| p.is_beneficial).count();
        let malicious_count = config.patterns.iter().filter(|p| !p.is_beneficial).count();
        
        assert_eq!(beneficial_count, 6, "Should have 6 beneficial combos");
        assert_eq!(malicious_count, 5, "Should have 5 malicious combos");
    }

    #[test]
    fn test_default_thresholds_are_valid() {
        let config = PatternSystemConfig::default();
        
        // Harmonic threshold should be higher than chaos threshold
        assert!(config.harmonic_threshold > config.chaos_threshold);
        
        // Both should be in valid range [0.0, 1.0]
        assert!(config.harmonic_threshold >= 0.0 && config.harmonic_threshold <= 1.0);
        assert!(config.chaos_threshold >= 0.0 && config.chaos_threshold <= 1.0);
    }

    #[test]
    fn test_complete_scale_is_longest_combo() {
        let config = PatternSystemConfig::default();
        
        let complete_scale = config.patterns.iter()
            .find(|p| p.id == "complete_scale")
            .expect("complete_scale combo should exist");
        
        // Should have all 7 keys
        assert_eq!(complete_scale.keys.len(), 7);
        assert_eq!(complete_scale.keys, vec!['Q', 'E', 'R', 'T', 'F', 'G', 'C']);
    }

    #[test]
    fn test_yaml_serialization() {
        let config = PatternSystemConfig::default();
        
        // Should serialize to YAML without panic
        let yaml = serde_yaml::to_string(&config).expect("Should serialize to YAML");
        
        // Should deserialize back
        let deserialized: PatternSystemConfig = serde_yaml::from_str(&yaml)
            .expect("Should deserialize from YAML");
        
        assert_eq!(deserialized.patterns.len(), config.patterns.len());
    }
}

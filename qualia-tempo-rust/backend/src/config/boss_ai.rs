//! # Responsibility
//! Boss AI configuration parameters.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for Boss AI behavior and difficulty scaling.
///
/// ---
///
/// Controls boss phase transitions, aggression levels, and telegraph durations.
/// Per GDD.md: Boss difficulty scales with player combo and song progress.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BossAIConfig {
    /// Base aggression level (0.0 = passive, 1.0 = maximum)
    pub base_aggression_level: f32,
    
    /// Song progress thresholds for phase transitions [intro->standard, standard->intensified, intensified->final]
    pub phase_thresholds: [f32; 3],
    
    /// Base telegraph duration in milliseconds (for intro phase)
    pub telegraph_base_duration_ms: u64,
    
    /// Minimum telegraph duration in milliseconds (for final phase)
    pub telegraph_min_duration_ms: u64,
    
    /// How much player combo increases aggression (multiplier per combo point)
    pub combo_aggression_multiplier: f32,
}

impl Default for BossAIConfig {
    fn default() -> Self {
        Self {
            base_aggression_level: 0.5,
            phase_thresholds: [0.15, 0.50, 0.85],
            telegraph_base_duration_ms: 2000,
            telegraph_min_duration_ms: 300,
            combo_aggression_multiplier: 0.01,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = BossAIConfig::default();
        
        assert_eq!(config.base_aggression_level, 0.5);
        assert_eq!(config.phase_thresholds, [0.15, 0.50, 0.85]);
        assert_eq!(config.telegraph_base_duration_ms, 2000);
        assert_eq!(config.telegraph_min_duration_ms, 300);
    }

    #[test]
    fn test_deserialize_from_yaml() {
        let yaml = r#"
base_aggression_level: 0.7
phase_thresholds: [0.20, 0.60, 0.90]
telegraph_base_duration_ms: 1500
telegraph_min_duration_ms: 250
combo_aggression_multiplier: 0.015
"#;
        
        let config: BossAIConfig = serde_yaml::from_str(yaml).unwrap();
        
        assert_eq!(config.base_aggression_level, 0.7);
        assert_eq!(config.phase_thresholds[0], 0.20);
        assert_eq!(config.telegraph_base_duration_ms, 1500);
    }
}

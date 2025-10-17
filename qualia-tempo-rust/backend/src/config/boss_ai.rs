//! # Responsibility
//! BossAIConfig structure for boss behavior configuration.
//!
//! ---
//!
//! Loaded from config/boss_ai.yaml at startup (or embedded in game_logic.yaml).

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for BossAIService behavior and aggression.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BossAIConfig {
    pub base_aggression: f32, // Base aggression level (0.0 - 1.0)
    pub aggression_per_phase: Vec<f32>, // Per-phase aggression multipliers
    pub reaction_time_ms: u64, // Time before boss reacts to player action
    pub pattern_selection: PatternSelectionConfig,
}

/// # Responsibility
/// Pattern selection strategy configuration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PatternSelectionConfig {
    pub random_chance: f32, // Chance to select random pattern (0.0 - 1.0)
    pub prefer_high_aggression_patterns: bool, // Prefer aggressive patterns at high qualia
    pub cooldown_between_patterns_ms: u64, // Minimum time between pattern executions
}

impl Default for BossAIConfig {
    fn default() -> Self {
        Self {
            base_aggression: 0.5,
            aggression_per_phase: vec![1.0, 1.3, 1.6, 2.0],
            reaction_time_ms: 500,
            pattern_selection: PatternSelectionConfig {
                random_chance: 0.3,
                prefer_high_aggression_patterns: true,
                cooldown_between_patterns_ms: 3000,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_aggression_values() {
        let config = BossAIConfig::default();
        assert_eq!(config.base_aggression, 0.5);
        assert_eq!(config.aggression_per_phase.len(), 4);
    }

    #[test]
    fn test_aggression_increases_per_phase() {
        let config = BossAIConfig::default();
        for i in 1..config.aggression_per_phase.len() {
            assert!(config.aggression_per_phase[i] > config.aggression_per_phase[i - 1]);
        }
    }
}

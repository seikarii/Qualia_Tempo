//! # Responsibility
//! GameLogicConfig structure for game rules configuration.
//!
//! ---
//!
//! Loaded from config/game_logic.yaml at startup.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for GameLogicService rules and parameters.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct GameLogicConfig {
    pub player: PlayerConfig,
    pub boss: BossConfig,
    pub scoring: ScoringConfig,
    pub combo: ComboConfig,
}

/// # Responsibility
/// Player-specific configuration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlayerConfig {
    pub max_health: f32,
    pub base_damage: f32,
    pub dash_cooldown_ms: u64,
    pub dash_duration_ms: u64,
    pub invulnerability_frames: u32,
}

/// # Responsibility
/// Boss-specific configuration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BossConfig {
    pub max_health: f32,
    pub phase_count: u8,
    pub phase_health_thresholds: Vec<f32>, // e.g., [1.0, 0.75, 0.5, 0.25]
    pub attack_speed_multipliers: Vec<f32>, // Per-phase multipliers
}

/// # Responsibility
/// Scoring system configuration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScoringConfig {
    pub base_score_per_action: u32,
    pub accuracy_multiplier: f32,
    pub combo_multiplier_per_hit: f32,
    pub max_combo_multiplier: f32,
}

/// # Responsibility
/// Combo system configuration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ComboConfig {
    pub min_accuracy_for_combo: f32, // Minimum accuracy to maintain combo (e.g., 0.7)
    pub combo_break_time_ms: u64, // Time before combo resets (e.g., 2000)
    pub max_combo: u32, // Maximum combo cap (e.g., 999)
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            player: PlayerConfig {
                max_health: 100.0,
                base_damage: 10.0,
                dash_cooldown_ms: 1000,
                dash_duration_ms: 200,
                invulnerability_frames: 10,
            },
            boss: BossConfig {
                max_health: 1000.0,
                phase_count: 4,
                phase_health_thresholds: vec![1.0, 0.75, 0.5, 0.25],
                attack_speed_multipliers: vec![1.0, 1.2, 1.5, 2.0],
            },
            scoring: ScoringConfig {
                base_score_per_action: 100,
                accuracy_multiplier: 2.0,
                combo_multiplier_per_hit: 0.1,
                max_combo_multiplier: 5.0,
            },
            combo: ComboConfig {
                min_accuracy_for_combo: 0.7,
                combo_break_time_ms: 2000,
                max_combo: 999,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_values() {
        let config = GameLogicConfig::default();
        assert_eq!(config.player.max_health, 100.0);
        assert_eq!(config.boss.max_health, 1000.0);
        assert_eq!(config.boss.phase_count, 4);
        assert_eq!(config.scoring.base_score_per_action, 100);
    }

    #[test]
    fn test_phase_threshold_count_matches_phase_count() {
        let config = GameLogicConfig::default();
        assert_eq!(
            config.boss.phase_health_thresholds.len(),
            config.boss.phase_count as usize
        );
    }
}

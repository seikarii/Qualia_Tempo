//! # Responsibility
//! Defines combat-specific event types.
//!
//! ---
//!
//! Contains events related to boss patterns, player damage, combos, etc.

use crate::contracts::combat_data::PatternData;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Event for boss pattern execution.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossPatternTriggered {
    pub pattern_id: String,
    pub pattern: PatternData,
    pub timestamp: f64,
}

/// # Responsibility
/// Event for player taking damage.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerDamaged {
    pub damage_amount: f32,
    pub source: DamageSource,
    pub timestamp: f64,
}

/// # Responsibility
/// Enumerates damage sources for analytics.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DamageSource {
    BossPattern,
    EnvironmentHazard,
    ChaoticCombo,
}

/// # Responsibility
/// Event for successful combo execution.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ComboExecuted {
    pub combo_id: String,
    pub notes: Vec<char>,
    pub is_beneficial: bool,
    pub timestamp: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_damaged_serialization() {
        let event = PlayerDamaged {
            damage_amount: 15.5,
            source: DamageSource::BossPattern,
            timestamp: 3000.0,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: PlayerDamaged = serde_json::from_str(&json).unwrap();

        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_combo_executed_serialization() {
        let event = ComboExecuted {
            combo_id: "harmonic_swirl".to_string(),
            notes: vec!['Q', 'E', 'R'],
            is_beneficial: true,
            timestamp: 5000.0,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: ComboExecuted = serde_json::from_str(&json).unwrap();

        assert_eq!(event, deserialized);
    }
}

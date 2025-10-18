//! # Responsibility
//! Defines leaderboard and scoring contracts.
//!
//! ---
//!
//! Contains LeaderboardEntry and related scoring structures.

use crate::contracts::game_state::QualiaState;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents a single leaderboard entry.
///
/// ---
///
/// Contains player performance data for ranking and display.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntry {
    pub player_id: String,
    pub player_name: String,
    pub score: u64,
    pub final_qualia: QualiaState,
    pub song_id: String,
    pub boss_id: String,
    pub timestamp: f64,
    pub rank: u32,
    pub max_combo: u32,
    pub accuracy_percentage: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leaderboard_entry_serialization() {
        let entry = LeaderboardEntry {
            player_id: "player_123".to_string(),
            player_name: "Charlie".to_string(),
            score: 999_999,
            final_qualia: QualiaState::default(),
            song_id: "song_1".to_string(),
            boss_id: "boss_1".to_string(),
            timestamp: 1_729_267_200_000.0,
            rank: 1,
            max_combo: 450,
            accuracy_percentage: 98.5,
        };

        let json = serde_json::to_string(&entry).unwrap();
        let deserialized: LeaderboardEntry = serde_json::from_str(&json).unwrap();

        assert_eq!(entry, deserialized);
    }
}

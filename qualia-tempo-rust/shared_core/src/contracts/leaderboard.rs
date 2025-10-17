//! # Responsibility
//! Defines leaderboard entry structure for persistent high score tracking.
//!
//! ---
//!
//! This module contains the contract for leaderboard entries that are
//! persisted to database and displayed in the leaderboard UI.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use super::game_state::QualiaState;
use super::combat_data::SongDifficulty;

/// # Responsibility
/// Represents a single leaderboard entry.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntry {
    pub rank: u32,
    pub player_id: String,
    pub player_name: String,
    pub score: u64,
    pub song_id: String,
    pub difficulty: SongDifficulty,
    pub max_combo: u32,
    pub accuracy: f32,
    pub timestamp: i64,
    pub qualia_snapshot: QualiaState,
    pub replay_data_url: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leaderboard_entry_serialization() {
        let entry = LeaderboardEntry {
            rank: 1,
            player_id: "player123".to_string(),
            player_name: "TestPlayer".to_string(),
            score: 1000000,
            song_id: "song_01".to_string(),
            difficulty: SongDifficulty::Expert,
            max_combo: 500,
            accuracy: 0.98,
            timestamp: 1634567890,
            qualia_snapshot: QualiaState::default(),
            replay_data_url: Some("replays/player123_song01.dat".to_string()),
        };

        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("player123"));
        assert!(json.contains("1000000"));
        assert!(json.contains("expert"));

        let deserialized: LeaderboardEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, entry);
    }
}

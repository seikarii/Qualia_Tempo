//! # Responsibility
//! Defines leaderboard and scoring structures.
//!
//! ---
//!
//! This module contains data structures for leaderboard entries, scoring,
//! and player rankings. Used by the persistence service for storage and retrieval.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents a single leaderboard entry.
///
/// ---
///
/// Contains all relevant data for a completed game session, including
/// score, performance metrics, and player identification.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntry {
    /// Unique entry ID
    pub id: String,
    /// Player username
    pub player_name: String,
    /// Player ID (if authenticated)
    pub player_id: Option<String>,
    /// Final score
    pub score: u32,
    /// Song ID
    pub song_id: String,
    /// Difficulty level
    pub difficulty: String,
    /// Completion timestamp (Unix timestamp)
    pub timestamp: i64,
    /// Maximum combo achieved
    pub max_combo: u32,
    /// Accuracy percentage (0.0 - 100.0)
    pub accuracy: f32,
    /// Final Qualia state snapshot (JSON serialized)
    pub final_qualia: String,
    /// Session duration in seconds
    pub duration_sec: f64,
    /// Number of deaths/retries
    pub deaths: u32,
    /// Whether this was a perfect run (no damage taken)
    pub is_perfect: bool,
    /// Replay data file path (if saved)
    pub replay_path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leaderboard_entry_serialization() {
        let entry = LeaderboardEntry {
            id: "entry_001".to_string(),
            player_name: "TestPlayer".to_string(),
            player_id: Some("player_123".to_string()),
            score: 999999,
            song_id: "song_metal_hellfire".to_string(),
            difficulty: "expert".to_string(),
            timestamp: 1634567890,
            max_combo: 500,
            accuracy: 98.5,
            final_qualia: r#"{"intensity":1.0,"precision":0.95}"#.to_string(),
            duration_sec: 180.5,
            deaths: 0,
            is_perfect: true,
            replay_path: Some("/replays/entry_001.replay".to_string()),
        };

        let json = serde_json::to_string(&entry).expect("Failed to serialize");
        let deserialized: LeaderboardEntry = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(entry.score, deserialized.score);
        assert_eq!(entry.player_name, deserialized.player_name);
        assert!(deserialized.is_perfect);
    }

    #[test]
    fn test_leaderboard_entry_with_none_fields() {
        let entry = LeaderboardEntry {
            id: "entry_002".to_string(),
            player_name: "Guest".to_string(),
            player_id: None,
            score: 50000,
            song_id: "song_intro".to_string(),
            difficulty: "normal".to_string(),
            timestamp: 1634567890,
            max_combo: 100,
            accuracy: 85.0,
            final_qualia: r#"{}"#.to_string(),
            duration_sec: 90.0,
            deaths: 3,
            is_perfect: false,
            replay_path: None,
        };

        let json = serde_json::to_string(&entry).expect("Failed to serialize");
        let deserialized: LeaderboardEntry = serde_json::from_str(&json).expect("Failed to deserialize");

        assert!(deserialized.player_id.is_none());
        assert!(deserialized.replay_path.is_none());
        assert!(!deserialized.is_perfect);
    }
}

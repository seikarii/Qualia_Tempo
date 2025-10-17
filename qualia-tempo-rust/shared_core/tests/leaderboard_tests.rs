//! # Responsibility
//! Integration tests for LeaderboardEntry contract serialization.
//!
//! ---
//!
//! Validates JSON serialization/deserialization of leaderboard entries,
//! ensuring wire format compatibility with frontend clients.

use shared_core::contracts::{LeaderboardEntry, QualiaState, SongDifficulty};

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

    let json = serde_json::to_string(&entry).expect("Failed to serialize");
    assert!(json.contains("player123"));
    assert!(json.contains("1000000"));
    assert!(json.contains("expert"));

    let deserialized: LeaderboardEntry = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, entry);
}

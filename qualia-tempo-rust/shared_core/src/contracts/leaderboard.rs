//! # Responsibility
//! Contains leaderboard data structures.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use super::game_state::QualiaState;
use super::combat_data::SongDifficulty;

/// # Responsibility
/// Defines the structure for a single leaderboard entry.
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

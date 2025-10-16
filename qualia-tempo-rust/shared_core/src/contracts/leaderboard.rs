//! # Responsibility
//! Defines leaderboard entry structures for competitive scoring and replay systems.
//!
//! ---
//!
//! This module implements the leaderboard data model from DATA.RUST.md.
//! Supports global and per-song leaderboards with replay data for social features.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Defines the scope of a leaderboard.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LeaderboardScope {
    Global,
    Friends,
    Daily,
    Weekly,
    AllTime,
}

/// # Responsibility
/// Represents a single leaderboard entry.
///
/// ---
///
/// Contains player identification, score breakdown, and replay data reference.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntry {
    pub rank: u32,
    pub player_id: String,
    pub player_name: String,
    pub score: u64,
    pub max_combo: u32,
    pub accuracy: f32, // 0.0 to 100.0
    pub completion_time_sec: f64,
    pub song_id: String,
    pub difficulty_tier: String,
    pub timestamp: u64, // Unix timestamp in milliseconds
    pub replay_data_url: Option<String>, // S3/CDN URL to replay file
}

/// # Responsibility
/// Request structure for querying leaderboards.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardQuery {
    pub song_id: Option<String>, // None = global leaderboard
    pub scope: LeaderboardScope,
    pub offset: u32,
    pub limit: u32,
}

/// # Responsibility
/// Response structure for leaderboard queries.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
    pub total_entries: u32,
    pub player_rank: Option<u32>, // Querying player's rank if authenticated
}

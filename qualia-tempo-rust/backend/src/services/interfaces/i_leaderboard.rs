//! # Responsibility
//! Leaderboard service interface for score persistence and ranking.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use uuid::Uuid;

/// # Responsibility
/// Leaderboard entry data.
#[derive(Debug, Clone)]
pub struct LeaderboardEntry {
    pub player_id: Uuid,
    pub player_name: String,
    pub score: u64,
    pub rank: usize,
    pub song_id: String,
    pub timestamp: u64,
}

/// # Responsibility
/// Pagination options for leaderboard queries.
#[derive(Debug, Clone)]
pub struct LeaderboardQuery {
    pub song_id: Option<String>,
    pub limit: usize,
    pub offset: usize,
}

/// # Responsibility
/// Manages leaderboard persistence with SQLite/PostgreSQL.
#[async_trait]
pub trait ILeaderboardService: Interface {
    /// Inserts a new score entry.
    async fn insert_score(&self, entry: LeaderboardEntry) -> Result<()>;
    
    /// Retrieves leaderboard entries with pagination.
    async fn get_leaderboard(&self, query: LeaderboardQuery) -> Result<Vec<LeaderboardEntry>>;
    
    /// Retrieves player's best score for a song.
    async fn get_player_best(&self, player_id: Uuid, song_id: &str) -> Result<Option<LeaderboardEntry>>;
    
    /// Resets leaderboard for a specific song.
    async fn reset_leaderboard(&self, song_id: &str) -> Result<()>;
}

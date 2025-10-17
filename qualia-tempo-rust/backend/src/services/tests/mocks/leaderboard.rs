//! # Responsibility
//! High-fidelity mock for ILeaderboardService trait.

use crate::services::interfaces::{ILeaderboardService, LeaderboardEntry, LeaderboardQuery};
use anyhow::Result;
use async_trait::async_trait;
use mockall::*;
use uuid::Uuid;

mock! {
    /// # Responsibility
    /// High-fidelity mock for ILeaderboardService, used in unit tests.
    pub LeaderboardService {}
    
    #[async_trait]
    impl ILeaderboardService for LeaderboardService {
        async fn insert_score(&self, entry: LeaderboardEntry) -> Result<()>;
        async fn get_leaderboard(&self, query: LeaderboardQuery) -> Result<Vec<LeaderboardEntry>>;
        async fn get_player_best(&self, player_id: Uuid, song_id: &str) -> Result<Option<LeaderboardEntry>>;
        async fn reset_leaderboard(&self, song_id: &str) -> Result<()>;
    }
}

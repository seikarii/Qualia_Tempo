//! # Responsibility
//! Implements leaderboard persistence with SQLite/PostgreSQL for score tracking.
//!
//! ---
//!
//! Provides async database operations for score insertion, ranking queries,
//! player best score retrieval, and leaderboard resets. Uses sqlx for
//! connection pooling and async queries.

use crate::services::interfaces::{ILeaderboardService, LeaderboardEntry, LeaderboardQuery};
use anyhow::{Context, Result};
use async_trait::async_trait;
use shaku::{Component, Interface};
use sqlx::{SqlitePool, Row};
use std::sync::Arc;
use tracing::{info, warn};
use uuid::Uuid;

/// # Responsibility
/// Implements ILeaderboardService with SQLite persistence and ranking queries.
#[derive(Component)]
#[shaku(interface = ILeaderboardService)]
pub struct LeaderboardService {
    pool: Arc<SqlitePool>,
}

impl LeaderboardService {
    /// # Responsibility
    /// Creates new LeaderboardService and initializes database schema.
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = SqlitePool::connect(database_url)
            .await
            .context("Failed to connect to SQLite database")?;
        
        // Create leaderboard table if not exists
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS leaderboard (
                id TEXT PRIMARY KEY,
                player_id TEXT NOT NULL,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                song_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                UNIQUE(player_id, song_id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .context("Failed to create leaderboard table")?;
        
        // Create index on song_id for faster queries
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_song_id ON leaderboard(song_id)")
            .execute(&pool)
            .await
            .context("Failed to create song_id index")?;
        
        // Create index on score for faster ranking
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_score ON leaderboard(score DESC)")
            .execute(&pool)
            .await
            .context("Failed to create score index")?;
        
        info!("LeaderboardService initialized with database: {}", database_url);
        
        Ok(Self {
            pool: Arc::new(pool),
        })
    }
    
    /// # Responsibility
    /// Calculates rank for given score and song_id.
    async fn calculate_rank(&self, score: u64, song_id: &str) -> Result<usize> {
        let rank: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) + 1 FROM leaderboard WHERE song_id = ? AND score > ?"
        )
        .bind(song_id)
        .bind(score as i64)
        .fetch_one(self.pool.as_ref())
        .await
        .context("Failed to calculate rank")?;
        
        Ok(rank as usize)
    }
}

#[async_trait]
impl ILeaderboardService for LeaderboardService {
    async fn insert_score(&self, entry: LeaderboardEntry) -> Result<()> {
        let rank = self.calculate_rank(entry.score, &entry.song_id).await?;
        
        // Use INSERT OR REPLACE to handle duplicate (player_id, song_id)
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO leaderboard 
            (id, player_id, player_name, score, song_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(entry.player_id.to_string())
        .bind(&entry.player_name)
        .bind(entry.score as i64)
        .bind(&entry.song_id)
        .bind(entry.timestamp as i64)
        .execute(self.pool.as_ref())
        .await
        .context("Failed to insert score")?;
        
        info!(
            "Inserted score: player={}, score={}, rank={}, song={}",
            entry.player_name, entry.score, rank, entry.song_id
        );
        
        Ok(())
    }
    
    async fn get_leaderboard(&self, query: LeaderboardQuery) -> Result<Vec<LeaderboardEntry>> {
        let sql = if let Some(song_id) = &query.song_id {
            format!(
                "SELECT * FROM leaderboard WHERE song_id = '{}' ORDER BY score DESC LIMIT {} OFFSET {}",
                song_id, query.limit, query.offset
            )
        } else {
            format!(
                "SELECT * FROM leaderboard ORDER BY score DESC LIMIT {} OFFSET {}",
                query.limit, query.offset
            )
        };
        
        let rows = sqlx::query(&sql)
            .fetch_all(self.pool.as_ref())
            .await
            .context("Failed to fetch leaderboard")?;
        
        let mut entries = Vec::new();
        for (idx, row) in rows.iter().enumerate() {
            let player_id_str: String = row.get("player_id");
            let player_id = Uuid::parse_str(&player_id_str)
                .context("Invalid player_id UUID")?;
            
            let entry = LeaderboardEntry {
                player_id,
                player_name: row.get("player_name"),
                score: row.get::<i64, _>("score") as u64,
                rank: query.offset + idx + 1,
                song_id: row.get("song_id"),
                timestamp: row.get::<i64, _>("timestamp") as u64,
            };
            entries.push(entry);
        }
        
        info!("Retrieved {} leaderboard entries (offset={})", entries.len(), query.offset);
        
        Ok(entries)
    }
    
    async fn get_player_best(&self, player_id: Uuid, song_id: &str) -> Result<Option<LeaderboardEntry>> {
        let row = sqlx::query(
            "SELECT * FROM leaderboard WHERE player_id = ? AND song_id = ? ORDER BY score DESC LIMIT 1"
        )
        .bind(player_id.to_string())
        .bind(song_id)
        .fetch_optional(self.pool.as_ref())
        .await
        .context("Failed to fetch player best score")?;
        
        if let Some(row) = row {
            let score = row.get::<i64, _>("score") as u64;
            let rank = self.calculate_rank(score, song_id).await?;
            
            let entry = LeaderboardEntry {
                player_id,
                player_name: row.get("player_name"),
                score,
                rank,
                song_id: song_id.to_string(),
                timestamp: row.get::<i64, _>("timestamp") as u64,
            };
            
            info!("Retrieved player best: player={}, score={}, rank={}", entry.player_name, score, rank);
            
            Ok(Some(entry))
        } else {
            warn!("No score found for player={}, song={}", player_id, song_id);
            Ok(None)
        }
    }
    
    async fn reset_leaderboard(&self, song_id: &str) -> Result<()> {
        let result = sqlx::query("DELETE FROM leaderboard WHERE song_id = ?")
            .bind(song_id)
            .execute(self.pool.as_ref())
            .await
            .context("Failed to reset leaderboard")?;
        
        info!("Reset leaderboard for song={}, deleted {} rows", song_id, result.rows_affected());
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};
    
    async fn create_test_service() -> Result<LeaderboardService> {
        LeaderboardService::new(":memory:").await
    }
    
    fn create_test_entry(player_name: &str, score: u64, song_id: &str) -> LeaderboardEntry {
        LeaderboardEntry {
            player_id: Uuid::new_v4(),
            player_name: player_name.to_string(),
            score,
            rank: 0,
            song_id: song_id.to_string(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
    
    #[tokio::test]
    async fn test_insert_score_updates_rank() {
        let service = create_test_service().await.unwrap();
        
        let entry1 = create_test_entry("Alice", 1000, "song1");
        let entry2 = create_test_entry("Bob", 2000, "song1");
        
        service.insert_score(entry1).await.unwrap();
        service.insert_score(entry2.clone()).await.unwrap();
        
        // Bob should be rank 1 (higher score)
        let bob_best = service.get_player_best(entry2.player_id, "song1").await.unwrap().unwrap();
        assert_eq!(bob_best.rank, 1);
    }
    
    #[tokio::test]
    async fn test_get_leaderboard_pagination() {
        let service = create_test_service().await.unwrap();
        
        // Insert 5 scores
        for i in 1..=5 {
            let entry = create_test_entry(&format!("Player{}", i), (i * 100) as u64, "song1");
            service.insert_score(entry).await.unwrap();
        }
        
        // Get page 1 (top 2)
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 2,
            offset: 0,
        };
        let page1 = service.get_leaderboard(query).await.unwrap();
        assert_eq!(page1.len(), 2);
        assert_eq!(page1[0].score, 500); // Highest score first
        
        // Get page 2 (next 2)
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 2,
            offset: 2,
        };
        let page2 = service.get_leaderboard(query).await.unwrap();
        assert_eq!(page2.len(), 2);
        assert_eq!(page2[0].score, 300);
    }
    
    #[tokio::test]
    async fn test_get_player_best_found() {
        let service = create_test_service().await.unwrap();
        
        let entry = create_test_entry("Alice", 1500, "song1");
        let player_id = entry.player_id;
        service.insert_score(entry).await.unwrap();
        
        let best = service.get_player_best(player_id, "song1").await.unwrap();
        assert!(best.is_some());
        assert_eq!(best.unwrap().score, 1500);
    }
    
    #[tokio::test]
    async fn test_get_player_best_not_found() {
        let service = create_test_service().await.unwrap();
        
        let best = service.get_player_best(Uuid::new_v4(), "nonexistent").await.unwrap();
        assert!(best.is_none());
    }
    
    #[tokio::test]
    async fn test_reset_leaderboard_clears_entries() {
        let service = create_test_service().await.unwrap();
        
        let entry = create_test_entry("Alice", 1000, "song1");
        service.insert_score(entry).await.unwrap();
        
        service.reset_leaderboard("song1").await.unwrap();
        
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 10,
            offset: 0,
        };
        let entries = service.get_leaderboard(query).await.unwrap();
        assert_eq!(entries.len(), 0);
    }
    
    #[tokio::test]
    async fn test_ranking_calculation_correctness() {
        let service = create_test_service().await.unwrap();
        
        // Insert scores in random order
        let entries = vec![
            create_test_entry("Charlie", 300, "song1"),
            create_test_entry("Alice", 500, "song1"),
            create_test_entry("Bob", 400, "song1"),
        ];
        
        for entry in entries {
            service.insert_score(entry).await.unwrap();
        }
        
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 10,
            offset: 0,
        };
        let leaderboard = service.get_leaderboard(query).await.unwrap();
        
        // Should be sorted: Alice (500), Bob (400), Charlie (300)
        assert_eq!(leaderboard[0].player_name, "Alice");
        assert_eq!(leaderboard[0].rank, 1);
        assert_eq!(leaderboard[1].player_name, "Bob");
        assert_eq!(leaderboard[1].rank, 2);
        assert_eq!(leaderboard[2].player_name, "Charlie");
        assert_eq!(leaderboard[2].rank, 3);
    }
    
    #[tokio::test]
    async fn test_concurrent_insert_handling() {
        let service = Arc::new(create_test_service().await.unwrap());
        
        let mut handles = vec![];
        
        for i in 0..10 {
            let service_clone = service.clone();
            let handle = tokio::spawn(async move {
                let entry = create_test_entry(&format!("Player{}", i), (i * 10) as u64, "song1");
                service_clone.insert_score(entry).await.unwrap();
            });
            handles.push(handle);
        }
        
        for handle in handles {
            handle.await.unwrap();
        }
        
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 100,
            offset: 0,
        };
        let entries = service.get_leaderboard(query).await.unwrap();
        assert_eq!(entries.len(), 10);
    }
    
    #[tokio::test]
    async fn test_pagination_boundary_conditions() {
        let service = create_test_service().await.unwrap();
        
        // Insert 3 scores
        for i in 1..=3 {
            let entry = create_test_entry(&format!("Player{}", i), (i * 100) as u64, "song1");
            service.insert_score(entry).await.unwrap();
        }
        
        // Request beyond available entries
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 10,
            offset: 5,
        };
        let entries = service.get_leaderboard(query).await.unwrap();
        assert_eq!(entries.len(), 0);
    }
    
    #[tokio::test]
    async fn test_multiple_songs_isolation() {
        let service = create_test_service().await.unwrap();
        
        let entry_song1 = create_test_entry("Alice", 1000, "song1");
        let entry_song2 = create_test_entry("Bob", 2000, "song2");
        
        service.insert_score(entry_song1).await.unwrap();
        service.insert_score(entry_song2).await.unwrap();
        
        let query = LeaderboardQuery {
            song_id: Some("song1".to_string()),
            limit: 10,
            offset: 0,
        };
        let song1_entries = service.get_leaderboard(query).await.unwrap();
        assert_eq!(song1_entries.len(), 1);
        assert_eq!(song1_entries[0].player_name, "Alice");
    }
    
    #[tokio::test]
    async fn test_connection_pool_exhaustion_recovery() {
        let service = Arc::new(create_test_service().await.unwrap());
        
        // Simulate many concurrent queries (stress test)
        let mut handles = vec![];
        for i in 0..50 {
            let service_clone = service.clone();
            let handle = tokio::spawn(async move {
                let entry = create_test_entry(&format!("Player{}", i), i as u64, "song1");
                service_clone.insert_score(entry).await
            });
            handles.push(handle);
        }
        
        // All should succeed despite concurrent access
        for handle in handles {
            assert!(handle.await.unwrap().is_ok());
        }
    }
}

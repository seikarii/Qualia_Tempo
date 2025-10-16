//! # Responsibility
//! Persistence service for leaderboard and score management.
//!
//! ---
//!
//! Provides thread-safe leaderboard storage with JSON persistence.
//! Phase 1: JSON file storage. Phase 3: SQLite/PostgreSQL migration.

use tokio::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::{Result, Context, bail};
use shaku::{Component, Interface};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use crate::services::infrastructure::ILogger;

/// # Responsibility
/// Configuration for persistence service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistenceConfig {
    /// Storage directory for leaderboard data
    pub storage_directory: String,
    
    /// Leaderboard JSON filename
    pub leaderboard_filename: String,
    
    /// Maximum entries per song
    pub max_entries_per_song: usize,
    
    /// Maximum entries globally
    pub max_entries_global: usize,
    
    /// Enable score validation
    pub enable_validation: bool,
}

impl Default for PersistenceConfig {
    fn default() -> Self {
        Self {
            storage_directory: "./data/leaderboard".to_string(),
            leaderboard_filename: "leaderboard.json".to_string(),
            max_entries_per_song: 1000,
            max_entries_global: 10000,
            enable_validation: true,
        }
    }
}

/// # Responsibility
/// Represents a single leaderboard entry.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LeaderboardEntry {
    pub player_id: String,
    pub player_name: String,
    pub score: f32,
    pub song_id: String,
    pub song_title: String,
    pub difficulty_volume: f32,
    pub timestamp: DateTime<Utc>,
    
    // Optional metadata
    pub max_combo: Option<u32>,
    pub notes_hit: Option<u32>,
    pub notes_total: Option<u32>,
    pub accuracy: Option<f32>,
}

/// # Responsibility
/// Interface for persistence service.
#[async_trait::async_trait]
pub trait IPersistenceService: Interface + Send + Sync {
    /// Saves a leaderboard entry
    async fn save_entry(&self, entry: LeaderboardEntry) -> Result<()>;
    
    /// Gets leaderboard entries with optional filtering
    async fn get_leaderboard(
        &self,
        song_id: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<LeaderboardEntry>>;
    
    /// Gets player's best score
    async fn get_player_best_score(
        &self,
        player_id: &str,
        song_id: Option<&str>,
    ) -> Result<Option<LeaderboardEntry>>;
    
    /// Gets player's rank
    async fn get_player_rank(
        &self,
        player_id: &str,
        song_id: Option<&str>,
    ) -> Result<Option<usize>>;
    
    /// Validates a score (anti-cheat)
    fn validate_score(&self, entry: &LeaderboardEntry) -> bool;
}

/// # Responsibility
/// Persistence service for leaderboard and score management.
///
/// ---
///
/// Thread-safe JSON file storage. Phase 1 implementation.
/// Phase 3: Migrate to SQLite/PostgreSQL.
#[derive(Component)]
#[shaku(interface = IPersistenceService)]
pub struct PersistenceService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<PersistenceConfig>,
    
    // RwLock for thread-safe concurrent reads, exclusive writes
    leaderboard: Arc<RwLock<Vec<LeaderboardEntry>>>,
}

impl PersistenceService {
    pub fn new(logger: Arc<dyn ILogger>, config: Arc<PersistenceConfig>) -> Self {
        logger.info(&format!(
            "PersistenceService initialized (storage: {})",
            config.storage_directory
        ));
        
        let service = Self {
            logger,
            config,
            leaderboard: Arc::new(RwLock::new(Vec::new())),
        };
        
        service
    }
    
    /// Initializes service (loads existing data from disk).
    pub async fn initialize(&self) -> Result<()> {
        // Create storage directory if it doesn't exist
        let storage_path = Path::new(&self.config.storage_directory);
        fs::create_dir_all(storage_path)
            .await
            .context("Failed to create storage directory")?;
        
        // Load existing leaderboard
        let leaderboard_path = storage_path.join(&self.config.leaderboard_filename);
        
        if leaderboard_path.exists() {
            let contents = fs::read_to_string(&leaderboard_path)
                .await
                .context("Failed to read leaderboard file")?;
            
            let entries: Vec<LeaderboardEntry> = serde_json::from_str(&contents)
                .context("Failed to parse leaderboard JSON")?;
            
            let mut leaderboard = self.leaderboard.write().await;
            *leaderboard = entries;
            
            self.logger.info(&format!("Loaded {} leaderboard entries from disk", leaderboard.len()));
        } else {
            self.logger.info("No existing leaderboard found, starting fresh");
        }
        
        Ok(())
    }
    
    /// Saves leaderboard to disk (thread-safe).
    async fn save_to_disk(&self) -> Result<()> {
        let leaderboard = self.leaderboard.read().await;
        
        let json = serde_json::to_string_pretty(&*leaderboard)
            .context("Failed to serialize leaderboard")?;
        
        let storage_path = Path::new(&self.config.storage_directory);
        let leaderboard_path = storage_path.join(&self.config.leaderboard_filename);
        
        // Atomic write: write to temp file, then rename
        let temp_path = leaderboard_path.with_extension("tmp");
        fs::write(&temp_path, &json)
            .await
            .context("Failed to write temp file")?;
        
        fs::rename(&temp_path, &leaderboard_path)
            .await
            .context("Failed to rename temp file")?;
        
        self.logger.info(&format!("Saved {} entries to disk", leaderboard.len()));
        
        Ok(())
    }
    
    /// Prunes leaderboard to enforce size limits.
    async fn prune_leaderboard(&self) {
        let mut leaderboard = self.leaderboard.write().await;
        
        // Sort by score descending
        leaderboard.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Enforce global limit
        if leaderboard.len() > self.config.max_entries_global {
            leaderboard.truncate(self.config.max_entries_global);
            self.logger.info(&format!("Pruned to {} global entries", self.config.max_entries_global));
        }
        
        // Enforce per-song limit
        let mut song_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        leaderboard.retain(|entry| {
            let count = song_counts.entry(entry.song_id.clone()).or_insert(0);
            *count += 1;
            *count <= self.config.max_entries_per_song
        });
    }
}

#[async_trait::async_trait]
impl IPersistenceService for PersistenceService {
    async fn save_entry(&self, entry: LeaderboardEntry) -> Result<()> {
        // Validate entry
        if self.config.enable_validation && !self.validate_score(&entry) {
            bail!("Score validation failed");
        }
        
        // Basic validation
        if entry.score < 0.0 {
            bail!("Score cannot be negative");
        }
        
        if !(0.0..=1.0).contains(&entry.difficulty_volume) {
            bail!("Difficulty volume must be between 0.0 and 1.0");
        }
        
        // Add to leaderboard
        {
            let mut leaderboard = self.leaderboard.write().await;
            leaderboard.push(entry.clone());
        }
        
        // Prune if necessary
        self.prune_leaderboard().await;
        
        // Save to disk
        self.save_to_disk().await?;
        
        self.logger.info(&format!(
            "Saved entry: {} scored {:.0} on {} (difficulty: {:.2})",
            entry.player_name, entry.score, entry.song_title, entry.difficulty_volume
        ));
        
        Ok(())
    }
    
    async fn get_leaderboard(
        &self,
        song_id: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<LeaderboardEntry>> {
        let leaderboard = self.leaderboard.read().await;
        
        // Filter by song_id if specified
        let mut entries: Vec<LeaderboardEntry> = if let Some(song_id) = song_id {
            leaderboard.iter()
                .filter(|e| e.song_id == song_id)
                .cloned()
                .collect()
        } else {
            leaderboard.clone()
        };
        
        // Sort by score descending
        entries.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        // Apply limit
        if let Some(limit) = limit {
            entries.truncate(limit);
        }
        
        Ok(entries)
    }
    
    async fn get_player_best_score(
        &self,
        player_id: &str,
        song_id: Option<&str>,
    ) -> Result<Option<LeaderboardEntry>> {
        let leaderboard = self.leaderboard.read().await;
        
        let mut player_entries: Vec<LeaderboardEntry> = leaderboard.iter()
            .filter(|e| e.player_id == player_id)
            .cloned()
            .collect();
        
        // Filter by song if specified
        if let Some(song_id) = song_id {
            player_entries.retain(|e| e.song_id == song_id);
        }
        
        // Find best score
        player_entries.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(player_entries.first().cloned())
    }
    
    async fn get_player_rank(
        &self,
        player_id: &str,
        song_id: Option<&str>,
    ) -> Result<Option<usize>> {
        let leaderboard = self.get_leaderboard(song_id, None).await?;
        
        // Find player's position (1-indexed)
        for (index, entry) in leaderboard.iter().enumerate() {
            if entry.player_id == player_id {
                return Ok(Some(index + 1));
            }
        }
        
        Ok(None)
    }
    
    fn validate_score(&self, entry: &LeaderboardEntry) -> bool {
        // Phase 1: Basic validation
        // Phase 3: Advanced anti-cheat (score per second, accuracy bounds, etc.)
        
        // Check accuracy bounds if present
        if let Some(accuracy) = entry.accuracy {
            if !(0.0..=1.0).contains(&accuracy) {
                return false;
            }
        }
        
        // Check notes_hit <= notes_total if present
        if let (Some(notes_hit), Some(notes_total)) = (entry.notes_hit, entry.notes_total) {
            if notes_hit > notes_total {
                return false;
            }
        }
        
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    use tempfile::TempDir;
    
    fn create_test_service(storage_dir: &str) -> PersistenceService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let config = Arc::new(PersistenceConfig {
            storage_directory: storage_dir.to_string(),
            leaderboard_filename: "leaderboard.json".to_string(),
            max_entries_per_song: 10,
            max_entries_global: 100,
            enable_validation: true,
        });
        
        PersistenceService::new(logger, config)
    }
    
    fn create_test_entry(score: f32) -> LeaderboardEntry {
        LeaderboardEntry {
            player_id: "player_001".to_string(),
            player_name: "TestPlayer".to_string(),
            score,
            song_id: "song_001".to_string(),
            song_title: "Test Song".to_string(),
            difficulty_volume: 0.8,
            timestamp: Utc::now(),
            max_combo: Some(100),
            notes_hit: Some(95),
            notes_total: Some(100),
            accuracy: Some(0.95),
        }
    }
    
    #[tokio::test]
    async fn test_persistence_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        
        let result = service.initialize().await;
        assert!(result.is_ok(), "Initialization should succeed");
    }
    
    #[tokio::test]
    async fn test_save_entry_success() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        let entry = create_test_entry(5000.0);
        let result = service.save_entry(entry).await;
        
        assert!(result.is_ok(), "Should save entry successfully");
    }
    
    #[tokio::test]
    async fn test_save_entry_rejects_negative_score() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        let mut entry = create_test_entry(-1000.0);
        entry.score = -1000.0;
        
        let result = service.save_entry(entry).await;
        assert!(result.is_err(), "Should reject negative score");
    }
    
    #[tokio::test]
    async fn test_get_leaderboard_sorted_by_score() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        // Add entries in random order
        for score in &[3000.0, 5000.0, 1000.0, 4000.0, 2000.0] {
            service.save_entry(create_test_entry(*score)).await.unwrap();
        }
        
        let leaderboard = service.get_leaderboard(None, None).await.unwrap();
        
        assert_eq!(leaderboard.len(), 5);
        assert_eq!(leaderboard[0].score, 5000.0);
        assert_eq!(leaderboard[1].score, 4000.0);
        assert_eq!(leaderboard[4].score, 1000.0);
    }
    
    #[tokio::test]
    async fn test_get_leaderboard_with_limit() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        for score in &[3000.0, 5000.0, 1000.0] {
            service.save_entry(create_test_entry(*score)).await.unwrap();
        }
        
        let leaderboard = service.get_leaderboard(None, Some(2)).await.unwrap();
        
        assert_eq!(leaderboard.len(), 2);
        assert_eq!(leaderboard[0].score, 5000.0);
        assert_eq!(leaderboard[1].score, 3000.0);
    }
    
    #[tokio::test]
    async fn test_get_player_best_score() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        service.save_entry(create_test_entry(3000.0)).await.unwrap();
        service.save_entry(create_test_entry(5000.0)).await.unwrap();
        service.save_entry(create_test_entry(4000.0)).await.unwrap();
        
        let best = service.get_player_best_score("player_001", None).await.unwrap();
        
        assert!(best.is_some());
        assert_eq!(best.unwrap().score, 5000.0);
    }
    
    #[tokio::test]
    async fn test_get_player_rank() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        let mut entry1 = create_test_entry(3000.0);
        entry1.player_id = "player_001".to_string();
        
        let mut entry2 = create_test_entry(5000.0);
        entry2.player_id = "player_002".to_string();
        
        let mut entry3 = create_test_entry(4000.0);
        entry3.player_id = "player_003".to_string();
        
        service.save_entry(entry1).await.unwrap();
        service.save_entry(entry2).await.unwrap();
        service.save_entry(entry3).await.unwrap();
        
        let rank = service.get_player_rank("player_001", None).await.unwrap();
        
        assert_eq!(rank, Some(3)); // 3rd place
    }
    
    #[tokio::test]
    async fn test_validate_score_invalid_accuracy() {
        let service = create_test_service("/tmp");
        
        let mut entry = create_test_entry(1000.0);
        entry.accuracy = Some(1.5); // Invalid: > 1.0
        
        assert!(!service.validate_score(&entry));
    }
    
    #[tokio::test]
    async fn test_validate_score_invalid_notes() {
        let service = create_test_service("/tmp");
        
        let mut entry = create_test_entry(1000.0);
        entry.notes_hit = Some(150);
        entry.notes_total = Some(100); // Invalid: hit > total
        
        assert!(!service.validate_score(&entry));
    }
    
    #[tokio::test]
    async fn test_persistence_to_disk() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        service.initialize().await.unwrap();
        
        service.save_entry(create_test_entry(5000.0)).await.unwrap();
        
        // Verify file exists
        let leaderboard_path = temp_dir.path().join("leaderboard.json");
        assert!(leaderboard_path.exists());
        
        // Load from disk and verify
        let contents = fs::read_to_string(&leaderboard_path).await.unwrap();
        let entries: Vec<LeaderboardEntry> = serde_json::from_str(&contents).unwrap();
        
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].score, 5000.0);
    }
}

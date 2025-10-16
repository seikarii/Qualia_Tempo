//! # Responsibility
//! Persistence services for data storage and leaderboard management.
//!
//! ---
//!
//! This module contains services for persistent data storage, including
//! leaderboard entries and player statistics.

pub mod leaderboard;

pub use leaderboard::{
    PersistenceService,
    IPersistenceService,
    PersistenceConfig,
    LeaderboardEntry,
};

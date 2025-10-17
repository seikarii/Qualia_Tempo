//! # Responsibility
//! Persistence services module aggregator.
//!
//! ---
//!
//! Exports all persistence services (leaderboard, database interactions).

pub mod leaderboard;

pub use leaderboard::LeaderboardService;

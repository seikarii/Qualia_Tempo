//! # Responsibility
//! Defines all shared data structures for communication between frontend and backend.
//!
//! ---
//!
//! This module contains the core contracts (QualiaState, PlayerState, BossState, etc.)
//! that are serialized over WebSocket connections. All structs implement Serde
//! traits for JSON serialization and JsonSchema for documentation generation.

pub mod game_state;
pub mod input;

pub use game_state::*;
pub use input::*;

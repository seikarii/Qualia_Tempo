//! # Responsibility
//! Defines all shared data structures for communication between backend and frontend.
//!
//! ---
//!
//! This module contains the core contracts (QualiaState, PlayerState, GameState)
//! that are serialized over WebSocket connections. All structs implement Serde
//! traits for JSON serialization and JsonSchema for documentation generation.

pub mod game_state;
pub mod combat_data;
pub mod audio;
pub mod particles;
pub mod input;
pub mod effects;
pub mod settings;
pub mod leaderboard;

pub use game_state::*;
pub use combat_data::*;
pub use audio::*;
pub use particles::*;
pub use input::*;
pub use effects::*;
pub use settings::*;
pub use leaderboard::*;

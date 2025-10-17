//! # Responsibility
//! Re-exports all contract modules for easy access.

pub mod game_state;
pub mod input;
pub mod combat_data;
pub mod audio;
pub mod effects;
pub mod settings;
pub mod leaderboard;

pub use game_state::*;
pub use input::*;
pub use combat_data::*;
pub use audio::*;
pub use effects::*;
pub use settings::*;
pub use leaderboard::*;

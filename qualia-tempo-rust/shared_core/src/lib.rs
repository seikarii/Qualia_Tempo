//! # Responsibility
//! Provides shared contracts, traits, events, and utilities for Qualia Tempo.
//!
//! ---
//!
//! This crate contains all data structures and interfaces shared between the
//! backend and frontend. All structs implement Serde traits for serialization
//! and JsonSchema for documentation generation.
//!
//! ## Module Organization
//!
//! - `contracts` - Data structures (game state, combat data, settings, etc.)
//! - `events` - Event definitions for the EventBus
//! - `traits` - Shared trait interfaces (ILogger, IEventBus, IBaseService)
//! - `utils` - Utility functions (math, validation, etc.)
//!
//! ## Compliance
//!
//! All types comply with QUALIA.CODE.RUST v1.1:
//! - Serialize/Deserialize/JsonSchema derives
//! - `#[serde(rename_all = "camelCase")]` for JavaScript interop
//! - `# Responsibility` docstrings on all public types
//! - Validation using the validator crate where appropriate

pub mod contracts;
pub mod events;
pub mod traits;
pub mod utils;

// Re-export public types for convenience
pub use contracts::game_state::*;
pub use contracts::combat_data::*;
pub use contracts::audio::*;
pub use contracts::input::*;
pub use contracts::effects::*;
pub use contracts::settings::*;
pub use contracts::leaderboard::*;
pub use events::game_events::*;
pub use traits::*;
pub use utils::math::*;

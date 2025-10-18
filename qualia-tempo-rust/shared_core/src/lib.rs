//! # Responsibility
//! Provides shared contracts, traits, and utilities for Qualia Tempo.
//!
//! ---
//!
//! This crate defines all data structures (contracts), event definitions,
//! and service interfaces (traits) shared between backend and frontend.
//! It is the single source of truth for type definitions.

#![allow(clippy::doc_markdown)]
#![allow(deprecated)]

pub mod contracts;
pub mod events;
pub mod traits;
pub mod utils;

// Re-export commonly used types for convenience
pub use contracts::{
    game_state::{BossState, CombatState, GamePhase, PlayerState, QualiaState},
    input::PlayerAction,
};
pub use events::GameEvent;
pub use traits::{IBaseService, IEventBus, ILogger, LoadableConfig};
pub use utils::{clamp, lerp, Vec2, Vec3};

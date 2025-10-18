//! # Responsibility
//! Shared library containing all data contracts, events, and trait interfaces.
//!
//! ---
//!
//! This crate is the source of truth for all types shared between backend and frontend.
//! It follows the "Rust-First" paradigm: these structs define the contracts,
//! and JSON schemas are generated from them (not vice versa).
//!
//! # Architecture Compliance
//! - All public structs derive Serialize, Deserialize, `JsonSchema` (QUALIA.CODE.RUST §5.1)
//! - All enums use `#[serde(tag = "type")]` for type-safe JSON (QUALIA.CODE.RUST §5.2)
//! - All modules have `# Responsibility` docstrings (QUALIA.CODE.RUST §1.1)

pub mod contracts;
pub mod events;
pub mod traits;
pub mod utils;

// Re-export primary types for convenience
pub use contracts::{
    BossState, CombatState, GameStatus, PlayerAction, PlayerState, QualiaEvent, QualiaState,
};
pub use events::GameEvent;
pub use traits::{IEventBus, ILogger};
pub use utils::{clamp, lerp, Vec2, Vec3};

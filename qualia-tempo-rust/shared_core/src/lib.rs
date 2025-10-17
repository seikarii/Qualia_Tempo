//! # Responsibility
//! Central library for shared contracts, events, and traits used across backend and frontend.
//!
//! ---
//!
//! This crate is the single source of truth for all data structures and interfaces
//! in Qualia Tempo. It ensures type safety and consistency across the entire system.
//!
//! ## Module Organization
//!
//! - **contracts**: Data structures (QualiaState, PlayerState, CombatState, etc.)
//! - **events**: Event definitions for EventBus communication
//! - **traits**: Shared trait interfaces (ILogger, IEventBus, etc.)
//! - **utils**: Utility functions and helper types

#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]

pub mod contracts;
pub mod events;
pub mod traits;
pub mod utils;

// Re-export commonly used types at crate root for convenience
pub use contracts::{
    QualiaState, PlayerState, BossState, CombatState,
    Vec2, GamePhase, PlayerAction,
};
pub use events::GameEvent;
pub use traits::{ILogger, IEventBus, IBaseService};

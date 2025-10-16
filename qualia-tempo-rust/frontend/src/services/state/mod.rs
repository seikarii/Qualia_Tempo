//! # Responsibility
//! State management services for merging and transforming game state.
//!
//! ---
//!
//! Provides state reconciliation (frontend prediction vs backend authority)
//! and view transformation (game state → UI-specific data).

pub mod state_merger;
pub mod view_logic;

pub use state_merger::*;
pub use view_logic::*;

//! # Responsibility
//! Shared core library providing contracts, events, traits, and utilities.
//!
//! ---
//!
//! This crate contains all shared types and interfaces used by both backend
//! and frontend. It is the single source of truth for data structures.

pub mod contracts;
pub mod events;
pub mod traits;
pub mod utils;

// Re-export commonly used types
pub use contracts::*;
pub use events::*;
pub use traits::*;
pub use utils::*;

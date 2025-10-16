//! # Responsibility
//! Provides shared data structures, events, and trait interfaces for Qualia Tempo.
//!
//! ---
//!
//! This crate contains all contracts used for communication between backend and
//! frontend, as well as trait definitions for service interfaces. All structs
//! implement Serde for JSON/binary serialization and JsonSchema for documentation.

#![warn(missing_docs)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]

pub mod contracts;
pub mod events;
pub mod traits;
pub mod utils;

// Re-export commonly used types
pub use contracts::*;
pub use events::*;
pub use traits::*;
pub use utils::*;

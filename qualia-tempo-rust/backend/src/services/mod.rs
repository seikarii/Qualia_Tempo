//! # Responsibility
//! Aggregates all service implementations.
//!
//! ---
//!
//! This module re-exports all services from infrastructure, gameplay, and network submodules.
//! Follows Clean Architecture pattern with clear separation of concerns.

pub mod infrastructure;
pub mod gameplay;
pub mod network;
pub mod audio;
pub mod rendering;
pub mod persistence;
pub mod security;

#[cfg(test)]
pub mod tests;

pub use infrastructure::*;
pub use gameplay::*;
pub use network::*;
pub use audio::*;
pub use rendering::*;
pub use persistence::*;
pub use security::*;

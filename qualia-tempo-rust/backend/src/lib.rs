//! # Responsibility
//! Backend library exports for testing and integration.
//!
//! ---
//!
//! This library crate exposes all backend modules for integration testing.
//! The binary crate (main.rs) uses this library.

pub mod services;
pub mod config;

// Re-export for convenience
pub use services::GameModule;

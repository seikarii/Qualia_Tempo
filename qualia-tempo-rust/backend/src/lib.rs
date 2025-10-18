//! # Responsibility
//! Backend library crate for Qualia Tempo.
//!
//! ---
//!
//! This crate provides all backend functionality including services, handlers,
//! and configuration management. Used by main.rs and tests.

pub mod services;
pub mod config;
pub mod handlers;

// Re-export commonly used items
pub use services::*;
pub use config::*;

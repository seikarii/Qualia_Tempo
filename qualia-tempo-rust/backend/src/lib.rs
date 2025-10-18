//! # Responsibility
//! Backend server library for Qualia Tempo.
//!
//! ---
//!
//! This crate provides the server-side game logic, networking,
//! and state management for Qualia Tempo.

#![allow(clippy::doc_markdown)]

pub mod config;
pub mod services;
pub mod utils;

// Re-export core services for convenience
pub use services::core::{EventBusService, QualiaLogger, TimerService};

// Re-export config types
pub use config::{GameLogicConfig, ServerConfig, load_config};

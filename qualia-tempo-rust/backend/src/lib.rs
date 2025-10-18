//! # Responsibility
//! Backend server library for Qualia Tempo.
//!
//! ---
//!
//! This crate provides the server-side game logic, networking,
//! and state management for Qualia Tempo.

#![allow(clippy::doc_markdown)]

pub mod services;

// Re-export core services for convenience
pub use services::core::{EventBusService, QualiaLogger, TimerService};

//! # Responsibility
//! Configuration loading and management for backend services.
//!
//! ---
//!
//! All service configurations are defined here and loaded from YAML files
//! at application startup.

pub mod game_logic;

pub use game_logic::GameLogicConfig;

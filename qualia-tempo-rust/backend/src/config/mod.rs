//! # Responsibility
//! Configuration loading and management for the backend.
//!
//! ---
//!
//! All configuration is loaded from YAML files at startup and injected
//! as immutable references through Shaku DI. No runtime mutation allowed.

pub mod loader;
pub mod server;
pub mod game_logic;

pub use loader::load_config;
pub use server::ServerConfig;
pub use game_logic::GameLogicConfig;

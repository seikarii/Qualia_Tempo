//! # Responsibility
//! Configuration loading and management for backend services.
//!
//! ---
//!
//! All service configurations are defined here and loaded from YAML files
//! at application startup.

pub mod game_logic;
pub mod boss_ai;
pub mod server;
pub mod loader;

pub use game_logic::GameLogicConfig;
pub use boss_ai::BossAIConfig;
pub use server::ServerConfig;
pub use loader::load_config;

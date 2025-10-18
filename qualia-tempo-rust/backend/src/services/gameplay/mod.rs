//! # Responsibility
//! Provides all gameplay-related service implementations.
//!
//! ---
//!
//! Contains core gameplay logic, validation, boss AI, and pattern systems.

pub mod boss_ai;
pub mod combat_orchestrator;
pub mod game_logic;
pub mod pattern_system;
pub mod qualia_validator;

// Re-export public APIs
pub use boss_ai::BossAIService;
pub use combat_orchestrator::CombatOrchestratorService;
pub use game_logic::GameLogicService;
pub use pattern_system::PatternSystemService;
pub use qualia_validator::QualiaValidatorService;

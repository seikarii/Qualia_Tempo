//! # Responsibility
//! Gameplay services implementing core game mechanics.
//!
//! ---
//!
//! This module contains services for game logic, boss AI, pattern systems,
//! combat orchestration, and qualia calculation.

pub mod game_logic;
pub mod boss_ai;
pub mod pattern_system;
pub mod qualia_processor;
pub mod combat_orchestrator;

pub use game_logic::GameLogicService;
pub use boss_ai::BossAIService;
pub use pattern_system::PatternSystemService;
pub use qualia_processor::QualiaProcessorService;
pub use combat_orchestrator::CombatOrchestratorService;

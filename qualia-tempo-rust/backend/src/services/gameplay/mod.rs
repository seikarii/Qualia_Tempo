//! # Responsibility
//! Gameplay services module aggregator.
//!
//! ---
//!
//! Exports all gameplay-related services:
//! - GameLogicService: Core game rules and calculations
//! - BossAIService: Boss AI decision-making
//! - PatternSystemService: Boss attack pattern management
//! - QualiaProcessorService: Qualia state calculations
//! - CombatOrchestratorService: Combat coordination

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

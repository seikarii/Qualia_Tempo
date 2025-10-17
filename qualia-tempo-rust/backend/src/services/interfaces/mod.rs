//! # Responsibility
//! Service trait interfaces module aggregator.
//!
//! ---
//!
//! Exports all service trait interfaces for dependency injection with Shaku.

// Core interfaces
pub mod i_logger;
pub mod i_event_bus;

// Monitoring interfaces
pub mod i_metrics;
pub mod i_performance;

// Gameplay interfaces
pub mod i_game_logic;
pub mod i_boss_ai;
pub mod i_pattern_system;
pub mod i_qualia_processor;
pub mod i_combat_orchestrator;

// Re-exports
pub use i_logger::ILogger;
pub use i_event_bus::IEventBus;
pub use i_metrics::IMetrics;
pub use i_performance::IPerformance;
pub use i_game_logic::IGameLogicService;
pub use i_boss_ai::IBossAIService;
pub use i_pattern_system::IPatternSystemService;
pub use i_qualia_processor::IQualiaProcessorService;
pub use i_combat_orchestrator::ICombatOrchestratorService;

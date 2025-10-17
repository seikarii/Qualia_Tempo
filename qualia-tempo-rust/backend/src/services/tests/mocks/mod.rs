//! # Responsibility
//! Contains mock implementations for all service interfaces.

pub mod logger;
pub mod event_bus;
pub mod metrics;
pub mod performance;
pub mod game_logic;
pub mod boss_ai;
pub mod pattern_system;
pub mod qualia_processor;
pub mod combat_orchestrator;
pub mod websocket;

pub use logger::MockLogger;
pub use event_bus::MockEventBus;
pub use metrics::MockMetricsService;
pub use performance::MockPerformanceService;
pub use game_logic::MockGameLogicService;
pub use boss_ai::MockBossAIService;
pub use pattern_system::MockPatternSystemService;
pub use qualia_processor::MockQualiaProcessorService;
pub use combat_orchestrator::MockCombatOrchestratorService;
pub use websocket::MockWebSocketService;

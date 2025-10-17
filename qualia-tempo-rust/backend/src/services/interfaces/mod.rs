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

// Infrastructure interfaces
pub mod i_websocket;
pub mod i_state_streaming;
pub mod i_particle_pool;
pub mod i_shader_introspection;
pub mod i_auth;
pub mod i_validation;

// Backend remaining interfaces
pub mod i_leaderboard;
pub mod i_health_check;
pub mod i_filesystem;
pub mod i_environment;
pub mod i_gameplay_mechanics;
pub mod i_harmony_analysis;

// Re-export all interface traits
pub use i_event_bus::IEventBus;
pub use i_logger::ILogger;
pub use i_metrics::IMetricsService;
pub use i_performance::IPerformanceService;

// Gameplay interfaces
pub use i_game_logic::IGameLogicService;
pub use i_boss_ai::IBossAIService;
pub use i_pattern_system::IPatternSystemService;
pub use i_qualia_processor::IQualiaProcessorService;
pub use i_combat_orchestrator::ICombatOrchestratorService;

// Infrastructure interfaces
pub use i_websocket::IWebSocketService;
pub use i_state_streaming::IStateStreamingService;
pub use i_particle_pool::{IParticlePoolService, ParticleUpdateJob, ParticleUpdateResult};
pub use i_shader_introspection::{IShaderIntrospectionService, UniformBufferLayout, UniformField};
pub use i_auth::{IAuthService, Role, Session};
pub use i_validation::{IValidationService, ValidationResult};

// Backend remaining interfaces
pub use i_leaderboard::{ILeaderboardService, LeaderboardEntry, LeaderboardQuery};
pub use i_health_check::{IHealthCheckService, HealthStatus};
pub use i_filesystem::IFileSystemService;
pub use i_environment::{IEnvironmentService, Environment};
pub use i_gameplay_mechanics::IGameplayMechanicsService;
pub use i_harmony_analysis::{IHarmonyAnalysisService, MusicalNote, HarmonyMap};

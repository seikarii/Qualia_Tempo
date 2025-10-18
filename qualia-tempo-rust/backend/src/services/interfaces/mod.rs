//! # Responsibility
//! Re-exports all service interface traits.
//!
//! ---
//!
//! This module provides a central access point for all trait interfaces used
//! by the backend services, enforcing dependency inversion principle.

pub mod i_logger;
pub mod i_event_bus;
pub mod i_timer;
pub mod i_game_logic;
pub mod i_error_reporter;

pub use i_logger::ILogger;
pub use i_event_bus::IEventBus;
pub use i_timer::ITimer;
pub use i_game_logic::IGameLogicService;
pub use i_error_reporter::IErrorReporter;

// Re-export traits from shared_core for convenience
pub use shared_core::traits::{
    IBossAIService, ICombatOrchestratorService, IPatternSystemService, IQualiaProcessorService,
};

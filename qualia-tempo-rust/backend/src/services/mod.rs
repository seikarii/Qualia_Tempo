//! # Responsibility
//! Aggregates all backend services and their interfaces.
//!
//! ---
//!
//! This module provides centralized access to all service implementations
//! and their trait definitions, following the dependency inversion principle.

pub mod interfaces;
pub mod core;
pub mod gameplay;
pub mod networking;

#[cfg(test)]
pub mod tests;

// Re-export interfaces for convenience
pub use interfaces::{ILogger, IEventBus, ITimer, IGameLogicService};
pub use shared_core::traits::{IBossAIService, IPatternSystemService, IQualiaProcessorService, IWebSocketService, IGameStateStreamingService, IConnectionManagerService};

// Re-export core services
pub use core::{EventBusService, QualiaLogger, TimerService, ErrorReportingService};

// Re-export gameplay services
pub use gameplay::{GameLogicService, BossAIService, PatternSystemService, QualiaProcessorService};

// Re-export networking services
pub use networking::{WebSocketService, GameStateStreamingService, ConnectionManagerService};

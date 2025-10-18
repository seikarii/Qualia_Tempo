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

#[cfg(test)]
pub mod tests;

// Re-export interfaces for convenience
pub use interfaces::{ILogger, IEventBus, ITimer, IGameLogicService};

// Re-export core services
pub use core::{EventBusService, QualiaLogger, TimerService, ErrorReportingService, IErrorReporter};

// Re-export gameplay services
pub use gameplay::GameLogicService;

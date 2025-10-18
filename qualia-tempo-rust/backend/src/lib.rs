//! # Responsibility
//! Backend library exports for testing and modular access.
//!
//! ---
//!
//! This library crate exposes all backend services, allowing them to be
//! tested independently and used by integration test modules.

pub mod services;

// Re-export for convenience
pub use services::{
    ILogger, IEventBus, ITimer, IErrorReporter,
    EventBusService, QualiaLogger, TimerService, ErrorReportingService,
};

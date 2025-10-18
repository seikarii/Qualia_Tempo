//! # Responsibility
//! Re-exports all core infrastructure services.
//!
//! ---
//!
//! Core services are the foundational layer of the backend, providing
//! logging, event distribution, timing, and error reporting capabilities.

pub mod event_bus;
pub mod logger;
pub mod timer;
pub mod error_reporter;

pub use event_bus::EventBusService;
pub use logger::QualiaLogger;
pub use timer::TimerService;
pub use error_reporter::ErrorReportingService;

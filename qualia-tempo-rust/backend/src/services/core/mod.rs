//! # Responsibility
//! Core infrastructure services for the backend.
//!
//! ---
//!
//! This module contains foundational services that all other services depend on:
//! - `EventBusService`: Lock-free event distribution (`tokio::sync::broadcast`)
//! - `QualiaLogger`: Structured logging wrapper (tracing)
//! - `TimerService`: High-precision timing (`std::time::Instant`)
//! - `ErrorReportingService`: Centralized error tracking

pub mod event_bus;
pub mod logger;
pub mod timer;
pub mod error_reporter;

pub use event_bus::EventBusService;
pub use logger::QualiaLogger;
pub use timer::TimerService;
pub use error_reporter::{ErrorReportingService, IErrorReporter};

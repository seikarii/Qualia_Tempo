//! # Responsibility
//! Core infrastructure services for the backend.
//!
//! ---
//!
//! This module contains fundamental services used by all other services:
//! - EventBusService: Lock-free event distribution
//! - QualiaLogger: Structured logging
//! - TimerService: Timing utilities
//! - ErrorReportingService: Centralized error tracking

pub mod error_reporter;
pub mod event_bus;
pub mod logger;
pub mod timer;

pub use error_reporter::ErrorReportingService;
pub use event_bus::EventBusService;
pub use logger::QualiaLogger;
pub use timer::TimerService;

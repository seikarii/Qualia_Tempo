//! # Responsibility
//! Defines the `ILogger` trait interface for structured logging.
//!
//! ---
//!
//! All logging in the application goes through this interface. Implementations
//! should wrap the tracing crate for structured, filterable output.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
///
/// ---
///
/// Implemented by `QualiaLogger` in services/core/logger.rs, which wraps the
/// tracing crate for production-grade observability.
pub trait ILogger: Interface {
    /// Log informational message
    fn info(&self, message: &str);

    /// Log warning message
    fn warn(&self, message: &str);

    /// Log error message
    fn error(&self, message: &str);

    /// Log debug message (filtered out in release)
    fn debug(&self, message: &str);
}

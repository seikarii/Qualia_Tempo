//! # Responsibility
//! Defines the logging interface for structured application logging.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
///
/// ---
///
/// Implemented by `QualiaLogger` in backend/frontend, which wraps the tracing crate.
/// All services should depend on this trait, never on concrete loggers.
pub trait ILogger: Interface {
    /// Log an informational message
    fn info(&self, message: &str);

    /// Log a warning message
    fn warn(&self, message: &str);

    /// Log an error message
    fn error(&self, message: &str);

    /// Log a debug message (filtered in production)
    fn debug(&self, message: &str);
}

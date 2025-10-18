//! # Responsibility
//! Defines the ILogger trait for structured logging.
//!
//! ---
//!
//! Implemented by QualiaLogger in backend/frontend, wrapping tracing crate.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
///
/// ---
///
/// Implemented by QualiaLogger which wraps the tracing crate.
/// All services inject Arc<dyn ILogger> for logging capabilities.
pub trait ILogger: Interface {
    /// Log informational message
    fn info(&self, message: &str);

    /// Log warning message
    fn warn(&self, message: &str);

    /// Log error message
    fn error(&self, message: &str);

    /// Log debug message (filtered in release builds)
    fn debug(&self, message: &str);
}

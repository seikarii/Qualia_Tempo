//! # Responsibility
//! Defines the ILogger trait for structured logging.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
///
/// ---
///
/// All services should inject this trait for logging operations. The
/// implementation (QualiaLogger) forwards to the tracing crate.
pub trait ILogger: Interface {
    /// Log informational message.
    fn info(&self, message: &str);
    
    /// Log warning message.
    fn warn(&self, message: &str);
    
    /// Log error message.
    fn error(&self, message: &str);
    
    /// Log debug message.
    fn debug(&self, message: &str);
}

//! # Responsibility
//! Defines the ILogger trait for structured logging across the application.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging interface for all services.
///
/// ---
///
/// Implementations forward to tracing crate for unified observability.
/// All services should inject Arc<dyn ILogger> instead of calling
/// tracing macros directly to enable testing with mocks.
pub trait ILogger: Interface {
    /// Logs an informational message
    fn info(&self, message: &str);
    
    /// Logs a warning message
    fn warn(&self, message: &str);
    
    /// Logs an error message
    fn error(&self, message: &str);
    
    /// Logs a debug message
    fn debug(&self, message: &str);
    
    /// Logs a trace message
    fn trace(&self, message: &str);
}

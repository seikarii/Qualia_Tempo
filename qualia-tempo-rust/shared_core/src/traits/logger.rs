//! # Responsibility
//! Defines the logging interface trait.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
///
/// ---
///
/// All services should depend on this trait rather than concrete implementations.
/// This allows for easy testing with mocks and flexibility in logging backends.
pub trait ILogger: Interface {
    /// Log an informational message
    fn info(&self, message: &str);
    
    /// Log a warning message
    fn warn(&self, message: &str);
    
    /// Log an error message
    fn error(&self, message: &str);
    
    /// Log a debug message
    fn debug(&self, message: &str);
    
    /// Log a trace message (most verbose level)
    fn trace(&self, message: &str);
}

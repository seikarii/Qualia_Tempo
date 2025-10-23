//! # Responsibility
//! Logger service interface for structured application logging.
//!
//! ---
//!
//! Provides abstraction over tracing crate to enable:
//! - Dependency injection of logging behavior
//! - High-fidelity mocking in tests
//! - Centralized log filtering and routing
//! - Decoupling from concrete logging implementation

use shaku::Interface;

/// # Responsibility
/// Interface for structured logging operations.
///
/// ---
///
/// All log levels follow standard severity hierarchy:
/// - **trace**: Verbose debugging (disabled in release)
/// - **debug**: Development diagnostics
/// - **info**: General informational messages
/// - **warn**: Recoverable errors or unexpected conditions
/// - **error**: Critical failures requiring attention
pub trait ILogger: Interface {
    /// Log trace-level message (most verbose)
    fn trace(&self, message: &str);
    
    /// Log debug-level message
    fn debug(&self, message: &str);
    
    /// Log info-level message
    fn info(&self, message: &str);
    
    /// Log warning-level message
    fn warn(&self, message: &str);
    
    /// Log error-level message
    fn error(&self, message: &str);
}

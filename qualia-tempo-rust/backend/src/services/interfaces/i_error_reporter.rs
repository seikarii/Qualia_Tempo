//! # Responsibility
//! Defines the `IErrorReporter` interface for centralized error reporting.
//!
//! ---
//!
//! Provides structured error reporting with severity levels for monitoring
//! and debugging across all backend services.

use shaku::Interface;

/// # Responsibility
/// Interface for error reporting across services.
///
/// ---
///
/// Implemented by `ErrorReportingService`. Provides severity-based error
/// reporting (Critical, High, Medium, Low) for structured observability.
pub trait IErrorReporter: Interface {
    /// Report critical error (system-level failure)
    fn report_critical(&self, context: &str, error: &anyhow::Error);
    
    /// Report high-severity error (service failure)
    fn report_high(&self, context: &str, error: &anyhow::Error);
    
    /// Report medium-severity error (recoverable)
    fn report_medium(&self, context: &str, error: &anyhow::Error);
    
    /// Report low-severity error (expected/validation)
    fn report_low(&self, context: &str, message: &str);
}

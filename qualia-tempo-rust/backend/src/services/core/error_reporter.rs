//! # Responsibility
//! Centralized error reporting and tracking service.
//!
//! ---
//!
//! Aggregates errors from all services, provides structured error logging,
//! and can integrate with external error tracking services (e.g., Sentry).

use shaku::Component;
use tracing::{error, warn, info};
use std::sync::Arc;
use crate::services::interfaces::ILogger;

/// # Responsibility
/// Manages error reporting and tracking across the application.
///
/// ---
///
/// This service provides centralized error handling with structured logging.
/// Future integrations can include external monitoring services like Sentry
/// or custom telemetry backends.
///
/// # Error Severity Levels
/// - Critical: System-level failures requiring immediate attention
/// - High: Service failures affecting core functionality
/// - Medium: Recoverable errors with degraded functionality
/// - Low: Expected errors (e.g., validation failures)
#[derive(Component)]
#[shaku(interface = IErrorReporter)]
pub struct ErrorReportingService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

impl ErrorReportingService {
    /// Report a critical error (system-level failure)
    pub fn report_critical(&self, context: &str, error: &anyhow::Error) {
        error!("CRITICAL ERROR - {context}: {error:?}");
        self.logger.error(&format!("CRITICAL: {context} - {error}"));
    }

    /// Report a high-severity error (service failure)
    pub fn report_high(&self, context: &str, error: &anyhow::Error) {
        error!("HIGH SEVERITY ERROR - {context}: {error:?}");
        self.logger.error(&format!("HIGH: {context} - {error}"));
    }

    /// Report a medium-severity error (recoverable)
    pub fn report_medium(&self, context: &str, error: &anyhow::Error) {
        warn!("MEDIUM SEVERITY ERROR - {context}: {error:?}");
        self.logger.warn(&format!("MEDIUM: {context} - {error}"));
    }

    /// Report a low-severity error (expected/validation)
    pub fn report_low(&self, context: &str, message: &str) {
        info!("LOW SEVERITY ERROR - {context}: {message}");
        self.logger.info(&format!("LOW: {context} - {message}"));
    }
}

/// # Responsibility
/// Interface for error reporting across services.
pub trait IErrorReporter: shaku::Interface {
    /// Report critical error
    fn report_critical(&self, context: &str, error: &anyhow::Error);
    
    /// Report high-severity error
    fn report_high(&self, context: &str, error: &anyhow::Error);
    
    /// Report medium-severity error
    fn report_medium(&self, context: &str, error: &anyhow::Error);
    
    /// Report low-severity error
    fn report_low(&self, context: &str, message: &str);
}

impl IErrorReporter for ErrorReportingService {
    fn report_critical(&self, context: &str, error: &anyhow::Error) {
        self.report_critical(context, error);
    }

    fn report_high(&self, context: &str, error: &anyhow::Error) {
        self.report_high(context, error);
    }

    fn report_medium(&self, context: &str, error: &anyhow::Error) {
        self.report_medium(context, error);
    }

    fn report_low(&self, context: &str, message: &str) {
        self.report_low(context, message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::logger::QualiaLogger;

    fn create_test_error_reporter() -> ErrorReportingService {
        ErrorReportingService {
            logger: Arc::new(QualiaLogger::new()),
        }
    }

    #[test]
    fn test_error_reporter_critical() {
        let reporter = create_test_error_reporter();
        let error = anyhow::anyhow!("Test critical error");
        
        // Should not panic
        reporter.report_critical("Test Context", &error);
    }

    #[test]
    fn test_error_reporter_all_levels() {
        let reporter = create_test_error_reporter();
        let error = anyhow::anyhow!("Test error");
        
        reporter.report_critical("Critical Test", &error);
        reporter.report_high("High Test", &error);
        reporter.report_medium("Medium Test", &error);
        reporter.report_low("Low Test", "Test message");
    }
}

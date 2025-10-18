//! # Responsibility
//! Provides error reporting and tracking functionality.
//!
//! ---
//!
//! Centralizes error logging and provides metrics for error monitoring.

use shaku::Component;
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::traits::{ILogger, IBaseService};

/// # Responsibility
/// Tracks and reports errors throughout the application lifecycle.
#[derive(Component)]
#[shaku(interface = IBaseService)]
pub struct ErrorReportingService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

impl ErrorReportingService {
    /// Report an error with context
    pub fn report_error(&self, error: &anyhow::Error, context: &str) {
        self.logger.error(&format!("[ERROR] {context}: {error:?}"));
    }

    /// Report a warning
    pub fn report_warning(&self, message: &str, context: &str) {
        self.logger.warn(&format!("[WARNING] {context}: {message}"));
    }
}

#[async_trait]
impl IBaseService for ErrorReportingService {
    async fn initialize(&self) -> Result<()> {
        self.logger.info("ErrorReportingService initialized");
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.logger.info("ErrorReportingService shutting down");
        Ok(())
    }

    fn name(&self) -> &'static str {
        "ErrorReportingService"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::mock_logger::MockLogger;

    #[tokio::test]
    async fn test_error_reporter_reports_errors() {
        let mut mock_logger = MockLogger::new();
        
        mock_logger
            .expect_error()
            .times(1)
            .withf(|msg: &str| msg.contains("test error"))
            .return_const(());

        let service = ErrorReportingService {
            logger: Arc::new(mock_logger),
        };

        let error = anyhow::anyhow!("test error");
        service.report_error(&error, "test_context");
    }

    #[tokio::test]
    async fn test_error_reporter_lifecycle() {
        let mut mock_logger = MockLogger::new();
        
        mock_logger.expect_info().return_const(());

        let service = ErrorReportingService {
            logger: Arc::new(mock_logger),
        };

        assert!(service.initialize().await.is_ok());
        assert!(service.shutdown().await.is_ok());
        assert_eq!(service.name(), "ErrorReportingService");
    }
}

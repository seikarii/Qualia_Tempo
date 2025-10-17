//! # Responsibility
//! QualiaLogger implementation wrapping tracing crate.

use shaku::Component;
use shared_core::traits::ILogger;

/// # Responsibility
/// Structured logging service forwarding to tracing macros.
///
/// ---
///
/// This service implements ILogger by delegating to the tracing crate,
/// which provides structured, async-aware logging. All log output is
/// controlled via RUST_LOG environment variable.
#[derive(Component)]
#[shaku(interface = ILogger)]
pub struct QualiaLogger;

impl ILogger for QualiaLogger {
    fn info(&self, message: &str) {
        tracing::info!("{}", message);
    }
    
    fn warn(&self, message: &str) {
        tracing::warn!("{}", message);
    }
    
    fn error(&self, message: &str) {
        tracing::error!("{}", message);
    }
    
    fn debug(&self, message: &str) {
        tracing::debug!("{}", message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tracing_subscriber;

    #[test]
    fn test_logger_creation() {
        let logger = QualiaLogger;
        // Should not panic
        drop(logger);
    }

    #[test]
    fn test_logger_methods_do_not_panic() {
        // Initialize tracing subscriber for test
        let _ = tracing_subscriber::fmt()
            .with_test_writer()
            .try_init();
        
        let logger = QualiaLogger;
        
        // These should not panic (output goes to test writer)
        logger.info("Test info message");
        logger.warn("Test warn message");
        logger.error("Test error message");
        logger.debug("Test debug message");
    }
}

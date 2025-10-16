//! # Responsibility
//! Provides structured logging throughout the backend application.
//!
//! ---
//!
//! This module implements the ILogger trait, forwarding all log calls
//! to the `tracing` crate for unified observability. All log messages
//! are structured and can be exported to various backends (console, file,
//! OpenTelemetry, etc.).

pub use shared_core::traits::ILogger; // Re-export for public access
use shaku::Component;
use tracing::{error, info, warn};

/// # Responsibility
/// Implements structured logging by forwarding to the tracing crate.
///
/// ---
///
/// This is a zero-cost abstraction that allows the application to be
/// decoupled from the concrete logging implementation. In tests, this
/// can be mocked with MockLogger from mockall.
#[derive(Component, Default)]
#[shaku(interface = ILogger)]
pub struct QualiaLogger;

impl ILogger for QualiaLogger {
    fn info(&self, message: &str) {
        info!("{}", message);
    }

    fn warn(&self, message: &str) {
        warn!("{}", message);
    }

    fn error(&self, message: &str) {
        error!("{}", message);
    }

    fn debug(&self, message: &str) {
        tracing::debug!("{}", message);
    }

    fn trace(&self, message: &str) {
        tracing::trace!("{}", message);
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)] // Allow unwrap in tests
mod tests {
    use super::*;
    use tracing_subscriber::fmt::format::FmtSpan;

    #[test]
    fn test_logger_creation() {
        let logger = QualiaLogger;
        // Logger should be created successfully
        // This is a trivial test but ensures Default trait works
        logger.info("Test message");
    }

    #[test]
    fn test_all_log_levels_compile() {
        // USEFUL TEST: Ensures all trait methods are implemented correctly
        // and compile without errors
        let logger = QualiaLogger;

        // Initialize test subscriber to capture logs
        let _guard = tracing_subscriber::fmt()
            .with_test_writer()
            .with_span_events(FmtSpan::CLOSE)
            .try_init();

        logger.trace("trace message");
        logger.debug("debug message");
        logger.info("info message");
        logger.warn("warn message");
        logger.error("error message");

        // If we reach here, all methods work
    }

    #[test]
    fn test_logger_does_not_panic_on_special_characters() {
        // USEFUL TEST: Edge case - special characters in log messages
        let logger = QualiaLogger;

        let _guard = tracing_subscriber::fmt()
            .with_test_writer()
            .try_init();

        // Should not panic with special characters
        logger.info("Message with unicode: 日本語 emojis: 🎵🎮");
        logger.info("Message with newlines:\nLine 2\nLine 3");
        logger.info("Message with quotes: \"quoted\" and 'single'");
        logger.info("Message with brackets: {} [] ()");
    }

    #[test]
    fn test_logger_handles_empty_strings() {
        // USEFUL TEST: Boundary condition - empty messages
        let logger = QualiaLogger;

        let _guard = tracing_subscriber::fmt()
            .with_test_writer()
            .try_init();

        logger.info("");
        logger.warn("");
        logger.error("");
        // Should not panic
    }

    #[test]
    fn test_logger_handles_very_long_messages() {
        // USEFUL TEST: Boundary condition - large messages
        let logger = QualiaLogger;

        let _guard = tracing_subscriber::fmt()
            .with_test_writer()
            .try_init();

        let long_message = "A".repeat(10_000);
        logger.info(&long_message);
        // Should not panic or truncate unexpectedly
    }
}

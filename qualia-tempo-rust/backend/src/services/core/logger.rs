//! # Responsibility
//! Implements structured logging by wrapping the tracing crate.
//!
//! ---
//!
//! All logging goes through tracing for unified observability.

use shared_core::traits::ILogger;
use shaku::Component;
use tracing;

/// # Responsibility
/// Implements ILogger by forwarding all log calls to tracing macros.
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

impl Default for QualiaLogger {
    fn default() -> Self {
        Self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logger_instantiation() {
        let logger = QualiaLogger;
        // Test that logger can be created (compilation test)
        logger.info("Test message");
    }
}

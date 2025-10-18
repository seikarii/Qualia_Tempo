//! # Responsibility
//! Implements structured logging by wrapping the tracing crate.
//!
//! ---
//!
//! Provides a clean interface for logging throughout the application while
//! leveraging tracing's powerful filtering and structured output capabilities.

use crate::services::interfaces::ILogger;
use shaku::Component;
use tracing;

/// # Responsibility
/// Implements `ILogger` by forwarding all logging calls to the tracing crate.
///
/// ---
///
/// This service acts as an adapter, allowing dependency injection of logging
/// capabilities while maintaining compatibility with the tracing ecosystem
/// for observability, filtering, and structured output.
///
/// # Usage
/// Injected into services via Shaku DI:
/// ```ignore
/// #[derive(Component)]
/// pub struct MyService {
///     #[shaku(inject)]
///     logger: Arc<dyn ILogger>,
/// }
/// ```
#[derive(Component, Default)]
#[shaku(interface = ILogger)]
pub struct QualiaLogger;

impl QualiaLogger {
    /// Create a new `QualiaLogger` instance
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

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

    #[test]
    fn test_logger_instantiation() {
        let logger = QualiaLogger::new();
        
        // Should not panic
        logger.info("Test info message");
        logger.warn("Test warning message");
        logger.error("Test error message");
        logger.debug("Test debug message");
    }

    #[test]
    fn test_logger_default() {
        let logger = QualiaLogger::default();
        logger.info("Default logger works");
    }
}

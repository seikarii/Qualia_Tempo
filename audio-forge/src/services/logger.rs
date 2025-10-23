//! # Responsibility
//! Implements ILogger by forwarding to tracing macros.
//!
//! ---
//!
//! This service provides dependency injection-friendly logging
//! by wrapping the tracing crate. All services receive Arc<dyn ILogger>
//! instead of calling tracing macros directly.

use crate::services::interfaces::ILogger;
use shaku::Component;

/// # Responsibility
/// Production logger implementation using tracing crate.
///
/// ---
///
/// Forwards all log calls to tracing macros with appropriate levels.
/// Thread-safe and zero-overhead (tracing's macros compile to no-ops
/// when log level is disabled).
#[derive(Component, Default)]
#[shaku(interface = ILogger)]
pub struct QualiaLogger;

impl ILogger for QualiaLogger {
    #[inline]
    fn trace(&self, message: &str) {
        tracing::trace!("{}", message);
    }
    
    #[inline]
    fn debug(&self, message: &str) {
        tracing::debug!("{}", message);
    }
    
    #[inline]
    fn info(&self, message: &str) {
        tracing::info!("{}", message);
    }
    
    #[inline]
    fn warn(&self, message: &str) {
        tracing::warn!("{}", message);
    }
    
    #[inline]
    fn error(&self, message: &str) {
        tracing::error!("{}", message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_logger_creation() {
        let logger = QualiaLogger;
        
        // Should not panic (tracing subscriber may not be initialized in tests)
        logger.info("Test message");
        logger.warn("Test warning");
        logger.error("Test error");
    }
}

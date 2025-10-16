//! # Responsibility
//! Provides structured logging for the frontend using tracing-wasm.
//!
//! ---
//!
//! Forwards all log calls to tracing macros, which output to browser console.

use shaku::{Component, Interface};

/// # Responsibility
/// Trait interface for logging operations.
pub trait ILogger: Interface + Send + Sync {
    /// Logs an info message
    fn info(&self, message: &str);
    
    /// Logs a warning message
    fn warn(&self, message: &str);
    
    /// Logs an error message
    fn error(&self, message: &str);
    
    /// Logs a debug message
    fn debug(&self, message: &str);
    
    /// Logs a trace message
    fn trace(&self, message: &str);
}

/// # Responsibility
/// Frontend logger that forwards to tracing macros for browser console output.
///
/// ---
///
/// Uses tracing-wasm for WASM-compatible logging.
#[derive(Component, Default)]
#[shaku(interface = ILogger)]
pub struct FrontendLogger;

impl ILogger for FrontendLogger {
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
    
    fn trace(&self, message: &str) {
        tracing::trace!("{}", message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    
    /// # Responsibility
    /// Mock logger for unit tests that captures log messages.
    pub struct MockLogger {
        messages: Arc<Mutex<Vec<String>>>,
    }
    
    impl MockLogger {
        pub fn new() -> Self {
            Self {
                messages: Arc::new(Mutex::new(Vec::new())),
            }
        }
        
        #[allow(dead_code)]
        pub fn get_messages(&self) -> Vec<String> {
            self.messages.lock().unwrap().clone()
        }
    }
    
    impl ILogger for MockLogger {
        fn info(&self, message: &str) {
            self.messages.lock().unwrap().push(format!("INFO: {}", message));
        }
        
        fn warn(&self, message: &str) {
            self.messages.lock().unwrap().push(format!("WARN: {}", message));
        }
        
        fn error(&self, message: &str) {
            self.messages.lock().unwrap().push(format!("ERROR: {}", message));
        }
        
        fn debug(&self, message: &str) {
            self.messages.lock().unwrap().push(format!("DEBUG: {}", message));
        }
        
        fn trace(&self, message: &str) {
            self.messages.lock().unwrap().push(format!("TRACE: {}", message));
        }
    }
    
    #[test]
    fn test_logger_creation() {
        let logger = FrontendLogger;
        logger.info("Test message");
        logger.warn("Warning message");
        logger.error("Error message");
        logger.debug("Debug message");
        logger.trace("Trace message");
        // No panics = success
    }
    
    #[test]
    fn test_mock_logger() {
        let logger = MockLogger::new();
        logger.info("Info test");
        logger.warn("Warn test");
        logger.error("Error test");
        
        let messages = logger.get_messages();
        assert_eq!(messages.len(), 3);
        assert!(messages[0].contains("INFO: Info test"));
        assert!(messages[1].contains("WARN: Warn test"));
        assert!(messages[2].contains("ERROR: Error test"));
    }
}

// Re-export MockLogger for use in other test modules
#[cfg(test)]
pub use tests::MockLogger;

//! # Responsibility
//! Mock implementation of ILogger for testing.

use std::sync::{Arc, Mutex};
use shared_core::ILogger;

/// # Responsibility
/// Mock logger that captures log messages for test assertions.
pub struct MockLogger {
    messages: Arc<Mutex<Vec<String>>>,
}

impl MockLogger {
    /// # Responsibility
    /// Creates a new mock logger.
    pub fn new() -> Self {
        Self {
            messages: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    /// # Responsibility
    /// Gets all captured log messages.
    pub fn get_messages(&self) -> Vec<String> {
        self.messages.lock().unwrap().clone()
    }
    
    /// # Responsibility
    /// Clears all captured messages.
    pub fn clear(&self) {
        self.messages.lock().unwrap().clear();
    }
}

impl ILogger for MockLogger {
    fn info(&self, message: &str) {
        self.messages.lock().unwrap().push(format!("[INFO] {}", message));
    }
    
    fn warn(&self, message: &str) {
        self.messages.lock().unwrap().push(format!("[WARN] {}", message));
    }
    
    fn error(&self, message: &str) {
        self.messages.lock().unwrap().push(format!("[ERROR] {}", message));
    }
    
    fn debug(&self, message: &str) {
        self.messages.lock().unwrap().push(format!("[DEBUG] {}", message));
    }
    
    fn trace(&self, message: &str) {
        self.messages.lock().unwrap().push(format!("[TRACE] {}", message));
    }
}

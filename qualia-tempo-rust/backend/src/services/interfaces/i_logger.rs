//! # Responsibility
//! Logger trait interface for structured logging.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
pub trait ILogger: Interface {
    fn info(&self, message: &str);
    fn warn(&self, message: &str);
    fn error(&self, message: &str);
    fn debug(&self, message: &str);
}

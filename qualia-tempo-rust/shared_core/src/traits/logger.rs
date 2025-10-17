//! # Responsibility
//! Defines the logger trait interface.

use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
///
/// ---
///
/// Implementations should forward to tracing crate for unified observability.
pub trait ILogger: Interface {
    fn info(&self, message: &str);
    fn warn(&self, message: &str);
    fn error(&self, message: &str);
    fn debug(&self, message: &str);
}

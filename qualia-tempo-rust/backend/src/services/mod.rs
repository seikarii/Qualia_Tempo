//! # Responsibility
//! Service layer for backend business logic.
//!
//! ---
//!
//! All service implementations organized by category:
//! - core: Infrastructure services (EventBus, Logger, Timer, ErrorReporter)
//! - lifecycle: Application lifecycle management
//! - interfaces: Service trait definitions

pub mod core;
pub mod interfaces;
pub mod lifecycle;

#[cfg(test)]
pub mod tests;

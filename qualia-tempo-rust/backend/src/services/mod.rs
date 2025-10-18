//! # Responsibility
//! Service layer for backend business logic.
//!
//! ---
//!
//! All service implementations organized by category:
//! - core: Infrastructure services (EventBus, Logger, Timer)
//! - interfaces: Service trait definitions

pub mod core;
pub mod interfaces;

#[cfg(test)]
pub mod tests;

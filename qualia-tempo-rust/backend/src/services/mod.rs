//! # Responsibility
//! Service layer for backend business logic.
//!
//! ---
//!
//! All service implementations organized by category:
//! - audio: Harmony analysis for generative music
//! - core: Infrastructure services (EventBus, Logger, Timer, ErrorReporter)
//! - gameplay: Game logic, validation, AI, patterns
//! - lifecycle: Application lifecycle management
//! - interfaces: Service trait definitions

pub mod audio;
pub mod core;
pub mod gameplay;
pub mod interfaces;
pub mod lifecycle;

#[cfg(test)]
pub mod tests;

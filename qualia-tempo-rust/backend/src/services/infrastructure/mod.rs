//! # Responsibility
//! Core infrastructure services that are fundamental to the backend's operation.
//!
//! ---
//!
//! This module contains the EventBusService (lock-free event distribution)
//! and QualiaLogger (structured logging), which are dependencies for most
//! other services in the system.

pub mod event_bus;
pub mod logger;

pub use event_bus::{EventBusService, IEventBus};
pub use logger::{QualiaLogger, ILogger};

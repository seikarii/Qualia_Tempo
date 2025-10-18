//! # Responsibility
//! Re-exports all service interface traits.
//!
//! ---
//!
//! This module provides a central access point for all trait interfaces used
//! by the backend services, enforcing dependency inversion principle.

pub mod i_logger;
pub mod i_event_bus;
pub mod i_timer;

pub use i_logger::ILogger;
pub use i_event_bus::IEventBus;
pub use i_timer::ITimer;

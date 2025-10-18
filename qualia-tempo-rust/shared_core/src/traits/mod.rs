//! # Responsibility
//! Aggregates all service trait interface definitions.

pub mod event_bus;
pub mod logger;

pub use event_bus::IEventBus;
pub use logger::ILogger;

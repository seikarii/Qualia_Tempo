//! # Responsibility
//! Mock implementations for testing backend services.

pub mod logger;
pub mod event_bus;

pub use logger::MockLogger;
pub use event_bus::MockEventBus;

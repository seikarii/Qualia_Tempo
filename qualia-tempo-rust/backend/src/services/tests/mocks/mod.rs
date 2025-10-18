//! # Responsibility
//! High-fidelity mock implementations for testing.
//!
//! ---
//!
//! All mocks are implemented using mockall for type-safe expectations.

pub mod mock_logger;
pub mod mock_event_bus;

pub use mock_logger::MockLogger;
pub use mock_event_bus::MockEventBus;

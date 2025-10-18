//! # Responsibility
//! Re-exports all mock implementations for testing.
//!
//! ---
//!
//! This module provides centralized access to high-fidelity mocks created
//! with mockall for all service interfaces.

pub mod mock_logger;
pub mod mock_event_bus;

pub use mock_logger::MockLogger;
pub use mock_event_bus::MockEventBus;

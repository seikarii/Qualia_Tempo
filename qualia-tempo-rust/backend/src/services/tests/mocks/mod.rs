//! # Responsibility
//! High-fidelity mock implementations for testing.
//!
//! ---
//!
//! All mocks are implemented using mockall for type-safe expectations.

pub mod mock_logger;
pub mod mock_event_bus;
pub mod mock_connection_manager;
pub mod mock_harmony_analysis;

pub use mock_logger::MockLogger;
pub use mock_event_bus::MockEventBus;
pub use mock_connection_manager::MockConnectionManager;
pub use mock_harmony_analysis::MockHarmonyAnalysis;

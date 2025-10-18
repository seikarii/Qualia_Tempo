//! # Responsibility
//! Test utilities and mocks for backend services.
//!
//! ---
//!
//! This module provides testing infrastructure including high-fidelity mocks
//! and integration test utilities.

pub mod mocks;

pub use mocks::{MockLogger, MockEventBus};

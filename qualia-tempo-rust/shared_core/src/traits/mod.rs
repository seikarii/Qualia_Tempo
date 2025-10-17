//! # Responsibility
//! Defines shared trait interfaces for dependency injection and service contracts.
//!
//! ---
//!
//! This module contains all trait definitions that services implement. These traits
//! enable dependency inversion and testability via high-fidelity mocks.

pub mod logger;
pub mod event_bus;
pub mod service;

pub use logger::*;
pub use event_bus::*;
pub use service::*;

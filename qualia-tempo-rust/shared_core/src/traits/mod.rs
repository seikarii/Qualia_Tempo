//! # Responsibility
//! Defines trait interfaces for all services in Qualia Tempo.
//!
//! ---
//!
//! These traits define the contracts that service implementations must fulfill.
//! They enable dependency injection via Shaku and high-fidelity mocking with mockall.

pub mod logger;
pub mod event_bus;
pub mod service;

pub use logger::*;
pub use event_bus::*;
pub use service::*;

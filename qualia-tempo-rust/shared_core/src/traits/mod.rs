//! # Responsibility
//! Shared trait interfaces for dependency injection and service contracts.
//!
//! ---
//!
//! This module defines all trait interfaces used across backend and frontend
//! for Shaku-based dependency injection per QUALIA.CODE.RUST v1.1.

pub mod logger;
pub mod event_bus;
pub mod service;

pub use logger::ILogger;
pub use event_bus::IEventBus;
pub use service::IBaseService;

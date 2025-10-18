//! # Responsibility
//! Provides all shared trait definitions.
//!
//! ---
//!
//! Re-exports all service interface traits.

pub mod config;
pub mod event_bus;
pub mod gameplay;
pub mod logger;
pub mod service;

// Re-export commonly used traits
pub use config::LoadableConfig;
pub use event_bus::IEventBus;
pub use gameplay::*;
pub use logger::ILogger;
pub use service::IBaseService;

//! # Responsibility
//! Application lifecycle management services.
//!
//! ---
//!
//! Provides initialization and shutdown orchestration.

pub mod initializer;

pub use initializer::{ApplicationInitializerService, IApplicationInitializer};

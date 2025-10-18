//! # Responsibility
//! Defines lifecycle management interfaces for application services.
//!
//! ---
//!
//! Provides traits for coordinating service initialization and shutdown.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Interface;

/// # Responsibility
/// Interface for application lifecycle management.
///
/// ---
///
/// Coordinates the initialization and graceful shutdown of all services.
/// Implementations MUST ensure proper startup order and cleanup.
#[async_trait]
pub trait IApplicationInitializer: Interface + Send + Sync {
    /// Initializes all registered services in order.
    ///
    /// # Errors
    /// Returns error if any service fails to initialize.
    async fn initialize(&self) -> Result<()>;

    /// Shuts down all services gracefully.
    ///
    /// # Errors
    /// Returns error if any service fails to shut down cleanly.
    async fn shutdown(&self) -> Result<()>;
}

//! # Responsibility
//! Defines the base service interface for lifecycle management.

use anyhow::Result;
use async_trait::async_trait;
use shaku::Interface;

/// # Responsibility
/// Base interface for all services with lifecycle management.
///
/// ---
///
/// All services implementing this trait can be initialized and shut down
/// gracefully. Used by `ApplicationInitializerService` to orchestrate
/// service lifecycle in dependency order.
#[async_trait]
pub trait IBaseService: Interface {
    /// Initialize the service (called during startup)
    ///
    /// # Errors
    ///
    /// Returns an error if initialization fails (e.g., resource unavailable)
    async fn initialize(&self) -> Result<()>;

    /// Gracefully shutdown the service (called during application termination)
    ///
    /// # Errors
    ///
    /// Returns an error if shutdown fails (e.g., resources not released)
    async fn shutdown(&self) -> Result<()>;

    /// Returns the service name for logging and debugging
    fn service_name(&self) -> &'static str;
}

//! # Responsibility
//! Defines base service traits for lifecycle management.
//!
//! ---
//!
//! Contains IBaseService for startup/shutdown orchestration.

use anyhow::Result;
use async_trait::async_trait;
use shaku::Interface;

/// # Responsibility
/// Base trait for all services requiring lifecycle management.
///
/// ---
///
/// Services implementing this trait can be orchestrated by ApplicationInitializerService.
#[async_trait]
pub trait IBaseService: Interface + Send + Sync {
    /// Initialize the service (called during startup)
    ///
    /// # Returns
    /// Ok(()) on successful initialization, Err on failure
    async fn initialize(&self) -> Result<()>;

    /// Shutdown the service gracefully (called during teardown)
    ///
    /// # Returns
    /// Ok(()) on successful shutdown, Err on failure
    async fn shutdown(&self) -> Result<()>;

    /// Get the service name for logging and diagnostics
    fn name(&self) -> &str;
}

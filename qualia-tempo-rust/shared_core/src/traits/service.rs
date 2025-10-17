//! # Responsibility
//! Defines the IBaseService trait for service lifecycle management.

use shaku::Interface;
use anyhow::Result;

/// # Responsibility
/// Base trait for all services requiring lifecycle management.
///
/// ---
///
/// Services implementing this trait can be initialized and shut down
/// in a coordinated manner by the ApplicationInitializerService.
#[async_trait::async_trait]
pub trait IBaseService: Interface + Send + Sync {
    /// Initializes the service
    ///
    /// Called once during application startup in dependency order
    async fn initialize(&self) -> Result<()>;
    
    /// Gracefully shuts down the service
    ///
    /// Called during application teardown in reverse dependency order
    async fn shutdown(&self) -> Result<()>;
    
    /// Returns the service name for logging and diagnostics
    fn name(&self) -> &str;
}

//! # Responsibility
//! Defines base service lifecycle traits.

use shaku::Interface;
use anyhow::Result;

/// # Responsibility
/// Provides base lifecycle methods for all services.
///
/// ---
///
/// Services that require initialization or cleanup should implement this trait.
/// The ApplicationInitializerService will call these methods during startup/shutdown.
#[async_trait::async_trait]
pub trait IBaseService: Interface {
    /// Initialize the service (called during application startup).
    async fn initialize(&mut self) -> Result<()> {
        Ok(()) // Default: no-op
    }
    
    /// Shutdown the service gracefully (called during application shutdown).
    async fn shutdown(&mut self) -> Result<()> {
        Ok(()) // Default: no-op
    }
}

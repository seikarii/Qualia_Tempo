//! # Responsibility
//! Defines base service interface traits.

use shaku::Interface;
use anyhow::Result;

/// # Responsibility
/// Base trait for all services that have lifecycle methods.
///
/// ---
///
/// Services that need initialization or cleanup should implement this trait.
#[async_trait::async_trait]
pub trait IBaseService: Interface {
    /// Initialize the service
    ///
    /// # Errors
    /// Returns error if initialization fails
    async fn start(&self) -> Result<()>;
    
    /// Cleanup and shutdown the service
    ///
    /// # Errors
    /// Returns error if shutdown encounters problems
    async fn stop(&self) -> Result<()>;
}

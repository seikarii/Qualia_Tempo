//! # Responsibility
//! Lifecycle service trait definitions.

use shaku::Interface;
use anyhow::Result;

/// # Responsibility
/// Interface for the application initializer service.
#[async_trait::async_trait]
pub trait IApplicationInitializer: Interface {
    /// Initialize the application.
    async fn initialize(&self) -> Result<()>;
    
    /// Shutdown the application.
    async fn shutdown(&self) -> Result<()>;
}

//! # Responsibility
//! Backend binary entry point and Composition Root.
//!
//! ---
//!
//! This is the ONLY place where services are instantiated and the DI
//! container is built (per QUALIA.CODE.RUST §2.1 mandate).

use backend::{GameModule, services::*};
use anyhow::Result;
use shaku::HasComponent;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing subscriber
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();
    
    tracing::info!("=== Qualia Tempo Backend Starting ===");
    
    // Build DI container (Composition Root)
    let module = GameModule::builder().build();
    
    // Resolve services
    let initializer: std::sync::Arc<dyn IApplicationInitializer> = module.resolve();
    
    // Initialize application
    initializer.initialize().await?;
    
    tracing::info!("Backend running... (Press Ctrl+C to exit)");
    
    // Wait for Ctrl+C
    tokio::signal::ctrl_c().await?;
    
    // Shutdown gracefully
    initializer.shutdown().await?;
    
    tracing::info!("=== Backend Shutdown Complete ===");
    
    Ok(())
}

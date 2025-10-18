//! # Responsibility
//! Backend entry point and Composition Root for Qualia Tempo.
//!
//! ---
//!
//! This is the ONLY place where the full dependency graph is constructed.
//! All services are registered here and resolved via Shaku DI container.

use anyhow::Result;

// Backend library modules
use backend::services::{EventBusService, QualiaLogger, TimerService};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing subscriber for structured logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(true)
        .with_level(true)
        .init();

    tracing::info!("🎵 Qualia Tempo Backend Starting...");

    // Phase 2: Core services initialized
    // Future phases will add GameLogicService, BossAIService, etc.
    
    let _event_bus = EventBusService::default();
    let _logger = QualiaLogger::new();
    let _timer = TimerService::new();
    
    tracing::info!("✅ Core services initialized successfully");
    tracing::info!("Backend running. Press Ctrl+C to shutdown.");

    // Keep alive (future: will be server loop)
    tokio::signal::ctrl_c().await?;
    
    tracing::info!("🛑 Shutdown signal received. Exiting gracefully.");
    
    Ok(())
}

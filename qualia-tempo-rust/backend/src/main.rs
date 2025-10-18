//! # Responsibility
//! Backend entry point and Composition Root for Qualia Tempo.
//!
//! ---
//!
//! This is the ONLY place where the full dependency graph is constructed.
//! Phase 2 uses manual DI for services requiring initialization parameters.
//! Future phases will migrate to full Shaku DI.

use anyhow::Result;
use std::sync::Arc;

// Import services
use backend::services::core::{EventBusService, QualiaLogger, TimerService};
use backend::services::interfaces::{IEventBus, ILogger, ITimer};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing subscriber for structured logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(true)
        .with_level(true)
        .with_env_filter("backend=debug,shared_core=debug")
        .init();

    tracing::info!("🎵 Qualia Tempo Backend Starting...");

    // Composition Root - Phase 2: Manual DI
    // Event Bus requires initialization parameter, so we construct manually
    let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::default());
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let timer: Arc<dyn ITimer> = Arc::new(TimerService::new());
    
    logger.info("✅ Core services initialized successfully");
    logger.info("📊 EventBus ready for event distribution");
    logger.info(&format!("⏱️  Timer started at {:?}", timer.elapsed()));
    
    // Test event emission
    let test_event = shared_core::events::GameEvent::QualiaStateUpdated {
        state: shared_core::contracts::QualiaState::default(),
    };
    
    match event_bus.emit(test_event) {
        Ok(count) => logger.info(&format!("Test event emitted to {} receivers", count)),
        Err(_) => logger.warn("No receivers for test event (expected at startup)"),
    }

    logger.info("Backend running. Press Ctrl+C to shutdown.");

    // Keep alive (future: will be server loop)
    tokio::signal::ctrl_c().await?;
    
    logger.info("🛑 Shutdown signal received. Exiting gracefully.");
    
    Ok(())
}

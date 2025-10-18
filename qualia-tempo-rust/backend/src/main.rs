//! # Responsibility
//! Backend server entry point and composition root.
//!
//! ---
//!
//! This is the ONLY place where services are instantiated via Shaku DI.
//! All service creation happens here through the `GameModule`.

use anyhow::Result;
use shaku::{module, HasComponent};
use shared_core::events::GameEvent;
use shared_core::contracts::QualiaState;

// Import services
use backend::services::core::{EventBusService, QualiaLogger, TimerService};

// Define Shaku module with all services
module! {
    pub GameModule {
        components = [
            EventBusService,
            QualiaLogger,
            TimerService,
        ],
        providers = []
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    use tracing_subscriber;
    tracing_subscriber::fmt()
        .with_env_filter("backend=debug,tower_http=debug")
        .init();

    // Build DI container
    let module = GameModule::builder().build();

    tracing::info!("Qualia Tempo Backend initializing...");

    // Resolve services to verify DI works
    let event_bus: std::sync::Arc<dyn shared_core::traits::IEventBus> = module.resolve();
    let logger: std::sync::Arc<dyn shared_core::traits::ILogger> = module.resolve();
    let timer: std::sync::Arc<dyn shared_core::traits::IBaseService> = module.resolve();

    logger.info("EventBus resolved successfully");
    logger.info("Logger resolved successfully");
    logger.info("Timer resolved successfully");

    // Initialize timer service
    timer.initialize().await?;

    // Test event emission
    let test_event = GameEvent::QualiaStateUpdated {
        state: QualiaState::default(),
    };
    match event_bus.emit(test_event) {
        Ok(count) => logger.info(&format!("Test event emitted to {count} subscribers")),
        Err(e) => logger.warn(&format!("Event emit failed: {e:?}")),
    }

    tracing::info!("Backend initialized successfully. Press Ctrl+C to exit.");

    // Keep alive for now (will be replaced with Axum server in next phase)
    tokio::signal::ctrl_c().await?;

    tracing::info!("Shutting down...");
    timer.shutdown().await?;

    Ok(())
}

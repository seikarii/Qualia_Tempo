//! # Responsibility
//! Backend binary entry point with dependency injection composition root.
//!
//! ---
//!
//! This is the ONLY place in the backend where the dependency graph is constructed.

#![warn(missing_docs)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]

use anyhow::Result;
use backend::config::BackendConfig;
use backend::services::infrastructure::{EventBusService, QualiaLogger};
use shared_core::traits::{IEventBus, ILogger};
use shaku::{module, HasComponent};
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// Define the Shaku module with services that support automatic DI
module! {
    BackendModule {
        components = [QualiaLogger],
        providers = []
    }
}

/// Initializes the tracing subscriber for structured logging.
fn init_logging(config: &BackendConfig) -> Result<()> {
    let log_level = match config.log_level.as_str() {
        "trace" => tracing::Level::TRACE,
        "debug" => tracing::Level::DEBUG,
        "info" => tracing::Level::INFO,
        "warn" => tracing::Level::WARN,
        "error" => tracing::Level::ERROR,
        _ => tracing::Level::INFO,
    };

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_line_number(true);

    tracing_subscriber::registry()
        .with(tracing_subscriber::filter::LevelFilter::from_level(log_level))
        .with(fmt_layer)
        .init();

    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load configuration
    let config = BackendConfig::default();

    // Initialize logging BEFORE creating services
    init_logging(&config)?;

    // Build the Shaku DI container
    let module = BackendModule::builder().build();

    // Resolve services from Shaku
    let logger: Arc<dyn ILogger> = module.resolve();

    // Manually create EventBusService with configured capacity
    // NOTE: EventBusService will be migrated to Shaku Provider in Phase 2
    let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::new(config.event_bus.capacity));

    logger.info("=== Qualia Tempo Backend Starting ===");
    logger.info(&format!("EventBus capacity: {}", config.event_bus.capacity));
    logger.info(&format!("Log level: {}", config.log_level));

    // Test EventBus connectivity
    let _subscriber = event_bus.subscribe();
    logger.info("EventBus initialized successfully");

    // TODO: Start WebSocket server
    // TODO: Start game loop
    // TODO: Initialize all gameplay services
    
    logger.info("Backend initialized successfully");
    logger.warn("Server not yet implemented - exiting");

    Ok(())
}

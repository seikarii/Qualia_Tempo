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
    let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::new(config.event_bus_capacity));

    logger.info("=== Qualia Tempo Backend Starting ===");
    logger.info(&format!("Server: {}:{}", config.websocket.bind_address, config.websocket.port));
    logger.info(&format!("EventBus capacity: {}", config.event_bus_capacity));
    logger.info(&format!("Log level: {}", config.log_level));

    // Test EventBus connectivity
    let _subscriber = event_bus.subscribe();
    logger.info("EventBus initialized successfully");

    // Build Axum application
    use backend::handlers::{AppState, websocket_handler, health_check, readiness_check};
    use backend::handlers::{get_combat_data, list_combat_data};
    use axum::{
        routing::get,
        Router,
    };
    use tower_http::cors::{CorsLayer, Any};
    
    let app_state = AppState {
        event_bus: event_bus.clone(),
    };
    
    let app = Router::new()
        // WebSocket endpoint
        .route("/ws", get(websocket_handler))
        
        // Health check endpoints
        .route("/health", get(health_check))
        .route("/ready", get(readiness_check))
        
        // API endpoints
        .route("/api/combat/:id", get(get_combat_data))
        .route("/api/combat", get(list_combat_data))
        
        // CORS middleware
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        )
        
        // Shared state
        .with_state(app_state);
    
    // Bind and serve
    let addr = format!("{}:{}", config.websocket.bind_address, config.websocket.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    logger.info(&format!("🚀 Server listening on {}", addr));
    logger.info("✅ Backend initialized successfully");
    logger.info(&format!("📡 WebSocket endpoint: ws://{}/ws", addr));
    logger.info(&format!("❤️  Health check: http://{}/health", addr));
    
    axum::serve(listener, app).await?;

    Ok(())
}


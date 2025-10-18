//! # Responsibility
//! Backend entry point and Composition Root for Qualia Tempo.
//!
//! ---
//!
//! This is the ONLY place where the full dependency graph is constructed.
//! Phase 4: Complete networking stack with Axum HTTP/WebSocket server.

use anyhow::Result;
use std::sync::Arc;
use std::net::SocketAddr;
use axum::{
    Router,
    routing::get,
};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

// Import services
use backend::services::core::{EventBusService, QualiaLogger, TimerService};
use backend::services::networking::{WebSocketService, ConnectionManagerService, GameStateStreamingService};
use backend::services::interfaces::{IEventBus, ILogger, ITimer};
use backend::handlers::{health_check, websocket_handler};
use shared_core::traits::{IConnectionManagerService, IGameStateStreamingService};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing subscriber for structured logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(true)
        .with_level(true)
        .with_env_filter("backend=debug,shared_core=debug,axum=debug,tower_http=debug")
        .init();

    tracing::info!("🎵 Qualia Tempo Backend - Phase 4: Networking");

    // ===== COMPOSITION ROOT - PHASE 4 =====
    // Core Infrastructure Services
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::default());
    let timer: Arc<dyn ITimer> = Arc::new(TimerService::new());
    
    logger.info("✅ Core services initialized");
    logger.info(&format!("⏱️  System uptime: {:?}", timer.elapsed()));
    
    // Networking Services
    let websocket_service: Arc<WebSocketService> = Arc::new(WebSocketService::new(
        1000, // Channel capacity
        logger.clone(),
    ));
    
    let connection_manager: Arc<dyn IConnectionManagerService> = Arc::new(
        ConnectionManagerService::new(logger.clone())
    );
    
    let streaming_service: Arc<dyn IGameStateStreamingService> = Arc::new(
        GameStateStreamingService::new(
            websocket_service.clone(),
            event_bus.clone(),
            logger.clone(),
        )
    );
    
    logger.info("✅ Networking services initialized");
    
    // Start GameStateStreamingService
    streaming_service.start().await?;
    logger.info("📡 GameStateStreamingService started");
    
    // Start periodic connection cleanup task
    let connection_manager_clone = connection_manager.clone();
    let logger_clone = logger.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            match connection_manager_clone.cleanup_dead_connections().await {
                Ok(count) if count > 0 => {
                    logger_clone.info(&format!("🧹 Cleaned up {} dead connections", count));
                }
                Ok(_) => {} // No dead connections
                Err(e) => {
                    logger_clone.error(&format!("❌ Connection cleanup error: {:?}", e));
                }
            }
        }
    });
    logger.info("🧹 Connection cleanup task started");
    
    // ===== AXUM HTTP/WEBSOCKET SERVER =====
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/ws", get(websocket_handler))
        .with_state(websocket_service.clone())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());
    
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    
    logger.info(&format!("🌐 HTTP/WebSocket server binding to {}", addr));
    logger.info("📍 Health endpoint: http://localhost:8080/health");
    logger.info("🔌 WebSocket endpoint: ws://localhost:8080/ws");
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    logger.info("🚀 Backend server ready. Press Ctrl+C to shutdown.");
    
    // Run server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(logger.clone()))
        .await?;
    
    // Cleanup on shutdown
    streaming_service.stop().await?;
    logger.info("🛑 Backend shutdown complete");
    
    Ok(())
}

/// # Responsibility
/// Handles graceful shutdown on SIGINT/SIGTERM signals.
async fn shutdown_signal(logger: Arc<dyn ILogger>) {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            logger.info("🛑 Received SIGINT (Ctrl+C)");
        },
        _ = terminate => {
            logger.info("🛑 Received SIGTERM");
        },
    }
}

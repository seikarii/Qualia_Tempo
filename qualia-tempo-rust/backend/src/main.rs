//! # Responsibility
//! Backend server entry point and composition root.
//!
//! ---
//!
//! This is the ONLY place where services are instantiated via Shaku DI.
//! All service creation happens here through the `GameModule`.
//! PHASE 4: Axum WebSocket server with /ws endpoint and /health check.

use anyhow::Result;
use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        State,
    },
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use shaku::{module, HasComponent};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

// Import services
use backend::services::core::{EventBusService, QualiaLogger, TimerService};
use backend::services::networking::{
    ConnectionManagerService, GameStateStreamingService, WebSocketService,
};
use backend::engine::QualiaParticleEngine;

// Define Shaku module with all services (PHASE 6: Added ParticleEngine)
module! {
    pub GameModule {
        components = [
            EventBusService,
            QualiaLogger,
            TimerService,
            ConnectionManagerService,
            GameStateStreamingService,
            WebSocketService,
            QualiaParticleEngine,
        ],
        providers = []
    }
}

/// # Responsibility
/// Application state shared across Axum handlers
#[derive(Clone)]
struct AppState {
    module: Arc<GameModule>,
}

/// # Responsibility
/// WebSocket upgrade handler
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// # Responsibility
/// Handles individual WebSocket connection
/// 
/// ARCHITECTURE NOTE: WebSocket handling is in main.rs (Axum integration layer)
/// Business logic for message routing is in `WebSocketService`
#[allow(clippy::cognitive_complexity)] // Axum handler with multiple message types
async fn handle_socket(socket: WebSocket, state: AppState) {
    use futures_util::{SinkExt, StreamExt};
    use axum::extract::ws::Message;
    
    // Generate unique connection ID
    let connection_id = uuid::Uuid::new_v4().to_string();

    // Resolve services from DI container
    let event_bus: Arc<dyn shared_core::traits::IEventBus> = state.module.resolve();
    let logger: Arc<dyn shared_core::traits::ILogger> = state.module.resolve();
    let conn_mgr: Arc<dyn shared_core::traits::IConnectionManagerService> = state.module.resolve();
    
    logger.info(&format!("WebSocket connection established: {connection_id}"));
    
    // Register connection
    if let Err(e) = conn_mgr.register_connection(connection_id.clone()).await {
        tracing::error!("Failed to register connection: {e:?}");
        return;
    }
    
    let (mut sender, mut receiver) = socket.split();
    
    // Subscribe to EventBus for state updates
    let mut events = event_bus.subscribe();
    
    // Create channel for ping/pong responses
    let (pong_tx, mut pong_rx) = tokio::sync::mpsc::unbounded_channel::<Vec<u8>>();
    
    let logger_clone = logger.clone();
    let connection_id_clone = connection_id.clone();
    
    // Spawn task to forward backend events and pong responses to client
    let sender_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                // Handle EventBus events
                event_result = events.recv() => {
                    match event_result {
                        Ok(event) => {
                            match serde_json::to_string(&event) {
                                Ok(json) => {
                                    if sender.send(Message::Text(json)).await.is_err() {
                                        logger_clone.warn(&format!("Client disconnected: {connection_id_clone}"));
                                        break;
                                    }
                                }
                                Err(e) => {
                                    logger_clone.error(&format!("Serialization error: {e:?}"));
                                }
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            logger_clone.warn(&format!("WebSocket lagging: {connection_id_clone}, skipped {skipped} events"));
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            logger_clone.info(&format!("EventBus closed, stopping sender: {connection_id_clone}"));
                            break;
                        }
                    }
                }
                // Handle pong responses
                pong_data = pong_rx.recv() => {
                    if let Some(data) = pong_data {
                        if sender.send(Message::Pong(data)).await.is_err() {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
        }
    });
    
    // Handle incoming messages from client
    while let Some(msg) = receiver.next().await {
        use shared_core::contracts::PlayerAction;
        use shared_core::events::GameEvent;
        
        match msg {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<PlayerAction>(&text) {
                    Ok(action) => {
                        if let Err(e) = event_bus.emit(GameEvent::PlayerActionReceived { action }) {
                            logger.error(&format!("Failed to emit player action: {e:?}"));
                        }
                    }
                    Err(e) => {
                        logger.warn(&format!("Invalid player action JSON: {e:?}"));
                    }
                }
            }
            Ok(Message::Ping(data)) => {
                if pong_tx.send(data).is_err() {
                    break;
                }
                conn_mgr.update_heartbeat(&connection_id);
            }
            Ok(Message::Pong(_)) => {
                conn_mgr.update_heartbeat(&connection_id);
            }
            Ok(Message::Close(_)) => {
                tracing::info!("Client closed connection: {connection_id}");
                break;
            }
            Err(e) => {
                tracing::error!("WebSocket error on {connection_id}: {e:?}");
                break;
            }
            _ => {}
        }
    }
    
    // Cleanup
    drop(pong_tx);
    sender_task.abort();
    
    if let Err(e) = conn_mgr.unregister_connection(&connection_id).await {
        tracing::error!("Failed to unregister connection: {e:?}");
    }
    
    logger.info(&format!("WebSocket connection closed: {connection_id}"));
}

/// # Responsibility
/// Health check endpoint
async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    // Resolve ConnectionManagerService to report stats
    let conn_mgr: Arc<dyn shared_core::traits::IConnectionManagerService> =
        state.module.resolve();

    let active_connections = conn_mgr.active_connection_count();

    Html(format!(
        r#"
        <!DOCTYPE html>
        <html>
        <head><title>Qualia Tempo Backend Health</title></head>
        <body>
            <h1>Qualia Tempo Backend</h1>
            <p>Status: <strong style="color: green;">HEALTHY</strong></p>
            <p>Active WebSocket Connections: <strong>{active_connections}</strong></p>
            <p>Phase: <strong>4 - Networking & WebSocket</strong></p>
        </body>
        </html>
        "#
    ))
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("backend=debug,tower_http=debug,axum=debug")
        .init();

    tracing::info!("Qualia Tempo Backend initializing (Phase 4)...");

    // Build DI container
    let module = Arc::new(GameModule::builder().build());

    // Resolve core services
    let logger: Arc<dyn shared_core::traits::ILogger> = module.resolve();
    let _event_bus: Arc<dyn shared_core::traits::IEventBus> = module.resolve();
    let timer: Arc<dyn shared_core::traits::IBaseService> = module.resolve();

    logger.info("Core services resolved successfully");

    // Initialize timer service
    timer.initialize().await?;

    // Note: State streaming will be activated when game logic services are integrated
    logger.info("Networking services initialized");

    // Build Axum router
    let app_state = AppState {
        module: module.clone(),
    };

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(health_check))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    // Bind server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Backend listening on {addr}");
    tracing::info!("WebSocket endpoint: ws://{addr}/ws");
    tracing::info!("Health check: http://{addr}/health");

    // Start Axum server
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("Shutting down...");
    timer.shutdown().await?;

    Ok(())
}

/// # Responsibility
/// Graceful shutdown handler
async fn shutdown_signal() {
    match tokio::signal::ctrl_c().await {
        Ok(()) => {
            tracing::info!("Received shutdown signal");
        }
        Err(e) => {
            tracing::error!("Failed to listen for Ctrl+C: {e}");
        }
    }
}

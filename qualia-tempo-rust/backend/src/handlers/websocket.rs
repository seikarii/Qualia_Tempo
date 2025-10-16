//! # Responsibility
//! WebSocket upgrade handler for real-time client communication.
//!
//! ---
//!
//! Handles WebSocket connections, deserializes PlayerActions, broadcasts CombatState updates.

use axum::{
    extract::{State, WebSocketUpgrade, ws::{WebSocket, Message}},
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{info, warn, error};
use shared_core::{
    contracts::input::PlayerAction,
    events::GameEvent,
};
use crate::services::infrastructure::IEventBus;

/// # Responsibility
/// Shared application state for WebSocket handlers.
#[derive(Clone)]
pub struct AppState {
    /// EventBus for distributing events
    pub event_bus: Arc<dyn IEventBus>,
}

/// # Responsibility
/// Handles WebSocket upgrade requests.
///
/// ---
///
/// Called by Axum router when client requests WebSocket upgrade at /ws endpoint.
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// # Responsibility
/// Manages bidirectional WebSocket communication for a single client.
///
/// ---
///
/// Spawns two tasks:
/// 1. Receiver: Reads PlayerActions from client, publishes to EventBus
/// 2. Sender: Subscribes to EventBus, sends CombatState updates to client
async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    
    let client_id = uuid::Uuid::new_v4().to_string();
    info!("WebSocket client connected: {}", client_id);
    
    // Task 1: Receive messages from client and publish to EventBus
    let event_bus_rx = state.event_bus.clone();
    let client_id_rx = client_id.clone();
    let receive_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Binary(data) = msg {
                // Deserialize PlayerAction
                match bincode::deserialize::<PlayerAction>(&data) {
                    Ok(action) => {
                        info!("Received action from client {}: {:?}", client_id_rx, action);
                        
                        // Publish to EventBus (Box required per GameEvent definition)
                        let event = GameEvent::PlayerAction(Box::new(action));
                        if let Err(e) = event_bus_rx.emit(event) {
                            warn!("Failed to emit PlayerAction: {:?}", e);
                        }
                    }
                    Err(e) => {
                        error!("Failed to deserialize PlayerAction: {:?}", e);
                    }
                }
            }
        }
        
        info!("Client {} disconnected (receive)", client_id_rx);
    });
    
    // Task 2: Subscribe to EventBus and send CombatState updates to client
    let mut events = state.event_bus.subscribe();
    let client_id_tx = client_id.clone();
    let send_task = tokio::spawn(async move {
        loop {
            match events.recv().await {
                Ok(GameEvent::CombatStateUpdated(combat_state)) => {
                    // Serialize CombatState
                    match bincode::serialize(&combat_state) {
                        Ok(data) => {
                            if sender.send(Message::Binary(data)).await.is_err() {
                                warn!("Failed to send to client {} (disconnected)", client_id_tx);
                                break;
                            }
                        }
                        Err(e) => {
                            error!("Failed to serialize CombatState: {:?}", e);
                        }
                    }
                }
                Ok(GameEvent::QualiaStateUpdated(qualia_state)) => {
                    // Optionally send incremental Qualia updates for responsiveness
                    info!("Qualia update for client {}: intensity={:.2}", client_id_tx, qualia_state.intensity);
                }
                Err(broadcast::error::RecvError::Lagged(skipped)) => {
                    warn!("Client {} lagging, skipped {} events", client_id_tx, skipped);
                }
                Err(broadcast::error::RecvError::Closed) => {
                    info!("EventBus closed, disconnecting client {}", client_id_tx);
                    break;
                }
                _ => {}
            }
        }
    });
    
    // Wait for either task to complete (disconnect)
    tokio::select! {
        _ = receive_task => {
            info!("Client {} receive task ended", client_id);
        }
        _ = send_task => {
            info!("Client {} send task ended", client_id);
        }
    }
}

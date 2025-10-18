//! # Responsibility
//! Axum WebSocket handler for client connections.
//!
//! ---
//!
//! This handler upgrades HTTP connections to WebSocket and manages the
//! bidirectional message flow between client and server.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;
use tracing::{info, warn, error, debug};
use crate::services::WebSocketService;

/// # Responsibility
/// HTTP to WebSocket upgrade handler.
///
/// ---
///
/// Called by Axum when a client requests WebSocket upgrade via GET /ws.
/// Spawns a task to handle bidirectional communication.
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(ws_service): State<Arc<WebSocketService>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, ws_service))
}

/// # Responsibility
/// Handles individual WebSocket connection lifecycle.
///
/// ---
///
/// Subscribes to broadcast channel, forwards messages to client, and handles
/// incoming messages from client. Gracefully disconnects on errors.
async fn handle_socket(socket: WebSocket, ws_service: Arc<WebSocketService>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = ws_service.subscribe();
    
    info!("WebSocket client connected");
    
    // Spawn task to forward broadcast messages to client
    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(message) => {
                    if let Err(e) = sender.send(Message::Text(message)).await {
                        error!("Failed to send message to client: {:?}", e);
                        break;
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                    warn!("Client lagged, skipped {} messages", skipped);
                    // Send lag notification to client
                    let lag_msg = serde_json::json!({
                        "type": "lag",
                        "skipped": skipped
                    }).to_string();
                    
                    if let Err(e) = sender.send(Message::Text(lag_msg)).await {
                        error!("Failed to send lag notification: {:?}", e);
                        break;
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    info!("Broadcast channel closed, disconnecting client");
                    break;
                }
            }
        }
    });
    
    // Spawn task to handle incoming messages from client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(message)) = receiver.next().await {
            match message {
                Message::Text(text) => {
                    debug!("Received text message from client: {}", text);
                    // TODO: Process client messages (e.g., player actions)
                }
                Message::Binary(data) => {
                    debug!("Received binary message from client: {} bytes", data.len());
                    // TODO: Process binary messages (e.g., audio data)
                }
                Message::Ping(ping) => {
                    debug!("Received ping: {:?}", ping);
                    // Axum handles pong automatically
                }
                Message::Pong(_) => {
                    debug!("Received pong");
                }
                Message::Close(reason) => {
                    info!("Client requested close: {:?}", reason);
                    break;
                }
            }
        }
    });
    
    // Wait for either task to complete
    tokio::select! {
        _ = (&mut send_task) => {
            recv_task.abort();
        }
        _ = (&mut recv_task) => {
            send_task.abort();
        }
    }
    
    ws_service.unsubscribe();
    info!("WebSocket client disconnected");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::QualiaLogger;
    use tokio_tungstenite::connect_async;
    use futures_util::StreamExt;
    
    // Integration test would require spinning up Axum server
    // This is a placeholder for the test structure
    
    #[tokio::test]
    #[ignore] // Requires running server
    async fn test_websocket_connection() {
        // This test would:
        // 1. Start Axum server with WebSocket handler
        // 2. Connect via tokio-tungstenite client
        // 3. Verify bidirectional communication
        // 4. Verify graceful disconnect
    }
}

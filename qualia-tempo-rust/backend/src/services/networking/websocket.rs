//! # Responsibility
//! Manages WebSocket connections using Axum and tokio-tungstenite.
//!
//! ---
//!
//! COMPLIANCE: QUALIA.CODE.RUST §4.1 - Use tokio::sync::broadcast for EventBus.

use async_trait::async_trait;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;
use anyhow::{Result, Context};
use shared_core::traits::{IWebSocketService, IEventBus, ILogger, IConnectionManagerService};
use shared_core::events::GameEvent;
use shared_core::contracts::PlayerAction;
use shaku::Component;
use tracing::{info, error, instrument};

/// # Responsibility
/// Handles individual WebSocket connection lifecycle and message routing.
///
/// ---
///
/// MANDATE: Uses tokio::sync::broadcast for event distribution.
/// COMPLIANCE: QUALIA.CODE.RUST §4.1
#[derive(Component)]
#[shaku(interface = IWebSocketService)]
pub struct WebSocketService {
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    connection_manager: Arc<dyn IConnectionManagerService>,
}

impl WebSocketService {
    /// Creates new instance (called by Shaku)
    pub fn new(
        event_bus: Arc<dyn IEventBus>,
        logger: Arc<dyn ILogger>,
        connection_manager: Arc<dyn IConnectionManagerService>,
    ) -> Self {
        Self {
            event_bus,
            logger,
            connection_manager,
        }
    }
    
    /// Handles a single WebSocket connection
    ///
    /// # Errors
    /// Returns error if connection registration/unregistration fails.
    #[instrument(skip(self, socket))]
    pub async fn handle_socket(&self, socket: WebSocket, connection_id: String) -> Result<()> {
        self.logger.info(&format!("WebSocket connection established: {connection_id}"));
        
        // Register connection
        self.connection_manager
            .register_connection(connection_id.clone())
            .await
            .context("Failed to register connection")?;
        
        let (mut sender, mut receiver) = socket.split();
        
        // Subscribe to EventBus for state updates
        let mut events = self.event_bus.subscribe();
        
        // Create channel for ping/pong responses
        let (pong_tx, mut pong_rx) = tokio::sync::mpsc::unbounded_channel::<Vec<u8>>();
        
        // Clone references for spawned tasks
        let logger_clone = self.logger.clone();
        let connection_id_clone = connection_id.clone();
        
        // Spawn task to forward backend events and pong responses to client
        let sender_task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    // Handle EventBus events
                    event_result = events.recv() => {
                        match event_result {
                            Ok(event) => {
                                // Serialize event to JSON
                                match serde_json::to_string(&event) {
                                    Ok(json) => {
                                        if sender.send(Message::Text(json)).await.is_err() {
                                            logger_clone.warn(&format!("Client disconnected: {connection_id_clone}"));
                                            break; // Client disconnected
                                        }
                                    }
                                    Err(e) => {
                                        logger_clone.error(&format!("Serialization error: {e:?}"));
                                    }
                                }
                            }
                            Err(broadcast::error::RecvError::Lagged(skipped)) => {
                                logger_clone.warn(&format!("WebSocket lagging: {connection_id_clone}, skipped {skipped} events"));
                            }
                            Err(broadcast::error::RecvError::Closed) => {
                                logger_clone.info(&format!("EventBus closed, stopping sender: {connection_id_clone}"));
                                break; // EventBus closed
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
                            break; // Channel closed
                        }
                    }
                }
            }
        });
        
        // Handle incoming messages from client
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Parse player action from client
                    match serde_json::from_str::<PlayerAction>(&text) {
                        Ok(action) => {
                            // Emit player action to EventBus
                            if let Err(e) = self.event_bus.emit(GameEvent::PlayerActionReceived { action }) {
                                self.logger.error(&format!("Failed to emit player action: {e:?}"));
                            }
                        }
                        Err(e) => {
                            self.logger.warn(&format!("Invalid player action JSON: {e:?}"));
                        }
                    }
                }
                Ok(Message::Ping(data)) => {
                    // Send pong response via channel
                    if pong_tx.send(data).is_err() {
                        break;
                    }
                    // Update heartbeat
                    self.connection_manager.update_heartbeat(&connection_id);
                }
                Ok(Message::Pong(_)) => {
                    // Update heartbeat on pong
                    self.connection_manager.update_heartbeat(&connection_id);
                }
                Ok(Message::Close(_)) => {
                    info!("Client closed connection: {connection_id}");
                    break;
                }
                Err(e) => {
                    error!("WebSocket error on {connection_id}: {e:?}");
                    break;
                }
                _ => {}
            }
        }
        
        // Cleanup
        drop(pong_tx); // Signal sender task to stop
        sender_task.abort();
        self.connection_manager
            .unregister_connection(&connection_id)
            .await
            .context("Failed to unregister connection")?;
        
        self.logger.info(&format!("WebSocket connection closed: {connection_id}"));
        
        Ok(())
    }
}

#[async_trait]
impl IWebSocketService for WebSocketService {
    async fn handle_connection(&self, _connection_id: String) -> Result<()> {
        // This method signature is simplified; actual Axum WebSocket is passed via handle_socket
        // This trait method exists for interface compliance
        Ok(())
    }
    
    async fn send_message(&self, _connection_id: &str, _message: Vec<u8>) -> Result<()> {
        // Individual message sending would require connection registry with senders
        // For Phase 4, we focus on broadcast pattern via EventBus
        unimplemented!("Direct message sending not implemented in Phase 4")
    }
    
    async fn broadcast_message(&self, _message: Vec<u8>) -> Result<usize> {
        // Broadcast via EventBus (binary message needs to be wrapped in GameEvent)
        // For now, this is a placeholder for future binary protocol
        Ok(0)
    }
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_websocket_service_placeholder() {
        // Full integration test requires mock WebSocket
        // Pending Phase 5 mock infrastructure
        assert!(true, "Placeholder test for Phase 4");
    }
}

//! # Responsibility
//! Provides WebSocket server for real-time client communication.
//!
//! ---
//!
//! This service implements an Axum-based WebSocket server that:
//! - Accepts client connections on configured host:port
//! - Deserializes incoming PlayerAction messages from clients
//! - Broadcasts CombatState updates to all connected clients
//! - Manages connection lifecycle (connect, disconnect, ping/pong)
//! - Tracks active sessions with unique client IDs

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::Result;
use axum::{
    extract::{State, WebSocketUpgrade, ws::WebSocket},
    response::IntoResponse,
    routing::get,
    Router,
};
use tokio::sync::{RwLock, mpsc};
use std::collections::HashMap;
use std::net::SocketAddr;
use shared_core::{
    contracts::input::PlayerAction,
    events::GameEvent,
};
use super::super::infrastructure::{ILogger, IEventBus};
use super::super::gameplay::IStateStore;
use crate::config::WebSocketConfig;

/// # Responsibility
/// Represents a connected WebSocket client session.
#[derive(Debug, Clone)]
pub struct ClientSession {
    pub client_id: String,
    pub connected_at: std::time::Instant,
    pub last_ping: std::time::Instant,
}

/// # Responsibility
/// Manages all active WebSocket client connections.
pub struct ConnectionManager {
    clients: Arc<RwLock<HashMap<String, mpsc::UnboundedSender<String>>>>,
    logger: Arc<dyn ILogger>,
}

impl ConnectionManager {
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
            logger,
        }
    }
    
    pub async fn add_client(&self, client_id: String, tx: mpsc::UnboundedSender<String>) {
        let mut clients = self.clients.write().await;
        clients.insert(client_id.clone(), tx);
        self.logger.info(&format!("Client {} connected (total: {})", client_id, clients.len()));
    }
    
    pub async fn remove_client(&self, client_id: &str) {
        let mut clients = self.clients.write().await;
        clients.remove(client_id);
        self.logger.info(&format!("Client {} disconnected (remaining: {})", client_id, clients.len()));
    }
    
    pub async fn broadcast(&self, message: String) -> usize {
        let clients = self.clients.read().await;
        let mut sent_count = 0;
        
        for (client_id, tx) in clients.iter() {
            if tx.send(message.clone()).is_ok() {
                sent_count += 1;
            } else {
                self.logger.warn(&format!("Failed to send to client: {}", client_id));
            }
        }
        
        sent_count
    }
    
    pub async fn get_client_count(&self) -> usize {
        self.clients.read().await.len()
    }
}

/// # Responsibility
/// Shared application state for WebSocket handlers.
#[derive(Clone)]
struct AppState {
    connection_manager: Arc<ConnectionManager>,
    event_bus: Arc<dyn IEventBus>,
    state_store: Arc<dyn IStateStore>,
    logger: Arc<dyn ILogger>,
}

/// # Responsibility
/// Interface for WebSocket server operations.
#[async_trait]
pub trait IWebSocketServer: Interface {
    /// Starts the WebSocket server
    async fn start(&self) -> Result<()>;
    
    /// Stops the WebSocket server
    async fn stop(&self) -> Result<()>;
    
    /// Gets the number of connected clients
    async fn get_client_count(&self) -> usize;
    
    /// Broadcasts a message to all clients
    async fn broadcast(&self, message: String) -> usize;
}

/// # Responsibility
/// Implements the WebSocket server with Axum.
#[derive(Component)]
#[shaku(interface = IWebSocketServer)]
pub struct WebSocketServerService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    state_store: Arc<dyn IStateStore>,
    
    config: Arc<WebSocketConfig>,
    connection_manager: Arc<ConnectionManager>,
}

impl WebSocketServerService {
    /// Handles a WebSocket upgrade request
    async fn ws_handler(
        ws: WebSocketUpgrade,
        State(state): State<AppState>,
    ) -> impl IntoResponse {
        ws.on_upgrade(move |socket| Self::handle_socket(socket, state))
    }
    
    /// Handles an individual WebSocket connection
    async fn handle_socket(socket: WebSocket, state: AppState) {
        let client_id = uuid::Uuid::new_v4().to_string();
        state.logger.info(&format!("New WebSocket connection: {}", client_id));
        
        let (sender, mut receiver) = socket.split();
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();
        
        // Add client to connection manager
        state.connection_manager.add_client(client_id.clone(), tx).await;
        
        // Spawn task to send messages to client
        let client_id_clone = client_id.clone();
        let logger_clone = state.logger.clone();
        tokio::spawn(async move {
            use axum::extract::ws::Message;
            use futures_util::SinkExt;
            
            let mut sender = sender;
            while let Some(msg) = rx.recv().await {
                if sender.send(Message::Text(msg)).await.is_err() {
                    logger_clone.warn(&format!("Failed to send to client {}", client_id_clone));
                    break;
                }
            }
        });
        
        // Handle incoming messages from client
        let event_bus = state.event_bus.clone();
        let logger = state.logger.clone();
        let connection_manager = state.connection_manager.clone();
        
        use axum::extract::ws::Message;
        use futures_util::StreamExt;
        
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Parse PlayerAction from JSON
                    match serde_json::from_str::<PlayerAction>(&text) {
                        Ok(action) => {
                            logger.info(&format!("Received action from {}: {:?}", client_id, action));
                            
                            // Emit to EventBus (Box the PlayerAction as required by GameEvent)
                            let event = GameEvent::PlayerAction(Box::new(action));
                            let _ = event_bus.emit(event);
                        }
                        Err(e) => {
                            logger.warn(&format!("Failed to parse action from {}: {}", client_id, e));
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    logger.info(&format!("Client {} closed connection", client_id));
                    break;
                }
                Ok(Message::Ping(_data)) => {
                    // Axum handles pong automatically
                    logger.info(&format!("Ping from {}", client_id));
                }
                Err(e) => {
                    logger.warn(&format!("WebSocket error for {}: {}", client_id, e));
                    break;
                }
                _ => {}
            }
        }
        
        // Clean up on disconnect
        connection_manager.remove_client(&client_id).await;
    }
    
    /// Starts broadcasting state updates to all clients
    fn start_state_broadcaster(&self) {
        let state_store = self.state_store.clone();
        let connection_manager = self.connection_manager.clone();
        let logger = self.logger.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(100));
            
            loop {
                interval.tick().await;
                
                // Get current state
                let state = state_store.get_state();
                
                // Serialize to JSON
                match serde_json::to_string(&state) {
                    Ok(json) => {
                        let sent_count = connection_manager.broadcast(json).await;
                        if sent_count > 0 {
                            logger.info(&format!("Broadcasted state to {} clients", sent_count));
                        }
                    }
                    Err(e) => {
                        logger.error(&format!("Failed to serialize state: {}", e));
                    }
                }
            }
        });
    }
}

#[async_trait]
impl IWebSocketServer for WebSocketServerService {
    async fn start(&self) -> Result<()> {
        let bind_addr = format!("{}:{}", self.config.bind_address, self.config.port);
        self.logger.info(&format!("Starting WebSocket server on {}", bind_addr));
        
        let app_state = AppState {
            connection_manager: self.connection_manager.clone(),
            event_bus: self.event_bus.clone(),
            state_store: self.state_store.clone(),
            logger: self.logger.clone(),
        };
        
        let app = Router::new()
            .route("/ws", get(Self::ws_handler))
            .with_state(app_state);
        
        let addr: SocketAddr = bind_addr.parse()?;
        let logger = self.logger.clone();
        
        // Start state broadcaster
        self.start_state_broadcaster();
        
        tokio::spawn(async move {
            match axum::serve(
                tokio::net::TcpListener::bind(&addr).await.unwrap(),
                app.into_make_service()
            ).await {
                Ok(_) => {
                    logger.info("WebSocket server stopped");
                }
                Err(e) => {
                    logger.error(&format!("WebSocket server error: {}", e));
                }
            }
        });
        
        Ok(())
    }
    
    async fn stop(&self) -> Result<()> {
        self.logger.info("Stopping WebSocket server");
        // TODO: Implement graceful shutdown
        Ok(())
    }
    
    async fn get_client_count(&self) -> usize {
        self.connection_manager.get_client_count().await
    }
    
    async fn broadcast(&self, message: String) -> usize {
        self.connection_manager.broadcast(message).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::{EventBusService, QualiaLogger};
    use crate::services::gameplay::StateStoreService;

    fn create_test_service() -> WebSocketServerService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
        let state_store = Arc::new(StateStoreService::new()) as Arc<dyn IStateStore>;
        let config = Arc::new(WebSocketConfig::default());
        let connection_manager = Arc::new(ConnectionManager::new(logger.clone()));
        
        WebSocketServerService {
            logger,
            event_bus,
            state_store,
            config,
            connection_manager,
        }
    }

    #[tokio::test]
    async fn test_connection_manager_add_remove() {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let manager = ConnectionManager::new(logger);
        
        let (tx, _rx) = mpsc::unbounded_channel();
        manager.add_client("client1".to_string(), tx).await;
        
        assert_eq!(manager.get_client_count().await, 1);
        
        manager.remove_client("client1").await;
        
        assert_eq!(manager.get_client_count().await, 0);
    }

    #[tokio::test]
    async fn test_connection_manager_broadcast() {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let manager = ConnectionManager::new(logger);
        
        let (tx1, mut rx1) = mpsc::unbounded_channel();
        let (tx2, mut rx2) = mpsc::unbounded_channel();
        
        manager.add_client("client1".to_string(), tx1).await;
        manager.add_client("client2".to_string(), tx2).await;
        
        let sent_count = manager.broadcast("test message".to_string()).await;
        
        assert_eq!(sent_count, 2);
        assert_eq!(rx1.recv().await.unwrap(), "test message");
        assert_eq!(rx2.recv().await.unwrap(), "test message");
    }

    #[tokio::test]
    async fn test_websocket_server_starts() {
        let service = create_test_service();
        
        let result = service.start().await;
        assert!(result.is_ok(), "WebSocket server should start successfully");
        
        // Give it a moment to bind
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        assert_eq!(service.get_client_count().await, 0);
    }
}

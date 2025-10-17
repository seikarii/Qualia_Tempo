//! # Responsibility
//! WebSocket server implementation for real-time bidirectional client-server communication.

use shaku::Component;
use async_trait::async_trait;
use anyhow::{Result, Context, bail};
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use std::collections::HashMap;
use uuid::Uuid;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State as AxumState,
    },
    response::IntoResponse,
    Router,
    routing::get,
};
use futures::{StreamExt, SinkExt};
use tracing::{info, warn, error, debug, instrument};
use bincode;

use crate::services::interfaces::{IWebSocketService, IEventBus, ILogger};
use crate::config::ServerConfig;
use shared_core::events::GameEvent;
use shared_core::contracts::PlayerAction;

/// # Responsibility
/// Client connection metadata and communication channel.
#[derive(Debug)]
struct ClientConnection {
    id: Uuid,
    sender: mpsc::UnboundedSender<Vec<u8>>,
    connected_at: std::time::Instant,
}

/// # Responsibility
/// Shared state for WebSocket server.
#[derive(Clone)]
struct WsServerState {
    clients: Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
    event_bus: Arc<dyn IEventBus>,
    logger: Arc<dyn ILogger>,
    config: Arc<ServerConfig>,
}

/// # Responsibility
/// Implements WebSocket server with Axum and tokio-tungstenite.
///
/// ---
///
/// Features:
/// - Binary serialization with bincode for performance
/// - Connection limits enforcement
/// - Heartbeat mechanism (future enhancement)
/// - Graceful disconnect handling
/// - Integration with EventBus for event distribution
#[derive(Component)]
#[shaku(interface = IWebSocketService)]
pub struct WebSocketService {
    config: Arc<ServerConfig>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    clients: Arc<RwLock<HashMap<Uuid, ClientConnection>>>,
    shutdown_tx: Arc<RwLock<Option<mpsc::Sender<()>>>>,
}

impl WebSocketService {
    /// Creates router for WebSocket endpoint.
    fn create_router(&self) -> Router {
        let state = WsServerState {
            clients: Arc::clone(&self.clients),
            event_bus: Arc::clone(&self.event_bus),
            logger: Arc::clone(&self.logger),
            config: Arc::clone(&self.config),
        };
        
        Router::new()
            .route("/ws", get(websocket_handler))
            .with_state(state)
    }
    
    /// Serializes event to binary format.
    fn serialize_event(event: &GameEvent) -> Result<Vec<u8>> {
        bincode::serialize(event).context("Failed to serialize event")
    }
}

#[async_trait]
impl IWebSocketService for WebSocketService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        self.logger.info("Starting WebSocket server");
        
        let app = self.create_router();
        let addr = format!("{}:{}", self.config.websocket.host, self.config.websocket.port);
        
        info!("WebSocket server listening on {}", addr);
        
        let listener = tokio::net::TcpListener::bind(&addr)
            .await
            .context(format!("Failed to bind to {}", addr))?;
        
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel(1);
        *self.shutdown_tx.write().await = Some(shutdown_tx);
        
        tokio::spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(async move {
                    let _ = shutdown_rx.recv().await;
                    info!("Received shutdown signal, stopping WebSocket server");
                })
                .await
                .expect("Server error");
        });
        
        Ok(())
    }
    
    #[instrument(skip(self, event))]
    async fn broadcast_event(&self, event: GameEvent) -> Result<usize> {
        let data = Self::serialize_event(&event)?;
        let clients = self.clients.read().await;
        
        let mut success_count = 0;
        let mut failed_clients = Vec::new();
        
        for (client_id, conn) in clients.iter() {
            if conn.sender.send(data.clone()).is_err() {
                failed_clients.push(*client_id);
                warn!("Failed to send event to client {}", client_id);
            } else {
                success_count += 1;
            }
        }
        
        drop(clients);
        
        // Clean up failed clients
        if !failed_clients.is_empty() {
            let mut clients = self.clients.write().await;
            for client_id in failed_clients {
                clients.remove(&client_id);
                info!("Removed disconnected client {}", client_id);
            }
        }
        
        debug!("Broadcast event to {} clients", success_count);
        Ok(success_count)
    }
    
    #[instrument(skip(self, event))]
    async fn send_to_client(&self, client_id: Uuid, event: GameEvent) -> Result<()> {
        let data = Self::serialize_event(&event)?;
        let clients = self.clients.read().await;
        
        let conn = clients.get(&client_id)
            .context(format!("Client {} not connected", client_id))?;
        
        conn.sender.send(data)
            .map_err(|_| anyhow::anyhow!("Failed to send to client {}", client_id))?;
        
        Ok(())
    }
    
    fn get_connection_count(&self) -> usize {
        // Note: This is a blocking read, should only be called from sync contexts
        // For async contexts, use: tokio::task::block_in_place(|| self.clients.blocking_read().len())
        self.clients.blocking_read().len()
    }
    
    #[instrument(skip(self))]
    async fn disconnect_client(&self, client_id: Uuid) -> Result<()> {
        let mut clients = self.clients.write().await;
        
        if clients.remove(&client_id).is_some() {
            info!("Disconnected client {}", client_id);
            Ok(())
        } else {
            bail!("Client {} not found", client_id)
        }
    }
    
    #[instrument(skip(self))]
    async fn shutdown(&self) -> Result<()> {
        self.logger.info("Shutting down WebSocket server");
        
        // Disconnect all clients
        let mut clients = self.clients.write().await;
        let client_ids: Vec<Uuid> = clients.keys().copied().collect();
        
        for client_id in client_ids {
            clients.remove(&client_id);
            info!("Disconnected client {} during shutdown", client_id);
        }
        
        drop(clients);
        
        // Trigger server shutdown
        if let Some(tx) = self.shutdown_tx.write().await.take() {
            let _ = tx.send(()).await;
        }
        
        Ok(())
    }
}

/// Axum WebSocket handler for new connections.
async fn websocket_handler(
    ws: WebSocketUpgrade,
    AxumState(state): AxumState<WsServerState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handles individual WebSocket connection lifecycle.
#[instrument(skip(socket, state))]
async fn handle_socket(socket: WebSocket, state: WsServerState) {
    let client_id = Uuid::new_v4();
    
    // Check connection limit
    {
        let clients = state.clients.read().await;
        if clients.len() >= state.config.websocket.max_connections {
            warn!("Connection limit reached, rejecting client {}", client_id);
            return;
        }
    }
    
    info!("Client {} connected", client_id);
    
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();
    
    // Register client
    {
        let mut clients = state.clients.write().await;
        clients.insert(client_id, ClientConnection {
            id: client_id,
            sender: tx,
            connected_at: std::time::Instant::now(),
        });
    }
    
    // Spawn sender task (server → client)
    let client_id_send = client_id;
    let send_task = tokio::spawn(async move {
        while let Some(data) = rx.recv().await {
            if sender.send(Message::Binary(data)).await.is_err() {
                debug!("Client {} sender closed", client_id_send);
                break;
            }
        }
    });
    
    // Spawn receiver task (client → server)
    let event_bus = Arc::clone(&state.event_bus);
    let logger = Arc::clone(&state.logger);
    let client_id_recv = client_id;
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Binary(data) => {
                    match bincode::deserialize::<PlayerAction>(&data) {
                        Ok(action) => {
                            debug!("Received action from client {}: {:?}", client_id_recv, action);
                            
                            // Emit to EventBus
                            if let Err(e) = event_bus.emit(GameEvent::PlayerAction(action)) {
                                error!("Failed to emit player action: {:?}", e);
                            }
                        }
                        Err(e) => {
                            warn!("Failed to deserialize action from client {}: {:?}", client_id_recv, e);
                        }
                    }
                }
                Message::Close(_) => {
                    info!("Client {} sent close frame", client_id_recv);
                    break;
                }
                Message::Ping(data) => {
                    // Respond with pong (handled automatically by axum)
                    debug!("Client {} sent ping", client_id_recv);
                }
                Message::Pong(_) => {
                    debug!("Client {} sent pong", client_id_recv);
                }
                _ => {
                    warn!("Client {} sent unexpected message type", client_id_recv);
                }
            }
        }
        logger.info(&format!("Client {} receiver closed", client_id_recv));
    });
    
    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }
    
    // Clean up
    {
        let mut clients = state.clients.write().await;
        clients.remove(&client_id);
    }
    
    info!("Client {} disconnected", client_id);
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;
    use crate::services::tests::mocks::{MockLogger, MockEventBus};
    
    fn create_test_config() -> Arc<ServerConfig> {
        Arc::new(ServerConfig {
            websocket: crate::config::WebSocketConfig {
                host: "127.0.0.1".to_string(),
                port: 9001,
                max_connections: 100,
            },
            metronome: crate::config::MetronomeConfig {
                bpm: 120.0,
                enabled: true,
            },
        })
    }
    
    #[tokio::test]
    async fn test_get_connection_count_empty() {
        let config = create_test_config();
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().return_const(Ok(1));
        
        let service = WebSocketService {
            config,
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            clients: Arc::new(RwLock::new(HashMap::new())),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        assert_eq!(service.get_connection_count(), 0);
    }
    
    #[tokio::test]
    async fn test_broadcast_event_no_clients() {
        let config = create_test_config();
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().return_const(Ok(0));
        
        let service = WebSocketService {
            config,
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            clients: Arc::new(RwLock::new(HashMap::new())),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        let event = GameEvent::QualiaStateUpdated(shared_core::contracts::QualiaState::default());
        let result = service.broadcast_event(event).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
    
    #[tokio::test]
    async fn test_disconnect_client_not_found() {
        let config = create_test_config();
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().return_const(Ok(0));
        
        let service = WebSocketService {
            config,
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            clients: Arc::new(RwLock::new(HashMap::new())),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        let fake_id = Uuid::new_v4();
        let result = service.disconnect_client(fake_id).await;
        
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }
    
    #[tokio::test]
    async fn test_shutdown_disconnects_all_clients() {
        let config = create_test_config();
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().times(3).return_const(()); // start, disconnect, shutdown
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().return_const(Ok(0));
        
        let clients = Arc::new(RwLock::new(HashMap::new()));
        
        // Add mock client
        {
            let (tx, _rx) = mpsc::unbounded_channel();
            let mut clients_lock = clients.write().await;
            clients_lock.insert(Uuid::new_v4(), ClientConnection {
                id: Uuid::new_v4(),
                sender: tx,
                connected_at: std::time::Instant::now(),
            });
        }
        
        let service = WebSocketService {
            config,
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            clients,
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        let result = service.shutdown().await;
        
        assert!(result.is_ok());
        assert_eq!(service.get_connection_count(), 0);
    }
    
    #[test]
    fn test_serialize_event_success() {
        let event = GameEvent::QualiaStateUpdated(shared_core::contracts::QualiaState::default());
        let result = WebSocketService::serialize_event(&event);
        
        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }
}

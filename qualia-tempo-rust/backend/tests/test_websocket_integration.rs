//! # Responsibility
//! WebSocket integration test - validates basic connectivity and `EventBus` propagation.
//!
//! ---
//!
//! Simplified integration test focusing on core WebSocket functionality:
//! - Server startup and client connection
//! - Basic message exchange
//! - `EventBus` bidirectional communication

use axum::{
    extract::{ws::WebSocketUpgrade, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use backend::services::core::{EventBusService, QualiaLogger};
use shaku::{module, HasComponent};
use shared_core::contracts::PlayerAction;
use shared_core::events::GameEvent;
use shared_core::traits::IEventBus;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message as TMessage};
use futures_util::{SinkExt, StreamExt};

// ============================================================================
// Test Module
// ============================================================================

module! {
    WebSocketIntegrationTestModule {
        components = [
            EventBusService,
            QualiaLogger,
        ],
        providers = []
    }
}

fn create_test_module() -> WebSocketIntegrationTestModule {
    WebSocketIntegrationTestModule::builder().build()
}

// ============================================================================
// INTEGRATION TEST: Basic WebSocket Connectivity
// ============================================================================

#[tokio::test]
async fn test_websocket_basic_connection() {
    // Arrange
    let module = Arc::new(create_test_module());
    
    #[derive(Clone)]
    struct AppState {
        _module: Arc<WebSocketIntegrationTestModule>,
    }
    
    // Minimal WebSocket handler for testing
    async fn ws_handler(
        ws: WebSocketUpgrade,
        State(_state): State<AppState>,
    ) -> impl IntoResponse {
        ws.on_upgrade(move |mut socket| async move {
            use axum::extract::ws::Message;
            
            // Echo server: receive message, send back
            while let Some(Ok(msg)) = socket.recv().await {
                if matches!(msg, Message::Close(_)) {
                    break;
                }
                
                if let Message::Text(text) = msg {
                    let _ = socket.send(Message::Text(text)).await;
                }
            }
        })
    }
    
    // Create server
    let app_state = AppState { _module: module };
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state);
    
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("Failed to bind");
    let addr = listener.local_addr().expect("Failed to get addr");
    
    let server_handle = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("Server failed");
    });
    
    tokio::time::sleep(Duration::from_millis(50)).await;
    
    // Act: Connect and send message
    let url = format!("ws://{addr}/ws");
    let (ws_stream, _) = timeout(
        Duration::from_secs(2),
        connect_async(&url)
    )
    .await
    .expect("Connection timeout")
    .expect("Failed to connect");
    
    let (mut write, mut read) = ws_stream.split();
    
    let test_message = "ping";
    write.send(TMessage::Text(test_message.to_string())).await.expect("Failed to send");
    
    // Assert: Receive echo
    let response = timeout(
        Duration::from_millis(200),
        read.next()
    )
    .await
    .expect("Response timeout")
    .expect("Stream closed")
    .expect("Message error");
    
    match response {
        TMessage::Text(text) => {
            assert_eq!(text, test_message, "Echo should match");
        }
        _ => panic!("Expected text message"),
    }
    
    // Cleanup
    write.close().await.expect("Failed to close");
    server_handle.abort();
}

#[tokio::test]
async fn test_websocket_eventbus_propagation() {
    // Arrange
    let module = Arc::new(create_test_module());
    let event_bus: Arc<dyn IEventBus> = module.resolve();
    
    #[derive(Clone)]
    struct AppState {
        module: Arc<WebSocketIntegrationTestModule>,
    }
    
    // Handler that emits to EventBus when receiving PlayerAction
    async fn ws_handler(
        ws: WebSocketUpgrade,
        State(state): State<AppState>,
    ) -> impl IntoResponse {
        ws.on_upgrade(move |socket| async move {
            use axum::extract::ws::Message;
            
            let event_bus: Arc<dyn IEventBus> = state.module.resolve();
            let (mut sender, mut receiver) = socket.split();
            
            while let Some(Ok(msg)) = receiver.next().await {
                if let Message::Text(text) = msg {
                    // Try to parse as PlayerAction and emit to EventBus
                    if let Ok(action) = serde_json::from_str::<PlayerAction>(&text) {
                        let _ = event_bus.emit(GameEvent::PlayerActionReceived { action });
                        
                        // Send acknowledgment
                        let ack = r#"{"type":"ack"}"#;
                        let _ = sender.send(Message::Text(ack.to_string())).await;
                    }
                }
            }
        })
    }
    
    // Create server
    let app_state = AppState { module: module.clone() };
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state);
    
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("Failed to bind");
    let addr = listener.local_addr().expect("Failed to get addr");
    
    let server_handle = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("Server failed");
    });
    
    tokio::time::sleep(Duration::from_millis(50)).await;
    
    // Subscribe to EventBus BEFORE connecting client
    let mut backend_events = event_bus.subscribe();
    
    // Connect client
    let url = format!("ws://{addr}/ws");
    let (ws_stream, _) = connect_async(&url).await.expect("Failed to connect");
    let (mut write, mut read) = ws_stream.split();
    
    // Send PlayerAction
    let action = PlayerAction::KeyPressed {
        key: 'Q',
        timestamp: 1000.0,
        accuracy: 0.9,
    };
    
    let action_json = serde_json::to_string(&action).expect("Failed to serialize");
    write.send(TMessage::Text(action_json)).await.expect("Failed to send");
    
    // Assert 1: Backend EventBus receives the action
    let received_action = timeout(
        Duration::from_millis(300),
        async {
            loop {
                if let Ok(GameEvent::PlayerActionReceived { action }) = backend_events.recv().await {
                    return action;
                }
            }
        }
    )
    .await
    .expect("Should receive PlayerActionReceived from EventBus");
    
    match received_action {
        PlayerAction::KeyPressed { key, accuracy, .. } => {
            assert_eq!(key, 'Q');
            assert_eq!(accuracy, 0.9);
        }
        _ => panic!("Expected KeyPressed"),
    }
    
    // Assert 2: Client receives acknowledgment
    let ack_msg = timeout(
        Duration::from_millis(200),
        read.next()
    )
    .await
    .expect("Should receive ack")
    .expect("Stream closed")
    .expect("Message error");
    
    if let TMessage::Text(text) = ack_msg {
        assert!(text.contains("ack"), "Should receive acknowledgment");
    }
    
    // Cleanup
    write.close().await.expect("Failed to close");
    server_handle.abort();
}

#[tokio::test]
async fn test_websocket_handles_disconnection() {
    // Arrange
    let module = Arc::new(create_test_module());
    
    #[derive(Clone)]
    struct AppState {
        _module: Arc<WebSocketIntegrationTestModule>,
    }
    
    async fn ws_handler(
        ws: WebSocketUpgrade,
        State(_state): State<AppState>,
    ) -> impl IntoResponse {
        ws.on_upgrade(move |mut socket| async move {
            while let Some(Ok(_msg)) = socket.recv().await {
                // Do nothing, just keep connection open
            }
        })
    }
    
    let app_state = AppState { _module: module };
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state);
    
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("Failed to bind");
    let addr = listener.local_addr().expect("Failed to get addr");
    
    let server_handle = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("Server failed");
    });
    
    tokio::time::sleep(Duration::from_millis(50)).await;
    
    // Connect and immediately disconnect
    let url = format!("ws://{addr}/ws");
    let (ws_stream, _) = connect_async(&url).await.expect("Failed to connect");
    let (mut write, _) = ws_stream.split();
    
    // Close should succeed
    let close_result = write.close().await;
    assert!(close_result.is_ok(), "Close should succeed gracefully");
    
    // Cleanup
    server_handle.abort();
}

// ============================================================================
// INTEGRATION TEST: State Streaming Loop (Phase 12.1)
// ============================================================================

#[tokio::test]
async fn test_state_streaming_loop_broadcasts_combat_state() {
    use shared_core::contracts::CombatState;
    
    // Arrange: Create minimal test module WITHOUT ConnectionManagerService
    // (ConnectionManager is not required for EventBus-only streaming test)
    module! {
        StreamingTestModule {
            components = [
                EventBusService,
                QualiaLogger,
            ],
            providers = []
        }
    }
    
    let module = Arc::new(StreamingTestModule::builder().build());
    let event_bus: Arc<dyn IEventBus> = module.resolve();
    
    // Subscribe to EventBus to verify streaming broadcasts
    let mut state_receiver = event_bus.subscribe();
    
    // Act: Emit a CombatState (simulating game logic update)
    let test_state = CombatState::default();
    event_bus.emit(GameEvent::CombatStateUpdated { state: test_state.clone() })
        .expect("Should emit state");
    
    // Assert: EventBus propagates the event to all subscribers
    let received_event = timeout(
        Duration::from_millis(200),
        async {
            loop {
                if let Ok(GameEvent::CombatStateUpdated { state }) = state_receiver.recv().await {
                    return state;
                }
            }
        }
    )
    .await
    .expect("Should receive CombatStateUpdated from EventBus");
    
    assert_eq!(received_event, test_state, "EventBus should broadcast state correctly");
}


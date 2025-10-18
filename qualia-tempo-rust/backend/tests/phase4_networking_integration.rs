//! # Responsibility
//! Phase 4 integration tests for networking stack.
//!
//! ---
//!
//! Validates WebSocket server, state streaming, and connection management
//! working together as a cohesive system.

use std::sync::Arc;
use backend::services::core::{EventBusService, QualiaLogger};
use backend::services::networking::{WebSocketService, GameStateStreamingService, ConnectionManagerService};
use backend::services::interfaces::{IEventBus, ILogger};
use shared_core::traits::{IWebSocketService, IGameStateStreamingService, IConnectionManagerService};
use shared_core::events::GameEvent;
use shared_core::contracts::QualiaState;
use uuid::Uuid;

#[tokio::test]
async fn test_phase4_websocket_service_broadcasts() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let ws_service: Arc<WebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
    
    // Subscribe multiple clients
    let mut rx1 = ws_service.subscribe();
    let mut rx2 = ws_service.subscribe();
    
    assert_eq!(ws_service.connection_count(), 2);
    
    // Broadcast message
    let message = "phase4_test_message".to_string();
    let result = ws_service.broadcast(message.clone()).await;
    
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 2);
    
    // Both clients receive
    assert_eq!(rx1.try_recv().unwrap(), message);
    assert_eq!(rx2.try_recv().unwrap(), message);
    
    // Unsubscribe
    ws_service.unsubscribe();
    ws_service.unsubscribe();
    assert_eq!(ws_service.connection_count(), 0);
}

#[tokio::test]
async fn test_phase4_state_streaming_service_lifecycle() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::new(100));
    let ws_service: Arc<WebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
    
    let streaming: Arc<dyn IGameStateStreamingService> = Arc::new(
        GameStateStreamingService::new(ws_service.clone(), event_bus.clone(), logger.clone())
    );
    
    // Start service
    let result = streaming.start().await;
    assert!(result.is_ok());
    
    // Stop service
    let result = streaming.stop().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_phase4_connection_manager_full_lifecycle() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let manager: Arc<dyn IConnectionManagerService> = Arc::new(
        ConnectionManagerService::new(logger.clone())
    );
    
    let conn_id = Uuid::new_v4();
    let room_id = "test_room".to_string();
    
    // Register
    manager.register_connection(conn_id, Some(room_id.clone())).await.unwrap();
    assert_eq!(manager.active_connection_count(), 1);
    
    // Get room connections
    let room_conns = manager.get_room_connections(&room_id).await.unwrap();
    assert_eq!(room_conns.len(), 1);
    assert!(room_conns.contains(&conn_id));
    
    // Move to another room
    let new_room = "new_room".to_string();
    manager.move_to_room(conn_id, new_room.clone()).await.unwrap();
    
    let old_room_conns = manager.get_room_connections(&room_id).await.unwrap();
    assert_eq!(old_room_conns.len(), 0);
    
    let new_room_conns = manager.get_room_connections(&new_room).await.unwrap();
    assert_eq!(new_room_conns.len(), 1);
    
    // Unregister
    manager.unregister_connection(conn_id).await.unwrap();
    assert_eq!(manager.active_connection_count(), 0);
}

#[tokio::test]
async fn test_phase4_event_bus_to_websocket_integration() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::new(100));
    let ws_service: Arc<WebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
    
    let streaming: Arc<dyn IGameStateStreamingService> = Arc::new(
        GameStateStreamingService::new(ws_service.clone(), event_bus.clone(), logger.clone())
    );
    
    // Subscribe WebSocket client
    let mut rx = ws_service.subscribe();
    
    // Start streaming service
    streaming.start().await.unwrap();
    
    // Give streaming service time to subscribe to EventBus
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    
    // Emit game event
    let qualia_state = QualiaState::default();
    let event = GameEvent::QualiaStateUpdated { state: qualia_state };
    event_bus.emit(event).unwrap();
    
    // Wait for message propagation
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    
    // WebSocket client should receive serialized event
    let received = rx.try_recv();
    assert!(received.is_ok(), "Should receive message from streaming service");
    
    let message = received.unwrap();
    assert!(message.contains("qualiaState"), "Message should contain qualiaState type");
    
    // Cleanup
    streaming.stop().await.unwrap();
}

#[tokio::test]
async fn test_phase4_connection_cleanup() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let manager: Arc<dyn IConnectionManagerService> = Arc::new(
        ConnectionManagerService::new(logger.clone())
    );
    
    let conn_id = Uuid::new_v4();
    manager.register_connection(conn_id, None).await.unwrap();
    
    // Immediately cleanup (connection just registered, should not be cleaned)
    let cleaned = manager.cleanup_dead_connections().await.unwrap();
    assert_eq!(cleaned, 0);
    
    // Connection still exists
    assert_eq!(manager.active_connection_count(), 1);
}

#[tokio::test]
async fn test_phase4_multiple_rooms() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let manager: Arc<dyn IConnectionManagerService> = Arc::new(
        ConnectionManagerService::new(logger.clone())
    );
    
    let conn1 = Uuid::new_v4();
    let conn2 = Uuid::new_v4();
    let conn3 = Uuid::new_v4();
    
    manager.register_connection(conn1, Some("room_a".to_string())).await.unwrap();
    manager.register_connection(conn2, Some("room_a".to_string())).await.unwrap();
    manager.register_connection(conn3, Some("room_b".to_string())).await.unwrap();
    
    assert_eq!(manager.room_count(), 2);
    
    let room_a_conns = manager.get_room_connections("room_a").await.unwrap();
    assert_eq!(room_a_conns.len(), 2);
    
    let room_b_conns = manager.get_room_connections("room_b").await.unwrap();
    assert_eq!(room_b_conns.len(), 1);
}

#[tokio::test]
async fn test_phase4_broadcast_performance() {
    let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::new());
    let ws_service: Arc<WebSocketService> = Arc::new(WebSocketService::new(1000, logger.clone()));
    
    // Simulate 100 concurrent clients
    let mut receivers = Vec::new();
    for _ in 0..100 {
        receivers.push(ws_service.subscribe());
    }
    
    assert_eq!(ws_service.connection_count(), 100);
    
    // Benchmark broadcast time
    let start = std::time::Instant::now();
    
    let message = "performance_test".to_string();
    ws_service.broadcast(message.clone()).await.unwrap();
    
    let elapsed = start.elapsed();
    
    // Broadcasting to 100 clients should be < 1ms
    assert!(elapsed.as_millis() < 10, "Broadcast took {:?}ms (should be <10ms)", elapsed.as_millis());
    
    // Verify all received
    for mut rx in receivers {
        assert_eq!(rx.try_recv().unwrap(), message);
    }
}

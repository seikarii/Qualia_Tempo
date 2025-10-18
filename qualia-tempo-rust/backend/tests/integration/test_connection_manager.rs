//! # Responsibility
//! Integration tests for ConnectionManagerService.
//!
//! ---
//!
//! Verifies ConnectionManagerService correctly tracks connections,
//! manages rooms, and handles concurrent access patterns.

use backend::services::networking::ConnectionManagerService;
use backend::services::core::QualiaLogger;
use shared_core::traits::IConnectionManagerService;
use std::sync::Arc;
use uuid::Uuid;

#[tokio::test]
async fn test_concurrent_registration() {
    let logger = Arc::new(QualiaLogger::new());
    let manager = ConnectionManagerService::new(logger);
    
    // Spawn 100 concurrent registration tasks
    let mut handles = vec![];
    
    for i in 0..100 {
        let manager_clone = manager.clone();
        let handle = tokio::spawn(async move {
            let conn_id = Uuid::new_v4();
            let room = format!("room_{}", i % 10); // 10 rooms total
            manager_clone.register_connection(conn_id, Some(room)).await.unwrap();
            conn_id
        });
        handles.push(handle);
    }
    
    // Wait for all registrations
    for handle in handles {
        handle.await.unwrap();
    }
    
    // Should have 100 connections
    assert_eq!(manager.active_connection_count(), 100);
    
    // Should have 10 rooms
    assert_eq!(manager.room_count(), 10);
}

#[tokio::test]
async fn test_room_isolation() {
    let logger = Arc::new(QualiaLogger::new());
    let manager = ConnectionManagerService::new(logger);
    
    // Create connections in separate rooms
    let room_a_conn1 = Uuid::new_v4();
    let room_a_conn2 = Uuid::new_v4();
    let room_b_conn1 = Uuid::new_v4();
    
    manager.register_connection(room_a_conn1, Some("room_a".to_string())).await.unwrap();
    manager.register_connection(room_a_conn2, Some("room_a".to_string())).await.unwrap();
    manager.register_connection(room_b_conn1, Some("room_b".to_string())).await.unwrap();
    
    // Verify room isolation
    let room_a_conns = manager.get_room_connections("room_a").await.unwrap();
    let room_b_conns = manager.get_room_connections("room_b").await.unwrap();
    
    assert_eq!(room_a_conns.len(), 2);
    assert_eq!(room_b_conns.len(), 1);
    
    assert!(room_a_conns.contains(&room_a_conn1));
    assert!(room_a_conns.contains(&room_a_conn2));
    assert!(!room_a_conns.contains(&room_b_conn1));
    
    assert!(room_b_conns.contains(&room_b_conn1));
    assert!(!room_b_conns.contains(&room_a_conn1));
}

#[tokio::test]
async fn test_heartbeat_prevents_cleanup() {
    let logger = Arc::new(QualiaLogger::new());
    let manager = ConnectionManagerService::new(logger);
    
    let conn_id = Uuid::new_v4();
    manager.register_connection(conn_id, Some("test_room".to_string())).await.unwrap();
    
    // Simulate periodic heartbeats
    for _ in 0..5 {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        manager.update_heartbeat(conn_id).await.unwrap();
    }
    
    // Should NOT be cleaned up (heartbeats within 30s threshold)
    let cleaned = manager.cleanup_dead_connections().await.unwrap();
    assert_eq!(cleaned, 0);
    assert_eq!(manager.active_connection_count(), 1);
}

#[tokio::test]
async fn test_move_connection_between_rooms() {
    let logger = Arc::new(QualiaLogger::new());
    let manager = ConnectionManagerService::new(logger);
    
    let conn_id = Uuid::new_v4();
    manager.register_connection(conn_id, Some("lobby".to_string())).await.unwrap();
    
    // Verify in lobby
    let lobby_conns = manager.get_room_connections("lobby").await.unwrap();
    assert_eq!(lobby_conns.len(), 1);
    
    // Move to game room
    manager.move_to_room(conn_id, "game_room".to_string()).await.unwrap();
    
    // Verify moved
    let lobby_conns = manager.get_room_connections("lobby").await.unwrap();
    let game_conns = manager.get_room_connections("game_room").await.unwrap();
    
    assert_eq!(lobby_conns.len(), 0);
    assert_eq!(game_conns.len(), 1);
    assert!(game_conns.contains(&conn_id));
}

#[tokio::test]
async fn test_error_on_invalid_operations() {
    let logger = Arc::new(QualiaLogger::new());
    let manager = ConnectionManagerService::new(logger);
    
    let nonexistent_id = Uuid::new_v4();
    
    // Unregister nonexistent should fail
    let result = manager.unregister_connection(nonexistent_id).await;
    assert!(result.is_err());
    
    // Move nonexistent should fail
    let result = manager.move_to_room(nonexistent_id, "new_room".to_string()).await;
    assert!(result.is_err());
    
    // Update heartbeat for nonexistent should fail
    let result = manager.update_heartbeat(nonexistent_id).await;
    assert!(result.is_err());
}

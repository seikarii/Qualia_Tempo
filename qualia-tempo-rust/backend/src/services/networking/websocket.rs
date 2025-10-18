//! # Responsibility
//! Implements WebSocket connection management using Axum and broadcast channels.
//!
//! ---
//!
//! This service manages all WebSocket connections and provides lock-free message
//! broadcasting to all connected clients using tokio::sync::broadcast.

use shaku::Component;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::broadcast;
use tracing::{instrument, debug, warn};
use anyhow::Result;
use shared_core::traits::IWebSocketService;
use crate::services::interfaces::ILogger;
use async_trait::async_trait;

/// # Responsibility
/// Manages WebSocket client connections and message broadcasting.
///
/// ---
///
/// Uses broadcast channel for efficient message distribution to multiple clients.
/// Connection count is tracked atomically for thread-safe access.
#[derive(Component)]
#[shaku(interface = IWebSocketService)]
pub struct WebSocketService {
    tx: broadcast::Sender<String>,
    connection_count: Arc<AtomicUsize>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

impl WebSocketService {
    /// Creates a new WebSocketService with specified channel capacity
    pub fn new(capacity: usize, logger: Arc<dyn ILogger>) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self {
            tx,
            connection_count: Arc::new(AtomicUsize::new(0)),
            logger,
        }
    }
    
    /// Subscribes a new client connection
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.connection_count.fetch_add(1, Ordering::Relaxed);
        self.logger.info(&format!(
            "Client connected. Total connections: {}",
            self.connection_count()
        ));
        self.tx.subscribe()
    }
    
    /// Unsubscribes a client connection
    pub fn unsubscribe(&self) {
        self.connection_count.fetch_sub(1, Ordering::Relaxed);
        self.logger.info(&format!(
            "Client disconnected. Total connections: {}",
            self.connection_count()
        ));
    }
}

#[async_trait]
impl IWebSocketService for WebSocketService {
    #[instrument(skip(self, message))]
    async fn broadcast(&self, message: String) -> Result<usize> {
        debug!("Broadcasting message of length: {} bytes", message.len());
        
        match self.tx.send(message) {
            Ok(receiver_count) => {
                debug!("Message broadcasted to {} clients", receiver_count);
                Ok(receiver_count)
            }
            Err(e) => {
                warn!("Failed to broadcast message (no receivers): {:?}", e);
                Ok(0)
            }
        }
    }
    
    fn connection_count(&self) -> usize {
        self.connection_count.load(Ordering::Relaxed)
    }
}

// Default implementation removed to prevent accidental instantiation
// WebSocketService MUST be created via DI container with proper logger injection

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::QualiaLogger;
    
    #[tokio::test]
    async fn test_broadcast_with_no_clients() {
        let logger = Arc::new(QualiaLogger::default());
        let service = WebSocketService::new(100, logger);
        
        let result = service.broadcast("test message".to_string()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0); // No clients connected
    }
    
    #[tokio::test]
    async fn test_broadcast_with_multiple_clients() {
        let logger = Arc::new(QualiaLogger::default());
        let service = WebSocketService::new(100, logger);
        
        let mut rx1 = service.subscribe();
        let mut rx2 = service.subscribe();
        
        assert_eq!(service.connection_count(), 2);
        
        let message = "broadcast test".to_string();
        let result = service.broadcast(message.clone()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 2);
        
        // Both clients should receive the message
        assert_eq!(rx1.try_recv().unwrap(), message);
        assert_eq!(rx2.try_recv().unwrap(), message);
    }
    
    #[tokio::test]
    async fn test_client_unsubscribe() {
        let logger = Arc::new(QualiaLogger::default());
        let service = WebSocketService::new(100, logger);
        
        let _rx = service.subscribe();
        assert_eq!(service.connection_count(), 1);
        
        service.unsubscribe();
        assert_eq!(service.connection_count(), 0);
    }
    
    #[tokio::test]
    async fn test_lagging_client() {
        let logger = Arc::new(QualiaLogger::default());
        let service = WebSocketService::new(2, logger); // Small capacity
        
        let mut rx = service.subscribe();
        
        // Fill buffer beyond capacity
        service.broadcast("message1".to_string()).await.ok();
        service.broadcast("message2".to_string()).await.ok();
        service.broadcast("message3".to_string()).await.ok();
        
        // Client should detect lag
        match rx.try_recv() {
            Err(broadcast::error::TryRecvError::Lagged(n)) => {
                assert!(n > 0, "Should report lagging");
            }
            _ => panic!("Expected Lagged error"),
        }
    }
    
    #[tokio::test]
    async fn test_large_message_broadcast() {
        let logger = Arc::new(QualiaLogger::default());
        let service = WebSocketService::new(100, logger);
        
        let mut rx = service.subscribe();
        
        // Create a large message (10KB)
        let large_message = "x".repeat(10_000);
        let result = service.broadcast(large_message.clone()).await;
        
        assert!(result.is_ok());
        assert_eq!(rx.try_recv().unwrap(), large_message);
    }
}

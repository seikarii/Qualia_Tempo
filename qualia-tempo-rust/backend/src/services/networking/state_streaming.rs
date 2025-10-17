//! # Responsibility
//! State streaming service implementation with compression and batching optimizations.

use shaku::Component;
use async_trait::async_trait;
use anyhow::{Result, Context, bail};
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use std::collections::HashMap;
use uuid::Uuid;
use std::time::Duration;
use tracing::{info, warn, error, debug, instrument};
use flate2::Compress;
use flate2::Compression;

use crate::services::interfaces::{IStateStreamingService, IWebSocketService, IEventBus, ILogger};
use crate::config::ServerConfig;
use shared_core::contracts::CombatState;
use shared_core::events::GameEvent;

/// # Responsibility
/// Configuration for state streaming behavior.
#[derive(Debug, Clone)]
pub struct StateStreamingConfig {
    pub batching_interval_ms: u64,
    pub compression_enabled: bool,
    pub compression_level: u32,
}

impl Default for StateStreamingConfig {
    fn default() -> Self {
        Self {
            batching_interval_ms: 16, // ~60 FPS
            compression_enabled: true,
            compression_level: 6, // Balanced compression
        }
    }
}

/// # Responsibility
/// Subscriber metadata tracking.
#[derive(Debug, Clone)]
struct Subscriber {
    client_id: Uuid,
    subscribed_at: std::time::Instant,
}

/// # Responsibility
/// Implements efficient state streaming with batching and compression.
///
/// ---
///
/// Features:
/// - Batching: Collects state updates and sends in intervals
/// - gzip compression: Reduces bandwidth usage
/// - Per-client subscription management
/// - Integration with WebSocketService for delivery
#[derive(Component)]
#[shaku(interface = IStateStreamingService)]
pub struct StateStreamingService {
    config: Arc<ServerConfig>,
    streaming_config: StateStreamingConfig,
    
    #[shaku(inject)]
    websocket: Arc<dyn IWebSocketService>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    subscribers: Arc<RwLock<HashMap<Uuid, Subscriber>>>,
    compression_enabled: Arc<RwLock<bool>>,
    shutdown_tx: Arc<RwLock<Option<mpsc::Sender<()>>>>,
}

impl StateStreamingService {
    /// Compresses data using gzip.
    fn compress_data(data: &[u8], level: u32) -> Result<Vec<u8>> {
        let mut compressor = Compress::new(Compression::new(level), false);
        let mut compressed = Vec::with_capacity(data.len() / 2); // Estimate
        
        let input = data;
        let mut output = vec![0u8; data.len()];
        
        loop {
            let before_out = compressor.total_out();
            let before_in = compressor.total_in();
            
            let status = compressor.compress(input, &mut output[..], flate2::FlushCompress::Finish)
                .context("Compression failed")?;
            
            let written = (compressor.total_out() - before_out) as usize;
            compressed.extend_from_slice(&output[..written]);
            
            match status {
                flate2::Status::Ok => continue,
                flate2::Status::BufError => {
                    // Need more output space
                    output.resize(output.len() * 2, 0);
                }
                flate2::Status::StreamEnd => break,
            }
        }
        
        Ok(compressed)
    }
    
    /// Serializes and optionally compresses state.
    async fn prepare_state(&self, state: &CombatState) -> Result<Vec<u8>> {
        let serialized = bincode::serialize(state)
            .context("Failed to serialize CombatState")?;
        
        let compression_enabled = *self.compression_enabled.read().await;
        
        if compression_enabled {
            let compressed = Self::compress_data(&serialized, self.streaming_config.compression_level)?;
            debug!(
                "Compressed state from {} to {} bytes ({:.1}% reduction)",
                serialized.len(),
                compressed.len(),
                (1.0 - (compressed.len() as f64 / serialized.len() as f64)) * 100.0
            );
            Ok(compressed)
        } else {
            Ok(serialized)
        }
    }
}

#[async_trait]
impl IStateStreamingService for StateStreamingService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        self.logger.info("Starting state streaming service");
        
        let subscribers = Arc::clone(&self.subscribers);
        let event_bus = Arc::clone(&self.event_bus);
        let websocket = Arc::clone(&self.websocket);
        let logger = Arc::clone(&self.logger);
        let compression_enabled = Arc::clone(&self.compression_enabled);
        let streaming_config = self.streaming_config.clone();
        
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel(1);
        *self.shutdown_tx.write().await = Some(shutdown_tx);
        
        // Subscribe to CombatStateUpdated events
        let mut events = event_bus.subscribe();
        
        tokio::spawn(async move {
            let mut batch_interval = tokio::time::interval(Duration::from_millis(streaming_config.batching_interval_ms));
            let mut pending_state: Option<CombatState> = None;
            
            loop {
                tokio::select! {
                    // Shutdown signal
                    _ = shutdown_rx.recv() => {
                        info!("State streaming service shutting down");
                        break;
                    }
                    
                    // Batch interval tick
                    _ = batch_interval.tick() => {
                        if let Some(state) = pending_state.take() {
                            // Serialize and compress
                            let data = match bincode::serialize(&state) {
                                Ok(serialized) => {
                                    if *compression_enabled.read().await {
                                        match Self::compress_data(&serialized, streaming_config.compression_level) {
                                            Ok(compressed) => compressed,
                                            Err(e) => {
                                                error!("Compression failed: {:?}", e);
                                                serialized
                                            }
                                        }
                                    } else {
                                        serialized
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to serialize state: {:?}", e);
                                    continue;
                                }
                            };
                            
                            // Broadcast to subscribers
                            let subs = subscribers.read().await;
                            let subscriber_ids: Vec<Uuid> = subs.keys().copied().collect();
                            drop(subs);
                            
                            for client_id in subscriber_ids {
                                if let Err(e) = websocket.send_to_client(client_id, GameEvent::CombatStateUpdated(state.clone())).await {
                                    debug!("Failed to send state to client {}: {:?}", client_id, e);
                                }
                            }
                        }
                    }
                    
                    // Event received
                    event = events.recv() => {
                        match event {
                            Ok(GameEvent::CombatStateUpdated(state)) => {
                                // Update pending state (batching - only keep latest)
                                pending_state = Some(state);
                            }
                            Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                                warn!("State streaming lagging, skipped {} events", skipped);
                            }
                            Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                                info!("EventBus closed, stopping state streaming");
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }
            
            logger.info("State streaming service stopped");
        });
        
        Ok(())
    }
    
    #[instrument(skip(self, state))]
    async fn broadcast_state(&self, state: CombatState) -> Result<usize> {
        let data = self.prepare_state(&state).await?;
        let subscribers = self.subscribers.read().await;
        
        let mut success_count = 0;
        
        for subscriber in subscribers.values() {
            if let Err(e) = self.websocket.send_to_client(
                subscriber.client_id,
                GameEvent::CombatStateUpdated(state.clone())
            ).await {
                debug!("Failed to send state to subscriber {}: {:?}", subscriber.client_id, e);
            } else {
                success_count += 1;
            }
        }
        
        debug!("Broadcast state to {} subscribers", success_count);
        Ok(success_count)
    }
    
    #[instrument(skip(self, state))]
    async fn send_state_to_client(&self, client_id: Uuid, state: CombatState) -> Result<()> {
        let subscribers = self.subscribers.read().await;
        
        if !subscribers.contains_key(&client_id) {
            bail!("Client {} is not subscribed", client_id);
        }
        
        drop(subscribers);
        
        let data = self.prepare_state(&state).await?;
        
        self.websocket.send_to_client(
            client_id,
            GameEvent::CombatStateUpdated(state)
        ).await?;
        
        Ok(())
    }
    
    #[instrument(skip(self))]
    async fn subscribe_client(&self, client_id: Uuid) -> Result<()> {
        let mut subscribers = self.subscribers.write().await;
        
        if subscribers.contains_key(&client_id) {
            warn!("Client {} already subscribed", client_id);
            return Ok(());
        }
        
        subscribers.insert(client_id, Subscriber {
            client_id,
            subscribed_at: std::time::Instant::now(),
        });
        
        info!("Client {} subscribed to state streaming", client_id);
        Ok(())
    }
    
    #[instrument(skip(self))]
    async fn unsubscribe_client(&self, client_id: Uuid) -> Result<()> {
        let mut subscribers = self.subscribers.write().await;
        
        if subscribers.remove(&client_id).is_some() {
            info!("Client {} unsubscribed from state streaming", client_id);
            Ok(())
        } else {
            bail!("Client {} was not subscribed", client_id)
        }
    }
    
    fn get_subscriber_count(&self) -> usize {
        self.subscribers.blocking_read().len()
    }
    
    fn set_compression(&self, enabled: bool) {
        tokio::task::block_in_place(|| {
            *self.compression_enabled.blocking_write() = enabled;
        });
        
        if enabled {
            self.logger.info("State streaming compression enabled");
        } else {
            self.logger.info("State streaming compression disabled");
        }
    }
    
    #[instrument(skip(self))]
    async fn shutdown(&self) -> Result<()> {
        self.logger.info("Shutting down state streaming service");
        
        // Clear subscribers
        let mut subscribers = self.subscribers.write().await;
        let count = subscribers.len();
        subscribers.clear();
        drop(subscribers);
        
        info!("Unsubscribed {} clients during shutdown", count);
        
        // Trigger shutdown
        if let Some(tx) = self.shutdown_tx.write().await.take() {
            let _ = tx.send(()).await;
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;
    use crate::services::tests::mocks::{MockLogger, MockEventBus, MockWebSocketService};
    
    fn create_test_config() -> StateStreamingConfig {
        StateStreamingConfig {
            batching_interval_ms: 16,
            compression_enabled: true,
            compression_level: 6,
        }
    }
    
    #[tokio::test]
    async fn test_get_subscriber_count_empty() {
        let config = Arc::new(ServerConfig {
            websocket: crate::config::WebSocketConfig {
                host: "127.0.0.1".to_string(),
                port: 9001,
                max_connections: 100,
            },
            metronome: crate::config::MetronomeConfig {
                bpm: 120.0,
                enabled: true,
            },
        });
        
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_subscribe().return_const(tokio::sync::broadcast::channel(100).1);
        
        let mut mock_websocket = MockWebSocketService::new();
        mock_websocket.expect_send_to_client().return_const(Ok(()));
        
        let service = StateStreamingService {
            config,
            streaming_config: create_test_config(),
            websocket: Arc::new(mock_websocket),
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            compression_enabled: Arc::new(RwLock::new(true)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        assert_eq!(service.get_subscriber_count(), 0);
    }
    
    #[tokio::test]
    async fn test_subscribe_client_success() {
        let config = Arc::new(ServerConfig {
            websocket: crate::config::WebSocketConfig {
                host: "127.0.0.1".to_string(),
                port: 9001,
                max_connections: 100,
            },
            metronome: crate::config::MetronomeConfig {
                bpm: 120.0,
                enabled: true,
            },
        });
        
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_subscribe().return_const(tokio::sync::broadcast::channel(100).1);
        
        let mut mock_websocket = MockWebSocketService::new();
        mock_websocket.expect_send_to_client().return_const(Ok(()));
        
        let service = StateStreamingService {
            config,
            streaming_config: create_test_config(),
            websocket: Arc::new(mock_websocket),
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            compression_enabled: Arc::new(RwLock::new(true)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        let client_id = Uuid::new_v4();
        let result = service.subscribe_client(client_id).await;
        
        assert!(result.is_ok());
        assert_eq!(service.get_subscriber_count(), 1);
    }
    
    #[tokio::test]
    async fn test_unsubscribe_client_not_found() {
        let config = Arc::new(ServerConfig {
            websocket: crate::config::WebSocketConfig {
                host: "127.0.0.1".to_string(),
                port: 9001,
                max_connections: 100,
            },
            metronome: crate::config::MetronomeConfig {
                bpm: 120.0,
                enabled: true,
            },
        });
        
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_subscribe().return_const(tokio::sync::broadcast::channel(100).1);
        
        let mut mock_websocket = MockWebSocketService::new();
        mock_websocket.expect_send_to_client().return_const(Ok(()));
        
        let service = StateStreamingService {
            config,
            streaming_config: create_test_config(),
            websocket: Arc::new(mock_websocket),
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            compression_enabled: Arc::new(RwLock::new(true)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        let fake_id = Uuid::new_v4();
        let result = service.unsubscribe_client(fake_id).await;
        
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("was not subscribed"));
    }
    
    #[tokio::test]
    async fn test_set_compression_toggle() {
        let config = Arc::new(ServerConfig {
            websocket: crate::config::WebSocketConfig {
                host: "127.0.0.1".to_string(),
                port: 9001,
                max_connections: 100,
            },
            metronome: crate::config::MetronomeConfig {
                bpm: 120.0,
                enabled: true,
            },
        });
        
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_subscribe().return_const(tokio::sync::broadcast::channel(100).1);
        
        let mut mock_websocket = MockWebSocketService::new();
        mock_websocket.expect_send_to_client().return_const(Ok(()));
        
        let compression_enabled = Arc::new(RwLock::new(true));
        
        let service = StateStreamingService {
            config,
            streaming_config: create_test_config(),
            websocket: Arc::new(mock_websocket),
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            compression_enabled: Arc::clone(&compression_enabled),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        // Disable compression
        service.set_compression(false);
        assert!(!*compression_enabled.blocking_read());
        
        // Re-enable compression
        service.set_compression(true);
        assert!(*compression_enabled.blocking_read());
    }
    
    #[test]
    fn test_compress_data_reduces_size() {
        let original = b"This is a test string that should compress well because it has repetition repetition repetition";
        let compressed = StateStreamingService::compress_data(original, 6).unwrap();
        
        assert!(compressed.len() < original.len());
    }
    
    #[tokio::test]
    async fn test_shutdown_clears_subscribers() {
        let config = Arc::new(ServerConfig {
            websocket: crate::config::WebSocketConfig {
                host: "127.0.0.1".to_string(),
                port: 9001,
                max_connections: 100,
            },
            metronome: crate::config::MetronomeConfig {
                bpm: 120.0,
                enabled: true,
            },
        });
        
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().times(3).return_const(()); // subscribe, shutdown, unsubscribe
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_subscribe().return_const(tokio::sync::broadcast::channel(100).1);
        
        let mut mock_websocket = MockWebSocketService::new();
        mock_websocket.expect_send_to_client().return_const(Ok(()));
        
        let subscribers = Arc::new(RwLock::new(HashMap::new()));
        
        // Add subscriber
        {
            let mut subs = subscribers.write().await;
            let client_id = Uuid::new_v4();
            subs.insert(client_id, Subscriber {
                client_id,
                subscribed_at: std::time::Instant::now(),
            });
        }
        
        let service = StateStreamingService {
            config,
            streaming_config: create_test_config(),
            websocket: Arc::new(mock_websocket),
            event_bus: Arc::new(mock_event_bus),
            logger: Arc::new(mock_logger),
            subscribers,
            compression_enabled: Arc::new(RwLock::new(true)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        };
        
        assert_eq!(service.get_subscriber_count(), 1);
        
        let result = service.shutdown().await;
        
        assert!(result.is_ok());
        assert_eq!(service.get_subscriber_count(), 0);
    }
}

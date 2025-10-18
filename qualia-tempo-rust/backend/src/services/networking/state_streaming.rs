//! # Responsibility
//! Streams game state updates to connected WebSocket clients.
//!
//! ---
//!
//! This service subscribes to GameEvent broadcasts and converts them into
//! JSON-serialized WebSocket messages for real-time client synchronization.

use shaku::Component;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::broadcast;
use tracing::{instrument, debug, warn, error};
use anyhow::Result;
use async_trait::async_trait;
use shared_core::traits::{IGameStateStreamingService, IWebSocketService};
use crate::services::interfaces::{ILogger, IEventBus};
use crate::services::networking::WebSocketService;
use shared_core::events::GameEvent;
use shared_core::contracts::{CombatState, QualiaState};

/// # Responsibility
/// Converts game events into WebSocket messages and streams them to clients.
///
/// ---
///
/// Subscribes to EventBus, filters relevant events, serializes to JSON, and
/// broadcasts via WebSocketService.
#[derive(Component)]
#[shaku(interface = IGameStateStreamingService)]
pub struct GameStateStreamingService {
    is_running: Arc<AtomicBool>,
    
    #[shaku(inject)]
    websocket: Arc<dyn IWebSocketService>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

impl GameStateStreamingService {
    /// Creates a new GameStateStreamingService (manual instantiation for Phase 4)
    pub fn new(
        websocket: Arc<WebSocketService>,
        event_bus: Arc<dyn IEventBus>,
        logger: Arc<dyn ILogger>,
    ) -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            websocket,
            event_bus,
            logger,
        }
    }
}

#[async_trait]
impl IGameStateStreamingService for GameStateStreamingService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        if self.is_running.swap(true, Ordering::Relaxed) {
            warn!("GameStateStreamingService is already running");
            return Ok(());
        }
        
        self.logger.info("Starting GameStateStreamingService");
        
        let websocket = self.websocket.clone();
        let event_bus = self.event_bus.clone();
        let is_running = self.is_running.clone();
        let logger = self.logger.clone();
        
        tokio::spawn(async move {
            let mut events = event_bus.subscribe();
            
            logger.info("GameStateStreamingService event loop started");
            
            loop {
                if !is_running.load(Ordering::Relaxed) {
                    logger.info("GameStateStreamingService stopping");
                    break;
                }
                
                match events.recv().await {
                    Ok(event) => {
                        match Self::process_event(&event, &websocket, &logger).await {
                            Ok(()) => {}
                            Err(e) => {
                                error!("Error processing event: {:?}", e);
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("GameStateStreamingService lagged, skipped {} events", skipped);
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        logger.info("EventBus closed, stopping GameStateStreamingService");
                        break;
                    }
                }
            }
            
            logger.info("GameStateStreamingService event loop stopped");
        });
        
        Ok(())
    }
    
    #[instrument(skip(self))]
    async fn stop(&self) -> Result<()> {
        self.logger.info("Stopping GameStateStreamingService");
        self.is_running.store(false, Ordering::Relaxed);
        Ok(())
    }
    
    #[instrument(skip(self, state))]
    async fn stream_state(&self, state: &CombatState) -> Result<()> {
        let json = serde_json::to_string(state)?;
        self.websocket.broadcast(json).await?;
        Ok(())
    }
}

impl GameStateStreamingService {
    async fn process_event(
        event: &GameEvent,
        websocket: &Arc<dyn IWebSocketService>,
        _logger: &Arc<dyn ILogger>,
    ) -> Result<()> {
        match event {
            GameEvent::CombatStateUpdated { state } => {
                Self::broadcast_combat_state(websocket, state).await
            }
            GameEvent::QualiaStateUpdated { state } => {
                Self::broadcast_qualia_state(websocket, state).await
            }
            GameEvent::BossPhaseTransition { boss_id, old_phase, new_phase } => {
                Self::broadcast_boss_phase_transition(websocket, boss_id, *old_phase, *new_phase).await
            }
            GameEvent::PlayerDamaged { amount, source } => {
                Self::broadcast_player_damaged(websocket, *amount, source).await
            }
            _ => {
                // Ignore other events
                debug!("Ignoring event: {:?}", event);
                Ok(())
            }
        }
    }
    
    async fn broadcast_combat_state(
        websocket: &Arc<dyn IWebSocketService>,
        state: &CombatState,
    ) -> Result<()> {
        debug!("Streaming CombatState update");
        let message = serde_json::json!({
            "type": "combatState",
            "data": state
        });
        let json = serde_json::to_string(&message)?;
        websocket.broadcast(json).await?;
        Ok(())
    }
    
    async fn broadcast_qualia_state(
        websocket: &Arc<dyn IWebSocketService>,
        state: &QualiaState,
    ) -> Result<()> {
        debug!("Streaming QualiaState update");
        let message = serde_json::json!({
            "type": "qualiaState",
            "data": state
        });
        let json = serde_json::to_string(&message)?;
        websocket.broadcast(json).await?;
        Ok(())
    }
    
    async fn broadcast_boss_phase_transition(
        websocket: &Arc<dyn IWebSocketService>,
        boss_id: &str,
        old_phase: u8,
        new_phase: u8,
    ) -> Result<()> {
        debug!("Streaming BossPhaseTransition event");
        let message = serde_json::json!({
            "type": "bossPhaseTransition",
            "data": {
                "bossId": boss_id,
                "oldPhase": old_phase,
                "newPhase": new_phase
            }
        });
        let json = serde_json::to_string(&message)?;
        websocket.broadcast(json).await?;
        Ok(())
    }
    
    async fn broadcast_player_damaged(
        websocket: &Arc<dyn IWebSocketService>,
        amount: f32,
        source: &str,
    ) -> Result<()> {
        debug!("Streaming PlayerDamaged event");
        let message = serde_json::json!({
            "type": "playerDamaged",
            "data": {
                "amount": amount,
                "source": source
            }
        });
        let json = serde_json::to_string(&message)?;
        websocket.broadcast(json).await?;
        Ok(())
    }
}

// Default implementation removed to prevent accidental instantiation
// GameStateStreamingService MUST be created via DI container

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::{QualiaLogger, EventBusService};
    use crate::services::networking::WebSocketService;
    use shared_core::contracts::QualiaState;
    
    #[tokio::test]
    async fn test_stream_state_serializes_correctly() {
        use crate::services::interfaces::{ILogger, IEventBus};
        use shared_core::contracts::{PlayerState, BossState, GameStatus};
        
        let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::default());
        let websocket: Arc<dyn IWebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
        let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::new(100));
        
        let service = GameStateStreamingService {
            is_running: Arc::new(AtomicBool::new(false)),
            websocket: websocket.clone(),
            event_bus,
            logger: logger.clone(),
        };
        
        let state = CombatState {
            game_state: GameStatus::InCombat,
            player: PlayerState {
                position: shared_core::utils::Vec2::new(0.0, 0.0),
                velocity: shared_core::utils::Vec2::new(0.0, 0.0),
                health: 100.0,
                max_health: 100.0,
                abilities: shared_core::contracts::PlayerAbilities::default(),
                is_invulnerable: false,
                combo_count: 0,
                buffs: vec![],
                debuffs: vec![],
            },
            boss: BossState {
                id: "test_boss".to_string(),
                name: "Test Boss".to_string(),
                position: shared_core::utils::Vec2::new(0.0, 0.0),
                health: 1000.0,
                max_health: 1000.0,
                is_vulnerable: false,
                phase: 1,
                current_aggression_level: 0.5,
            },
            qualia: QualiaState::default(),
            timestamp: 0.0,
            elapsed_time: 0.0,
            score: 0,
            qualia_event_history: vec![],
        };
        let result = service.stream_state(&state).await;
        
        assert!(result.is_ok());
    }
    
    #[tokio::test]
    async fn test_streaming_service_starts_and_stops() {
        use crate::services::interfaces::{ILogger, IEventBus};
        
        let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::default());
        let websocket: Arc<dyn IWebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
        let event_bus: Arc<dyn IEventBus> = Arc::new(EventBusService::new(100));
        
        let service = GameStateStreamingService {
            is_running: Arc::new(AtomicBool::new(false)),
            websocket,
            event_bus,
            logger,
        };
        
        // Start service
        let result = service.start().await;
        assert!(result.is_ok());
        assert!(service.is_running.load(Ordering::Relaxed));
        
        // Stop service
        let result = service.stop().await;
        assert!(result.is_ok());
        assert!(!service.is_running.load(Ordering::Relaxed));
    }
    
    #[tokio::test]
    async fn test_process_qualia_state_event() {
        let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::default());
        let websocket: Arc<dyn IWebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
        let _event_bus = Arc::new(EventBusService::new(100));
        
        let concrete_ws = websocket.clone();
        let ws_service = Arc::downcast::<WebSocketService>(concrete_ws).unwrap();
        let mut rx = ws_service.subscribe();
        
        let qualia_state = QualiaState::default();
        let event = GameEvent::QualiaStateUpdated { state: qualia_state };
        
        let result = GameStateStreamingService::process_event(&event, &websocket, &logger).await;
        
        assert!(result.is_ok());
        
        // Verify message was broadcasted
        let received = rx.try_recv().unwrap();
        assert!(received.contains("qualiaState"));
        assert!(received.contains("\"type\":\"qualiaState\""));
    }
    
    #[tokio::test]
    async fn test_ignores_irrelevant_events() {
        let logger: Arc<dyn ILogger> = Arc::new(QualiaLogger::default());
        let websocket: Arc<dyn IWebSocketService> = Arc::new(WebSocketService::new(100, logger.clone()));
        
        let concrete_ws = websocket.clone();
        let ws_service = Arc::downcast::<WebSocketService>(concrete_ws).unwrap();
        let mut rx = ws_service.subscribe();
        
        // Send an irrelevant event type
        let event = GameEvent::GameStarted { timestamp: 0.0 };
        
        let result = GameStateStreamingService::process_event(&event, &websocket, &logger).await;
        
        assert!(result.is_ok());
        
        // No message should be broadcasted
        assert!(rx.try_recv().is_err());
    }
}

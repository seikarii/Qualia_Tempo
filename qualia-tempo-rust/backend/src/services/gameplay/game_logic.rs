//! # Responsibility
//! Central game logic orchestration service.

use async_trait::async_trait;
use shaku::Component;
use std::sync::{Arc, RwLock};
use anyhow::Result;

use shared_core::contracts::{PlayerAction, QualiaState};
use shared_core::events::GameEvent;
use shared_core::traits::ILogger;
use crate::config::GameLogicConfig;
use crate::services::core::IGameEventBus;
use super::qualia_processor::QualiaProcessor;
use super::traits::IGameLogicService;

/// # Responsibility
/// Orchestrates core game logic flow: action processing → qualia calculation → event emission.
///
/// ---
///
/// This is the central coordinator for gameplay systems. It receives player actions,
/// calculates resulting qualia state changes via QualiaProcessor, and emits events to
/// notify other subsystems. Maintains game state thread-safely.
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IGameEventBus>,
    
    /// Current qualia state (thread-safe for concurrent access)
    state: Arc<RwLock<QualiaState>>,
    
    /// Qualia calculation engine
    processor: Arc<QualiaProcessor>,
    
    /// Last action timestamp for delta calculation
    last_update: Arc<RwLock<u64>>,
}

impl GameLogicService {
    /// Create a new GameLogicService with dependencies (called by Shaku).
    pub fn new(
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IGameEventBus>,
    ) -> Self {
        // Load config from environment/file (defaulting for now)
        let config = Arc::new(GameLogicConfig::default());
        let processor = Arc::new(QualiaProcessor::new(config));
        
        Self {
            logger,
            event_bus,
            state: Arc::new(RwLock::new(QualiaState::default())),
            processor,
            last_update: Arc::new(RwLock::new(0)),
        }
    }
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState> {
        self.logger.debug(&format!("Processing action: {:?}", action));
        
        // Calculate delta time since last update
        let current_time = action.timestamp();
        let delta_time = {
            let last = self.last_update.read().unwrap();
            if *last == 0 {
                0 // First action
            } else {
                current_time.saturating_sub(*last)
            }
        };
        
        // Get current state (Copy optimization)
        let current_state = *self.state.read().unwrap();
        
        // Calculate new state using processor
        let new_state = self.processor.process_action(current_state, &action, delta_time);
        
        // Update stored state (Copy optimization)
        *self.state.write().unwrap() = new_state;
        
        // Update last update time
        *self.last_update.write().unwrap() = current_time;
        
        // Emit player action event
        let action_event = GameEvent::PlayerAction {
            action: action.clone(),
        };
        
        match self.event_bus.emit(action_event) {
            Ok(count) => {
                self.logger.debug(&format!("PlayerAction event sent to {} subscribers", count));
            }
            Err(_) => {
                self.logger.warn("No active subscribers for PlayerAction event");
            }
        }
        
        // Emit qualia state updated event
        let state_event = GameEvent::QualiaStateUpdated {
            state: new_state,
        };
        
        match self.event_bus.emit(state_event) {
            Ok(count) => {
                self.logger.debug(&format!("QualiaStateUpdated event sent to {} subscribers", count));
            }
            Err(_) => {
                self.logger.warn("No active subscribers for QualiaStateUpdated event");
            }
        }
        
        self.logger.info(&format!(
            "Qualia state - I:{:.2} H:{:.2} C:{:.2} K:{:.2}",
            new_state.intensity, new_state.harmony, new_state.chaos, new_state.kairos
        ));
        
        Ok(new_state)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::traits::{ILogger, IEventBus};
    use mockall::mock;

    mock! {
        Logger {}
        impl ILogger for Logger {
            fn info(&self, message: &str);
            fn warn(&self, message: &str);
            fn error(&self, message: &str);
            fn debug(&self, message: &str);
        }
    }

    mock! {
        EventBus {}
        impl IEventBus<GameEvent> for EventBus {
            fn emit(&self, event: GameEvent) -> Result<usize, tokio::sync::broadcast::error::SendError<GameEvent>>;
            fn subscribe(&self) -> tokio::sync::broadcast::Receiver<GameEvent>;
        }
    }

    #[tokio::test]
    async fn test_process_action_emits_events() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_info().returning(|_| ());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus
            .expect_emit()
            .times(2) // PlayerAction + QualiaStateUpdated
            .returning(|_| Ok(1));
        
        let service = GameLogicService::new(
            Arc::new(mock_logger),
            Arc::new(mock_event_bus),
        );
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.9,
        };
        
        let result = service.process_action(action).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_process_action_calculates_qualia() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_info().returning(|_| ());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));
        
        let service = GameLogicService::new(
            Arc::new(mock_logger),
            Arc::new(mock_event_bus),
        );
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.96, // Perfect accuracy
        };
        
        let result = service.process_action(action).await.unwrap();
        
        // Should have non-zero intensity from high accuracy
        assert!(result.intensity > 0.0, "High accuracy should increase intensity");
        
        // Should trigger kairos for perfect timing
        assert!(result.kairos > 0.9, "Perfect accuracy should trigger kairos");
    }

    #[tokio::test]
    async fn test_multiple_actions_track_delta_time() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_info().returning(|_| ());
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));
        
        let service = GameLogicService::new(
            Arc::new(mock_logger),
            Arc::new(mock_event_bus),
        );
        
        // First action
        let action1 = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.9,
        };
        
        let state1 = service.process_action(action1).await.unwrap();
        
        // Second action 2 seconds later (decay should occur)
        let action2 = PlayerAction::KeyPressed {
            key: 'W',
            timestamp: 3000,
            accuracy: 0.8,
        };
        
        let state2 = service.process_action(action2).await.unwrap();
        
        // Harmony should have decayed between actions
        // (even though action2 would increase it, 2s decay is significant)
        assert!(state2.harmony < state1.harmony + 0.1, "Harmony should decay over time");
    }

    #[tokio::test]
    async fn test_handles_event_bus_failures_gracefully() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_info().returning(|_| ());
        mock_logger.expect_warn().times(2).returning(|_| ()); // Two warns for failed emits
        
        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus
            .expect_emit()
            .returning(|e| Err(tokio::sync::broadcast::error::SendError(e)));
        
        let service = GameLogicService::new(
            Arc::new(mock_logger),
            Arc::new(mock_event_bus),
        );
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.9,
        };
        
        // Should not crash even with event bus failures
        let result = service.process_action(action).await;
        assert!(result.is_ok(), "Should handle event bus failures gracefully");
    }
}

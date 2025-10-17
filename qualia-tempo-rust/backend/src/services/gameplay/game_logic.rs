//! # Responsibility
//! Core game logic service (skeleton for Phase 2.1).

use async_trait::async_trait;
use shaku::Component;
use shared_core::traits::ILogger;
use shared_core::events::GameEvent;
use shared_core::contracts::{PlayerAction, QualiaState};
use crate::services::core::IGameEventBus;
use crate::services::gameplay::IGameLogicService;
use std::sync::Arc;
use anyhow::Result;

/// # Responsibility
/// Central game logic orchestrator (skeleton implementation).
///
/// ---
///
/// This service will process player actions, calculate qualia state,
/// and coordinate with boss AI. Phase 2.1 provides the skeleton;
/// Phase 2.2 will implement full game loop logic.
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IGameEventBus>,
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState> {
        self.logger.debug(&format!("Processing player action: {:?}", action));
        
        // Phase 2.1 skeleton: Simple passthrough logic
        // Phase 2.2 will implement full qualia calculation
        let new_state = QualiaState::default();
        
        // Emit player action event
        let action_event = GameEvent::PlayerAction {
            action,
        };
        
        match self.event_bus.emit(action_event) {
            Ok(count) => {
                self.logger.debug(&format!("PlayerAction event sent to {} subscribers", count));
            }
            Err(e) => {
                self.logger.warn(&format!("Failed to emit PlayerAction event: {:?}", e));
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
            Err(e) => {
                self.logger.warn(&format!("Failed to emit QualiaStateUpdated event: {:?}", e));
            }
        }
        
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
        let mut mock_event_bus = MockEventBus::new();
        
        // Expect debug logs
        mock_logger
            .expect_debug()
            .return_const(());
        
        // Expect 2 events: PlayerAction + QualiaStateUpdated
        mock_event_bus
            .expect_emit()
            .times(2)
            .returning(|_| Ok(1));
        
        let service = GameLogicService {
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
        };
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.95,
        };
        
        let result = service.process_action(action).await;
        assert!(result.is_ok());
        
        let state = result.unwrap();
        assert_eq!(state.intensity, 0.0); // Default state for Phase 2.1
    }

    #[tokio::test]
    async fn test_process_action_handles_event_bus_failure() {
        let mut mock_logger = MockLogger::new();
        let mut mock_event_bus = MockEventBus::new();
        
        // Expect debug and warn logs
        mock_logger
            .expect_debug()
            .return_const(());
        mock_logger
            .expect_warn()
            .times(2) // 2 failures expected
            .return_const(());
        
        // Simulate SendError for all emits
        mock_event_bus
            .expect_emit()
            .times(2)
            .returning(|event| Err(tokio::sync::broadcast::error::SendError(event)));
        
        let service = GameLogicService {
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
        };
        
        let action = PlayerAction::Dash {
            direction: shared_core::utils::Vec2 { x: 1.0, y: 0.0 },
            timestamp: 2000,
            perfect_timing: false,
        };
        
        let result = service.process_action(action).await;
        assert!(result.is_ok(), "Should handle event bus failures gracefully");
    }
}

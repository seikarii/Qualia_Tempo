//! # Responsibility
//! Implements core game logic: state validation, event orchestration, score calculation.
//!
//! ---
//!
//! ARCHITECTURAL NOTE: This service VALIDATES QualiaState from frontend, does NOT calculate it.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Component;
use std::sync::Arc;
use tracing::{info, instrument};

use shared_core::contracts::{CombatState, PlayerAction, QualiaState};
use shared_core::events::GameEvent;
use shared_core::traits::{IEventBus, IGameLogicService, ILogger, IQualiaValidator};

/// # Responsibility
/// Validates player actions and orchestrates musical combat events.
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    #[shaku(inject)]
    #[allow(dead_code)] // Injected dependency for future use
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    #[shaku(inject)]
    validator: Arc<dyn IQualiaValidator>,
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    #[instrument(skip(self))]
    async fn process_action(
        &self,
        action: PlayerAction,
        frontend_qualia: QualiaState,
    ) -> Result<QualiaState> {
        info!("Processing player action: {:?}", action);

        // VALIDATE QualiaState received from frontend (anti-cheat)
        let validated_state = self.validator.validate(frontend_qualia, action).await?;

        // Emit validated state event
        self.event_bus
            .emit(GameEvent::QualiaStateUpdated {
                state: validated_state,
            })
            .ok();

        Ok(validated_state)
    }

    async fn update_game_state(&self, _dt: f32) -> Result<CombatState> {
        // TODO: Implement full state aggregation
        Ok(CombatState::default())
    }

    fn get_current_score(&self) -> u32 {
        // TODO: Implement scoring logic
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use crate::services::gameplay::QualiaValidatorService;

    #[tokio::test]
    async fn test_process_action_validates_and_emits() {
        let service = GameLogicService {
            logger: Arc::new(MockLogger::with_defaults()),
            event_bus: Arc::new(MockEventBus::with_defaults()),
            validator: Arc::new(QualiaValidatorService::new_for_testing(Arc::new(
                MockLogger::with_defaults(),
            ))),
        };

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95,
        };

        let frontend_state = QualiaState {
            intensity: 0.8,
            precision: 0.95,
            ..Default::default()
        };

        let result = service.process_action(action, frontend_state).await;

        assert!(result.is_ok());
        let validated = result.unwrap();
        assert!(validated.intensity <= 1.0);
        assert!(validated.precision <= 1.0);
    }
}

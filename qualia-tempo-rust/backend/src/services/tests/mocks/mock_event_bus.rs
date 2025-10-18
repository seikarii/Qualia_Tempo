//! # Responsibility
//! High-fidelity mock for IEventBus trait.
//!
//! ---
//!
//! Provides mockall-based mock implementation for testing services that
//! depend on IEventBus without requiring actual broadcast channels.

use mockall::mock;
use crate::services::interfaces::IEventBus;
use shared_core::events::GameEvent;
use tokio::sync::broadcast;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IEventBus trait, used in unit tests.
    ///
    /// ---
    ///
    /// Allows verification of event emissions and subscription behavior
    /// without requiring actual tokio broadcast channels.
    pub EventBus {}

    impl IEventBus for EventBus {
        fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;
        fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::contracts::QualiaState;

    #[test]
    fn test_mock_event_bus_emit() {
        let mut mock_bus = MockEventBus::new();

        // Expect emit to be called once and return success with 2 receivers
        mock_bus
            .expect_emit()
            .times(1)
            .returning(|_| Ok(2));

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        let result = mock_bus.emit(event);

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 2);
    }

    #[test]
    fn test_mock_event_bus_emit_failure() {
        let mut mock_bus = MockEventBus::new();

        // Simulate SendError
        mock_bus
            .expect_emit()
            .times(1)
            .returning(|event| Err(broadcast::error::SendError(event)));

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        let result = mock_bus.emit(event);

        assert!(result.is_err());
    }
}

//! # Responsibility
//! High-fidelity mock implementation of IEventBus for testing.
//!
//! ---
//!
//! Provides mockall-based mock with type-safe expectations.

use mockall::*;
use tokio::sync::broadcast;
use shared_core::traits::IEventBus;
use shared_core::events::GameEvent;

mock! {
    /// # Responsibility
    /// High-fidelity mock of IEventBus trait.
    ///
    /// ---
    ///
    /// Used in unit tests to verify event emission without
    /// actual channel creation.
    pub EventBus {}

    impl IEventBus for EventBus {
        fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>>;
        fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
    }
}

impl MockEventBus {
    /// # Responsibility
    /// Creates a mock with default expectations.
    ///
    /// ---
    ///
    /// emit() returns Ok(1) by default.
    /// subscribe() returns a real receiver from a temporary channel.
    pub fn with_defaults() -> Self {
        let mut mock = Self::new();
        
        mock.expect_emit().returning(|_| Ok(1));
        
        // Create a real channel for subscribe calls
        let (tx, _rx) = broadcast::channel(100);
        mock.expect_subscribe().returning(move || tx.subscribe());
        
        mock
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::contracts::QualiaState;

    #[test]
    fn test_mock_with_defaults() {
        let bus = MockEventBus::with_defaults();
        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        
        let result = bus.emit(event);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
        
        let _rx = bus.subscribe();
    }

    #[test]
    fn test_mock_emit_failure() {
        let mut bus = MockEventBus::new();
        let test_event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        
        bus.expect_emit()
            .times(1)
            .returning(|_| Err(broadcast::error::SendError(GameEvent::QualiaStateUpdated {
                state: QualiaState::default(),
            })));
        
        let result = bus.emit(test_event);
        assert!(result.is_err());
    }
}

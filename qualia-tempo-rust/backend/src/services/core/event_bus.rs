//! # Responsibility
//! Provides lock-free event distribution across all backend services.
//!
//! ---
//!
//! Uses `tokio::sync::broadcast` for zero-lock contention. This is the ONLY
//! correct implementation per QUALIA.CODE.RUST §4.2. Manual implementations
//! with `RwLock` are FORBIDDEN.

use tokio::sync::broadcast;
use shared_core::events::GameEvent;
use crate::services::interfaces::IEventBus;
use tracing::{debug, warn};

const DEFAULT_EVENT_BUS_CAPACITY: usize = 1000;

/// # Responsibility
/// Manages event distribution to multiple subscribers using broadcast channels.
///
/// ---
///
/// Capacity of 1000 events is sufficient for typical gameplay. If a subscriber
/// lags and misses events, it will receive a Lagged error and can choose to
/// skip or catch up.
///
/// # Performance Characteristics
/// - Lock-free: Uses atomic operations for contention-free publishing
/// - O(1) emit: Constant time event emission
/// - O(1) subscribe: Constant time subscription creation
pub struct EventBusService {
    tx: broadcast::Sender<GameEvent>,
}

impl EventBusService {
    /// Create new `EventBusService` with specified capacity
    ///
    /// # Arguments
    /// - `capacity`: Maximum number of events buffered per subscriber
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }
}

impl IEventBus for EventBusService {
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>> {
        debug!("Emitting event: {:?}", event);

        match self.tx.send(event) {
            Ok(receiver_count) => {
                debug!("Event delivered to {} receivers", receiver_count);
                Ok(receiver_count)
            }
            Err(e) => {
                warn!("Failed to emit event (no receivers): {:?}", e);
                Err(e)
            }
        }
    }

    fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        self.tx.subscribe()
    }
}

impl Default for EventBusService {
    fn default() -> Self {
        Self::new(1000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::events::GameEvent;
    use shared_core::contracts::QualiaState;

    #[tokio::test]
    async fn test_emit_with_no_subscribers() {
        let bus = EventBusService::new(100);
        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        // With no subscribers, broadcast returns Err (expected behavior)
        let result = bus.emit(event);
        assert!(result.is_err(), "Should fail when no subscribers exist");
    }

    #[tokio::test]
    async fn test_emit_with_subscribers() {
        let bus = EventBusService::new(100);
        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        let result = bus.emit(event.clone());

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 2); // 2 receivers

        // Both subscribers should receive the event
        assert!(matches!(rx1.try_recv(), Ok(GameEvent::QualiaStateUpdated { .. })));
        assert!(matches!(rx2.try_recv(), Ok(GameEvent::QualiaStateUpdated { .. })));
    }

    #[tokio::test]
    async fn test_lagging_subscriber() {
        let bus = EventBusService::new(2); // Small capacity
        let mut rx = bus.subscribe();

        // Fill buffer beyond capacity
        bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        }).ok();
        bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        }).ok();
        bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        }).ok();

        // Subscriber should detect lag
        match rx.try_recv() {
            Err(broadcast::error::TryRecvError::Lagged(n)) => {
                assert!(n > 0, "Should report lagging");
            }
            _ => panic!("Expected Lagged error"),
        }
    }

    #[tokio::test]
    async fn test_multiple_event_types() {
        let bus = EventBusService::new(100);
        let mut rx = bus.subscribe();

        // Emit different event types
        bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        }).ok();
        bus.emit(GameEvent::GameStarted { 
            timestamp: 0.0,
        }).ok();

        // Receiver should get both
        assert!(matches!(rx.try_recv(), Ok(GameEvent::QualiaStateUpdated { .. })));
        assert!(matches!(rx.try_recv(), Ok(GameEvent::GameStarted { .. })));
    }

    #[tokio::test]
    async fn test_subscriber_independence() {
        let bus = EventBusService::new(100);
        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        bus.emit(event).ok();

        // Consume from rx1 only
        rx1.try_recv().ok();

        // rx2 should still have the event
        assert!(matches!(rx2.try_recv(), Ok(GameEvent::QualiaStateUpdated { .. })));
    }
}

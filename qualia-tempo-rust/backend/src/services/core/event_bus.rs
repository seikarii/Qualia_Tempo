//! # Responsibility
//! Provides lock-free event distribution across all backend services.
//!
//! ---
//!
//! Uses tokio::sync::broadcast for zero-lock contention. This is the ONLY
//! correct implementation. Manual implementations with RwLock are FORBIDDEN.

use tokio::sync::broadcast;
use shared_core::events::GameEvent;
use shared_core::traits::IEventBus;
use shaku::Component;
use tracing::{instrument, debug, warn};

/// # Responsibility
/// Manages event distribution to multiple subscribers using broadcast channels.
///
/// ---
///
/// Capacity of 1000 events is sufficient for typical gameplay. If a subscriber
/// lags and misses events, it will receive a Lagged error and can choose to
/// skip or catch up.
#[derive(Component)]
#[shaku(interface = IEventBus)]
pub struct EventBusService {
    tx: broadcast::Sender<GameEvent>,
}

impl EventBusService {
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }
}

impl IEventBus for EventBusService {
    #[instrument(skip(self, event))]
    #[allow(clippy::cognitive_complexity)]
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
    use shared_core::contracts::QualiaState;

    #[tokio::test]
    async fn test_emit_with_no_subscribers() {
        let bus = EventBusService::new(100);
        
        // Create and drop a subscriber to initialize the channel
        let _rx = bus.subscribe();
        drop(_rx);
        
        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        // With no active subscribers, emit returns SendError
        let result = bus.emit(event);
        assert!(result.is_err(), "Should fail when no subscribers");
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

        // Fill buffer
        let _ = bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        });
        let _ = bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        });
        let _ = bus.emit(GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        });

        // Subscriber should detect lag
        match rx.try_recv() {
            Err(broadcast::error::TryRecvError::Lagged(n)) => {
                assert!(n > 0, "Should report lagging");
            }
            _ => panic!("Expected Lagged error"),
        }
    }
}

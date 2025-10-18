//! # Responsibility
//! Provides WASM-safe event distribution for frontend services.
//!
//! ---
//!
//! Uses async_broadcast for WASM compatibility. Similar API to backend's
//! tokio::sync::broadcast but safe for single-threaded WASM execution.

use async_broadcast::{broadcast, Sender, Receiver};
use shared_core::events::GameEvent;
use tracing::{debug, warn, instrument};

/// # Responsibility
/// Manages event distribution to multiple frontend subscribers.
///
/// ---
///
/// WASM-safe EventBus using async_broadcast. Capacity of 1000 events.
/// Subscribers lagging behind will receive overflow errors.
#[derive(Clone)]
pub struct EventBusService {
    tx: Sender<GameEvent>,
}

impl EventBusService {
    /// # Responsibility
    /// Creates new EventBus with specified capacity.
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast(capacity);
        Self { tx }
    }

    /// # Responsibility
    /// Emits an event to all subscribers.
    ///
    /// # Returns
    /// Ok(()) on success, Err if send fails
    ///
    /// # Errors
    /// Returns error if channel is closed or overflows
    #[instrument(skip(self, event))]
    #[allow(clippy::result_large_err)] // GameEvent is intentionally large (enum with Vec<f32>)
    pub fn emit(&self, event: GameEvent) -> Result<(), async_broadcast::TrySendError<GameEvent>> {
        debug!("Emitting event: {:?}", event);

        match self.tx.try_broadcast(event) {
            Ok(None) => {
                debug!("Event broadcast successfully");
                Ok(())
            }
            Ok(Some(_)) => {
                warn!("Event broadcast caused overflow (some receivers lagged)");
                Ok(())
            }
            Err(e) => {
                warn!("Failed to emit event: {:?}", e);
                Err(e)
            }
        }
    }

    /// # Responsibility
    /// Creates new subscription receiver.
    ///
    /// # Returns
    /// Receiver that will receive all future events
    pub fn subscribe(&self) -> Receiver<GameEvent> {
        self.tx.new_receiver()
    }

    /// # Responsibility
    /// Gets number of active receivers.
    pub fn receiver_count(&self) -> usize {
        self.tx.receiver_count()
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
    use shared_core::contracts::game_state::QualiaState;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_event_bus_creation() {
        let bus = EventBusService::new(100);
        assert_eq!(bus.receiver_count(), 0);
    }

    #[wasm_bindgen_test]
    fn test_subscribe_increases_receiver_count() {
        let bus = EventBusService::new(100);
        let _rx1 = bus.subscribe();
        let _rx2 = bus.subscribe();

        assert_eq!(bus.receiver_count(), 2);
    }

    #[wasm_bindgen_test]
    async fn test_emit_and_receive() {
        let bus = EventBusService::new(100);
        let mut rx = bus.subscribe();

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        bus.emit(event.clone()).expect("Emit should succeed");

        match rx.recv().await {
            Ok(received) => assert_eq!(received, event),
            Err(e) => panic!("Receive failed: {:?}", e),
        }
    }

    #[wasm_bindgen_test]
    async fn test_multiple_subscribers_receive_event() {
        let bus = EventBusService::new(100);
        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        bus.emit(event.clone()).expect("Emit should succeed");

        // Both receivers should get the event
        let received1 = rx1.recv().await.expect("rx1 should receive");
        let received2 = rx2.recv().await.expect("rx2 should receive");

        assert_eq!(received1, event);
        assert_eq!(received2, event);
    }

    #[wasm_bindgen_test]
    fn test_emit_with_no_subscribers() {
        let bus = EventBusService::new(100);

        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        // Should succeed even with no subscribers
        let result = bus.emit(event);
        assert!(result.is_ok());
    }
}

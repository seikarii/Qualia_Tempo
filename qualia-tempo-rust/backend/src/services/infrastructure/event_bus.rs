//! # Responsibility
//! Provides lock-free event distribution throughout the backend using tokio::sync::broadcast.
//!
//! ---
//!
//! This module implements the IEventBus trait, ensuring events are distributed
//! to all active subscribers without lock contention. Uses tokio's broadcast channel
//! as mandated by QUALIA.CODE.RUST.md.

use async_trait::async_trait;
use shared_core::events::GameEvent;
pub use shared_core::traits::IEventBus; // Re-export for public access
use tokio::sync::broadcast;
use tracing::{info, warn};

/// # Responsibility
/// Implements lock-free event distribution using tokio::sync::broadcast.
///
/// ---
///
/// CRITICAL MANDATE: This implementation uses `tokio::sync::broadcast` internally.
/// Manual implementations with Arc<RwLock<Vec<...>>> are STRICTLY FORBIDDEN.
///
/// The broadcast channel has a fixed capacity. If receivers lag behind and the
/// buffer fills up, older messages are dropped and receivers will receive a
/// `Lagged` error on the next recv() call.
#[derive(Clone)]
pub struct EventBusService {
    /// The broadcast sender used to emit events to all subscribers
    tx: broadcast::Sender<GameEvent>,
}

impl EventBusService {
    /// Creates a new EventBusService with the specified channel capacity.
    ///
    /// # Arguments
    /// * `capacity` - The maximum number of events that can be buffered per subscriber
    ///
    /// # Recommendations
    /// - Use 1000 for development/testing
    /// - Use 10000 for production with high event throughput
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        info!(
            capacity = capacity,
            "EventBusService initialized with broadcast channel"
        );
        Self { tx }
    }

    /// Returns the number of active subscribers
    pub fn subscriber_count(&self) -> usize {
        self.tx.receiver_count()
    }
}

#[async_trait]
impl IEventBus for EventBusService {
    fn emit(&self, event: GameEvent) -> Result<usize, Box<broadcast::error::SendError<GameEvent>>> {
        match self.tx.send(event) {
            Ok(subscriber_count) => {
                // Successfully sent to N subscribers
                Ok(subscriber_count)
            }
            Err(e) => {
                // This only happens if there are no active receivers
                warn!("Event emitted but no active subscribers");
                Err(Box::new(e))
            }
        }
    }

    fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        let rx = self.tx.subscribe();
        info!(
            total_subscribers = self.subscriber_count(),
            "New EventBus subscriber registered"
        );
        rx
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)] // Allow unwrap in tests
mod tests {
    use super::*;
    use shared_core::contracts::{PlayerAction, QualiaState};

    #[test]
    fn test_event_bus_creation() {
        let bus = EventBusService::new(100);
        assert_eq!(bus.subscriber_count(), 0);
    }

    #[test]
    fn test_emit_with_no_subscribers_returns_error() {
        let bus = EventBusService::new(100);
        let event = GameEvent::QualiaStateUpdated(QualiaState::default());

        let result = bus.emit(event);
        assert!(result.is_err(), "Should error when no subscribers");
    }

    #[test]
    fn test_emit_with_subscriber_succeeds() {
        let bus = EventBusService::new(100);
        let _rx = bus.subscribe();

        let event = GameEvent::QualiaStateUpdated(QualiaState::default());
        let result = bus.emit(event);

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1, "Should have 1 subscriber");
    }

    #[tokio::test]
    async fn test_subscriber_receives_emitted_event() {
        let bus = EventBusService::new(100);
        let mut rx = bus.subscribe();

        let expected_state = QualiaState {
            intensity: 0.75,
            precision: 0.5,
            ..Default::default()
        };
        let event = GameEvent::QualiaStateUpdated(expected_state);

        bus.emit(event).unwrap();

        // Receive the event
        let received = rx.recv().await;
        assert!(received.is_ok());

        match received.unwrap() {
            GameEvent::QualiaStateUpdated(state) => {
                assert_eq!(state.intensity, expected_state.intensity);
                assert_eq!(state.precision, expected_state.precision);
            }
            _ => panic!("Wrong event type received"),
        }
    }

    #[test]
    fn test_broadcast_handles_small_capacity_gracefully() {
        // USEFUL TEST: Edge case - capacity overflow
        let bus = EventBusService::new(2); // Intentionally small

        // Subscribe before filling buffer
        let mut rx = bus.subscribe();

        // Fill buffer
        bus.emit(GameEvent::QualiaStateUpdated(QualiaState::default()))
            .ok();
        bus.emit(GameEvent::QualiaStateUpdated(QualiaState::default()))
            .ok();

        // Overflow: should succeed (broadcast overwrites oldest)
        let result = bus.emit(GameEvent::QualiaStateUpdated(QualiaState::default()));
        assert!(result.is_ok(), "Emit should succeed even on overflow");

        // Subscriber should detect lag
        match rx.try_recv() {
            Err(broadcast::error::TryRecvError::Lagged(n)) => {
                assert!(n > 0, "Should report lagging");
            }
            Ok(_) => {
                // Might receive first event before lag kicks in
            }
            Err(e) => panic!("Unexpected error: {:?}", e),
        }
    }

    #[tokio::test]
    async fn test_multiple_subscribers_receive_same_event() {
        // USEFUL TEST: Integration - multiple consumers
        let bus = EventBusService::new(100);

        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();
        let mut rx3 = bus.subscribe();

        let event = GameEvent::PlayerAction(Box::new(PlayerAction::Dash {
            direction: shared_core::utils::Vector2 { x: 1.0, y: 0.0 },
            timestamp: 42.0,
        }));

        let sent_count = bus.emit(event).unwrap();
        assert_eq!(sent_count, 3, "Should send to 3 subscribers");

        // All three should receive
        assert!(rx1.recv().await.is_ok());
        assert!(rx2.recv().await.is_ok());
        assert!(rx3.recv().await.is_ok());
    }

    #[tokio::test]
    async fn test_subscriber_independence() {
        // USEFUL TEST: One slow subscriber doesn't block others
        let bus = EventBusService::new(100);

        let mut rx1 = bus.subscribe();
        let _rx2 = bus.subscribe(); // Intentionally not reading from rx2

        // Emit event
        bus.emit(GameEvent::QualiaStateUpdated(QualiaState::default()))
            .unwrap();

        // rx1 should still receive despite rx2 not reading
        let result = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            rx1.recv()
        ).await;

        assert!(result.is_ok(), "rx1 should not be blocked by rx2");
    }
}

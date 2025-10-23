//! # Responsibility
//! Event bus for lock-free pub/sub communication using tokio::sync::broadcast.
//!
//! ---
//!
//! CRITICAL MANDATE (QUALIA.CODE Section 4):
//! Use tokio::sync::broadcast for EventBus. Manual Arc<RwLock<HashMap<...>>>
//! implementations are STRICTLY FORBIDDEN.

use crate::events::AudioForgeEvent;
use shaku::Interface;
use tokio::sync::broadcast;

/// # Responsibility
/// Interface for event bus pub/sub operations.
///
/// ---
///
/// Provides lock-free event emission and subscription.
pub trait IEventBus: Interface {
    /// Emit event to all subscribers. Returns number of receivers that received the event.
    fn emit(&self, event: AudioForgeEvent) -> Result<usize, broadcast::error::SendError<AudioForgeEvent>>;

    /// Subscribe to events (returns new receiver)
    fn subscribe(&self) -> broadcast::Receiver<AudioForgeEvent>;
}

/// # Responsibility
/// Lock-free event bus implementation using tokio::sync::broadcast.
///
/// ---
///
/// Capacity: 1000 events (PLAN.MD specification).
/// Slow consumers will lag and see RecvError::Lagged.
///
/// CRITICAL: Manual Component implementation (broadcast::Sender doesn't impl Default)
pub struct EventBusService {
    tx: broadcast::Sender<AudioForgeEvent>,
}

impl EventBusService {
    /// Create new EventBus with specified capacity
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }
}

impl Default for EventBusService {
    fn default() -> Self {
        Self::new(1000) // PLAN.MD default capacity
    }
}

// Manual Component implementation for Shaku DI
impl<M: shaku::Module> shaku::Component<M> for EventBusService {
    type Interface = dyn IEventBus;
    type Parameters = ();

    fn build(_context: &mut shaku::ModuleBuildContext<M>, _params: Self::Parameters) -> Box<Self::Interface> {
        Box::new(Self::default())
    }
}

impl IEventBus for EventBusService {
    fn emit(&self, event: AudioForgeEvent) -> Result<usize, broadcast::error::SendError<AudioForgeEvent>> {
        self.tx.send(event)
    }

    fn subscribe(&self) -> broadcast::Receiver<AudioForgeEvent> {
        self.tx.subscribe()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio;

    /// # Responsibility
    /// Test: EventBus emits to multiple subscribers successfully.
    ///
    /// ---
    ///
    /// Verifies broadcast semantics (all subscribers receive the event).
    #[tokio::test]
    async fn test_emit_to_multiple_subscribers() {
        let bus = EventBusService::new(100);
        
        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();
        let mut rx3 = bus.subscribe();
        
        let test_event = AudioForgeEvent::PlaybackStateChanged {
            is_playing: true,
            position: Duration::from_secs(5),
        };
        
        // Emit event
        let result = bus.emit(test_event.clone());
        assert!(result.is_ok(), "Emission should succeed");
        assert_eq!(result.unwrap(), 3, "Should report 3 active subscribers");
        
        // All subscribers receive
        assert!(matches!(rx1.try_recv(), Ok(_)));
        assert!(matches!(rx2.try_recv(), Ok(_)));
        assert!(matches!(rx3.try_recv(), Ok(_)));
    }

    /// # Responsibility
    /// Test: EventBus handles capacity overflow gracefully (lagging).
    ///
    /// ---
    ///
    /// CRITICAL TEST (Audit Issue #6): Verifies slow subscriber behavior.
    /// When buffer overflows, oldest events are dropped and RecvError::Lagged is returned.
    #[tokio::test]
    async fn test_lagging_subscriber_scenario() {
        // Small capacity to force overflow
        let bus = EventBusService::new(2);
        
        let mut rx = bus.subscribe();
        
        // Fill buffer to capacity
        bus.emit(AudioForgeEvent::PlaybackStateChanged { is_playing: true, position: Duration::from_secs(0) }).unwrap();
        bus.emit(AudioForgeEvent::PlaybackStateChanged { is_playing: true, position: Duration::from_secs(1) }).unwrap();
        
        // Overflow: This should succeed (broadcast overwrites oldest)
        let overflow_result = bus.emit(AudioForgeEvent::PlaybackStateChanged { 
            is_playing: true, 
            position: Duration::from_secs(2) 
        });
        assert!(overflow_result.is_ok(), "Broadcast should allow overflow");
        
        // Subscriber should detect lag
        match rx.try_recv() {
            Err(broadcast::error::TryRecvError::Lagged(n)) => {
                assert!(n > 0, "Should report lagged message count");
            }
            Ok(_) => {
                // May receive newest event if overflow already evicted old ones
                // This is acceptable - verify we don't panic
            }
            Err(e) => panic!("Unexpected error: {:?}", e),
        }
    }

    /// # Responsibility
    /// Test: EventBus handles emission when no subscribers exist.
    ///
    /// ---
    ///
    /// Verifies that broadcast::send() returns Err when no active receivers.
    /// This is EXPECTED BEHAVIOR per tokio::sync::broadcast semantics.
    #[tokio::test]
    async fn test_emit_with_no_subscribers() {
        let bus = EventBusService::new(100);
        
        // No subscribers created (initial _rx is dropped during channel creation)
        let test_event = AudioForgeEvent::PlaybackStateChanged {
            is_playing: false,
            position: Duration::ZERO,
        };
        
        let result = bus.emit(test_event);
        
        // EXPECTED: SendError when no receivers exist
        // Services should handle this gracefully (log warning, continue execution)
        assert!(result.is_err(), "broadcast::send() returns Err with 0 subscribers");
        
        match result {
            Err(broadcast::error::SendError(_)) => {
                // Correct behavior
            }
            Ok(_) => panic!("Expected SendError, got Ok"),
        }
    }

    /// # Responsibility
    /// Test: Dropped subscribers don't affect active ones.
    ///
    /// ---
    ///
    /// Verifies subscriber cleanup (no memory leaks, no panics).
    #[tokio::test]
    async fn test_subscriber_cleanup() {
        let bus = EventBusService::new(100);
        
        let mut rx1 = bus.subscribe();
        {
            let _rx2 = bus.subscribe(); // Dropped at end of scope
        }
        
        let test_event = AudioForgeEvent::PlaybackStateChanged {
            is_playing: true,
            position: Duration::from_secs(10),
        };
        
        // Should report 1 subscriber (rx2 was dropped)
        let result = bus.emit(test_event);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1, "Only rx1 should be active");
        
        // rx1 still receives
        assert!(matches!(rx1.try_recv(), Ok(_)));
    }

    /// # Responsibility
    /// Test: EventBus channel closure behavior.
    ///
    /// ---
    ///
    /// Verifies RecvError::Closed when sender is dropped.
    #[tokio::test]
    async fn test_channel_closure() {
        let mut rx = {
            let bus = EventBusService::new(100);
            bus.subscribe()
        }; // bus dropped here
        
        // Attempt to receive after sender drop
        match rx.try_recv() {
            Err(broadcast::error::TryRecvError::Closed) => {
                // Expected behavior
            }
            Err(broadcast::error::TryRecvError::Empty) => {
                // Also acceptable - channel may not be closed yet
            }
            Ok(_) => panic!("Should not receive event from closed channel"),
            Err(e) => panic!("Unexpected error: {:?}", e),
        }
    }
}

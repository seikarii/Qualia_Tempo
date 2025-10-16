//! # Responsibility
//! Provides lock-free event distribution across all frontend services.
//!
//! ---
//!
//! Uses tokio::sync::broadcast for zero-lock contention.
//! This is the frontend mirror of the backend EventBus.

use shaku::{Component, Interface};
use std::sync::Arc;
use tokio::sync::broadcast;
use shared_core::events::GameEvent;
use anyhow::Result;

/// # Responsibility
/// Configuration for the frontend EventBus.
#[derive(Debug, Clone)]
pub struct EventBusConfig {
    /// Maximum capacity of the broadcast channel
    pub capacity: usize,
}

impl Default for EventBusConfig {
    fn default() -> Self {
        Self {
            capacity: 1000, // Same as backend for consistency
        }
    }
}

/// # Responsibility
/// Trait interface for event bus operations.
pub trait IEventBus: Interface + Send + Sync {
    /// Emits an event to all subscribers
    fn emit(&self, event: GameEvent) -> Result<usize>;
    
    /// Subscribes to events, returning a receiver
    fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
    
    /// Gets the current subscriber count
    fn subscriber_count(&self) -> usize;
}

/// # Responsibility
/// Frontend EventBus implementation using tokio::sync::broadcast.
///
/// ---
///
/// CRITICAL: Uses tokio::sync::broadcast for lock-free event distribution.
/// This is a MANDATE from QUALIA.CODE.RUST.md Section 4.1.
#[derive(Component)]
#[shaku(interface = IEventBus)]
pub struct EventBusService {
    tx: broadcast::Sender<GameEvent>,
}

impl EventBusService {
    /// Creates a new EventBus with the specified capacity
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }
}

impl IEventBus for EventBusService {
    fn emit(&self, event: GameEvent) -> Result<usize> {
        self.tx.send(event)
            .map_err(|_| anyhow::anyhow!("No active subscribers"))
    }
    
    fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        self.tx.subscribe()
    }
    
    fn subscriber_count(&self) -> usize {
        self.tx.receiver_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::contracts::game_state::QualiaState;
    
    #[test]
    fn test_event_bus_creation() {
        let bus = EventBusService::new(100);
        assert_eq!(bus.subscriber_count(), 0);
    }
    
    #[test]
    fn test_event_bus_emit_and_receive() {
        let bus = EventBusService::new(100);
        let mut rx = bus.subscribe();
        
        let qualia_state = QualiaState::default();
        let event = GameEvent::QualiaStateUpdated(qualia_state);
        
        let result = bus.emit(event.clone());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
        
        // Receive the event
        let received = rx.try_recv().unwrap();
        assert!(matches!(received, GameEvent::QualiaStateUpdated(_)));
    }
    
    #[test]
    fn test_event_bus_multiple_subscribers() {
        let bus = EventBusService::new(100);
        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();
        let mut rx3 = bus.subscribe();
        
        assert_eq!(bus.subscriber_count(), 3);
        
        let qualia_state = QualiaState::default();
        let event = GameEvent::QualiaStateUpdated(qualia_state);
        
        let result = bus.emit(event.clone());
        assert_eq!(result.unwrap(), 3);
        
        // All subscribers receive the event
        assert!(rx1.try_recv().is_ok());
        assert!(rx2.try_recv().is_ok());
        assert!(rx3.try_recv().is_ok());
    }
    
    #[test]
    fn test_event_bus_no_subscribers() {
        let bus = EventBusService::new(100);
        
        let qualia_state = QualiaState::default();
        let event = GameEvent::QualiaStateUpdated(qualia_state);
        
        let result = bus.emit(event);
        assert!(result.is_err());
    }
}

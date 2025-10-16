//! # Responsibility
//! Mock implementation of IEventBus for testing.

use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use shared_core::{GameEvent, IEventBus};

/// # Responsibility
/// Mock event bus that captures emitted events for test assertions.
pub struct MockEventBus {
    tx: broadcast::Sender<GameEvent>,
    emitted_events: Arc<Mutex<Vec<GameEvent>>>,
}

impl MockEventBus {
    /// # Responsibility
    /// Creates a new mock event bus.
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel(1000);
        Self {
            tx,
            emitted_events: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    /// # Responsibility
    /// Gets all emitted events for test assertions.
    pub fn get_emitted_events(&self) -> Vec<GameEvent> {
        self.emitted_events.lock().unwrap().clone()
    }
    
    /// # Responsibility
    /// Clears all captured events.
    pub fn clear(&self) {
        self.emitted_events.lock().unwrap().clear();
    }
}

impl IEventBus for MockEventBus {
    fn emit(&self, event: GameEvent) -> Result<usize, Box<broadcast::error::SendError<GameEvent>>> {
        // Capture event for testing
        self.emitted_events.lock().unwrap().push(event.clone());
        
        // Also emit to real broadcast channel for subscribers
        self.tx.send(event).map_err(Box::new)
    }
    
    fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        self.tx.subscribe()
    }
}

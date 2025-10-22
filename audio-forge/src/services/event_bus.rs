//! # Responsibility
//! Event bus for lock-free pub/sub communication using tokio::sync::broadcast.
//!
//! ---
//!
//! CRITICAL MANDATE (QUALIA.CODE Section 4):
//! Use tokio::sync::broadcast for EventBus. Manual Arc<RwLock<HashMap<...>>>
//! implementations are STRICTLY FORBIDDEN.

use crate::events::AudioForgeEvent;
use anyhow::Result;
use shaku::Interface;
use tokio::sync::broadcast;

/// # Responsibility
/// Interface for event bus pub/sub operations.
///
/// ---
///
/// Provides lock-free event emission and subscription.
pub trait IEventBus: Interface {
    /// Emit event to all subscribers
    fn emit(&self, event: AudioForgeEvent) -> Result<usize>;

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
    fn emit(&self, event: AudioForgeEvent) -> Result<usize> {
        self.tx
            .send(event)
            .map_err(|e| anyhow::anyhow!("EventBus send failed: {:?}", e))
    }

    fn subscribe(&self) -> broadcast::Receiver<AudioForgeEvent> {
        self.tx.subscribe()
    }
}

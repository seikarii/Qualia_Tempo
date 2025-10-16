//! # Responsibility
//! Defines the EventBus interface trait.

use shaku::Interface;
use tokio::sync::broadcast;
use crate::events::GameEvent;

/// # Responsibility
/// Provides lock-free event distribution across all services.
///
/// ---
///
/// CRITICAL MANDATE: Implementations MUST use tokio::sync::broadcast internally.
/// Manual implementations with Arc<RwLock<...>> are STRICTLY FORBIDDEN.
pub trait IEventBus: Interface {
    /// Emit an event to all subscribers
    /// 
    /// # Errors
    /// Returns boxed error if there are no active subscribers (boxed to reduce enum size)
    fn emit(&self, event: GameEvent) -> Result<usize, Box<broadcast::error::SendError<GameEvent>>>;
    
    /// Subscribe to receive all events
    /// 
    /// # Returns
    /// A receiver that will get all future events
    fn subscribe(&self) -> broadcast::Receiver<GameEvent>;
}

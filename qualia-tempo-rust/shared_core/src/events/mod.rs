//! # Responsibility
//! Provides all event type modules for the EventBus system.
//!
//! ---
//!
//! Re-exports all event types and the master GameEvent enum.

pub mod audio_events;
pub mod combat_events;
pub mod game_events;
pub mod system_events;

// Re-export master event type
pub use game_events::GameEvent;

// Re-export specific event types for convenience
pub use audio_events::{MetronomeTick, PlayGenerativeNote};
pub use combat_events::{BossPatternTriggered, ComboExecuted, DamageSource, PlayerDamaged};
pub use system_events::{ErrorOccurred, ErrorType, ServiceInitialized, ShutdownRequested};

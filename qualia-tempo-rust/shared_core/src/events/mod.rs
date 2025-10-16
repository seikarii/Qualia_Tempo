//! # Responsibility
//! Defines all event types for the EventBus communication pattern.
//!
//! ---
//!
//! Events are the primary communication mechanism between services in Qualia Tempo.
//! All events must be Clone for distribution via tokio::sync::broadcast.

pub mod game_events;
pub mod audio_events;
pub mod combat_events;
pub mod system_events;

pub use game_events::*;
pub use audio_events::*;
pub use combat_events::*;
pub use system_events::*;

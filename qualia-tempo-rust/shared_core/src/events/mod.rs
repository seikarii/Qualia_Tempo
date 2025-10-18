//! # Responsibility
//! Aggregates all event type definitions.

pub mod audio_events;
pub mod combat_events;
pub mod game_events;
pub mod system_events;

pub use audio_events::AudioEvent;
pub use combat_events::CombatEvent;
pub use game_events::GameEvent;
pub use system_events::SystemEvent;

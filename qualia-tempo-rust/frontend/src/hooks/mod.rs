//! # Responsibility
//! Leptos hooks module - reusable reactive state access.

pub mod use_game_state;
pub mod use_audio_context;
pub mod use_service_health;

pub use use_game_state::{use_game_state, GameState, QualiaStateData};
pub use use_audio_context::{use_audio_context, AudioContextHandle, AudioContextState};
pub use use_service_health::{use_service_health, ServiceHealthMonitor, ServiceHealthData, ServiceHealth};

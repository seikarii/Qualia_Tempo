//! # Responsibility
//! Defines the master GameEvent enum for EventBus distribution.
//!
//! ---
//!
//! This is the central event type used by tokio::sync::broadcast.
//! All event variants are contained here for type-safe event handling.

use crate::contracts::game_state::{CombatState, QualiaState};
use crate::contracts::input::PlayerAction;
use crate::events::{audio_events, combat_events, system_events};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Master event enum for the entire application.
///
/// ---
///
/// Used by EventBusService (tokio::sync::broadcast) for type-safe event distribution.
/// Every service subscribes to this enum and pattern matches on relevant variants.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GameEvent {
    // Player Input Events
    PlayerActionReceived {
        action: PlayerAction,
    },

    // State Update Events
    QualiaStateUpdated {
        state: QualiaState,
    },
    CombatStateUpdated {
        state: CombatState,
    },

    // Audio Events
    PlayGenerativeNote {
        note: audio_events::PlayGenerativeNote,
    },
    MetronomeTick {
        tick: audio_events::MetronomeTick,
    },

    // Combat Events
    BossPatternTriggered {
        event: combat_events::BossPatternTriggered,
    },
    PlayerDamaged {
        event: combat_events::PlayerDamaged,
    },
    ComboExecuted {
        event: combat_events::ComboExecuted,
    },

    // System Events
    ServiceInitialized {
        event: system_events::ServiceInitialized,
    },
    ErrorOccurred {
        event: system_events::ErrorOccurred,
    },
    ShutdownRequested {
        event: system_events::ShutdownRequested,
    },

    // Game Lifecycle Events
    GameStarted {
        song_id: String,
        boss_id: String,
    },
    GamePaused,
    GameResumed,
    GameEnded {
        final_score: u64,
        victory: bool,
    },
    
    // Server Events
    ServerTick {
        timestamp: std::time::SystemTime,
    },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::Vec2;

    #[test]
    fn test_game_event_player_action_serialization() {
        let event = GameEvent::PlayerActionReceived {
            action: PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: 1000.0,
                accuracy: 0.95,
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"playerActionReceived""#));
    }

    #[test]
    fn test_game_event_qualia_updated() {
        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap();

        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_game_event_game_started() {
        let event = GameEvent::GameStarted {
            song_id: "song_1".to_string(),
            boss_id: "boss_1".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains(r#""type":"gameStarted""#));
    }

    #[test]
    fn test_game_event_play_generative_note() {
        let event = GameEvent::PlayGenerativeNote {
            note: audio_events::PlayGenerativeNote {
                note_pitch: 60,
                velocity: 100,
                instrument_patch_id: "piano".to_string(),
                position: Vec2::ZERO,
                duration_sec: None,
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap();

        assert_eq!(event, deserialized);
    }
}

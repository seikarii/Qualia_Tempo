//! # Responsibility
//! Defines all event types for the `EventBus` communication pattern.
//!
//! ---
//!
//! This module contains the `GameEvent` enum which enumerates ALL possible
//! events that can flow through the `EventBus` (`tokio::sync::broadcast`).

use crate::contracts::{
    audio::PlayGenerativeNote,
    game_state::{CombatState, QualiaState},
    input::PlayerAction,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Enumerates all events that can flow through the `EventBus`.
///
/// ---
///
/// Events are the primary communication mechanism between services.
/// All variants must be Clone for broadcast distribution via `tokio::sync::broadcast`.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "eventType", rename_all = "camelCase")]
pub enum GameEvent {
    /// Player performed an action
    PlayerAction {
        action: PlayerAction,
    },

    /// Qualia state was updated by the `QualiaProcessor`
    QualiaStateUpdated {
        state: QualiaState,
    },

    /// Complete combat state snapshot (sent to frontend)
    CombatStateUpdated {
        state: Box<CombatState>,
    },

    /// Boss entered a new phase
    BossPhaseTransition {
        boss_id: String,
        old_phase: u8,
        new_phase: u8,
    },

    /// Player took damage
    PlayerDamaged {
        amount: f32,
        source: String,
    },

    /// Boss took damage
    BossDamaged {
        amount: f32,
        was_vulnerable: bool,
    },

    /// Combo milestone reached
    ComboMilestone {
        combo_count: u32,
    },

    /// Musical combo activated
    MusicalComboActivated {
        combo_name: String,
        effect: String,
    },

    /// Game started
    GameStarted {
        timestamp: f64,
    },

    /// Game paused
    GamePaused {
        timestamp: f64,
    },

    /// Game resumed
    GameResumed {
        timestamp: f64,
    },

    /// Victory achieved
    Victory {
        final_score: u32,
        timestamp: f64,
    },

    /// Game over (player defeated)
    GameOver {
        final_score: u32,
        timestamp: f64,
    },

    /// System error occurred
    SystemError {
        message: String,
        timestamp: f64,
    },

    /// Generative note should be played (sent to frontend)
    PlayGenerativeNote(PlayGenerativeNote),

    /// Combat event (wrapping `CombatEvent` variants)
    Combat(super::combat_events::CombatEvent),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_action_event_serialization() {
        let event = GameEvent::PlayerAction {
            action: PlayerAction::Parry { timestamp: 1000.0 },
        };

        let json = serde_json::to_string(&event).unwrap(); // Failed to serialize");
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        matches!(deserialized, GameEvent::PlayerAction { .. });
    }

    #[test]
    fn test_qualia_state_updated_event() {
        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };

        let json = serde_json::to_string(&event).unwrap(); // Failed to serialize");
        assert!(json.contains(r#""eventType":"qualiaStateUpdated"#));
    }

    #[test]
    fn test_boss_phase_transition_event() {
        let event = GameEvent::BossPhaseTransition {
            boss_id: "boss_1".to_string(),
            old_phase: 1,
            new_phase: 2,
        };

        let json = serde_json::to_string(&event).unwrap(); // Failed to serialize");
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        if let GameEvent::BossPhaseTransition {
            old_phase,
            new_phase,
            ..
        } = deserialized
        {
            assert_eq!(old_phase, 1);
            assert_eq!(new_phase, 2);
        } else {
            panic!("Deserialized to wrong variant");
        }
    }

    #[test]
    fn test_system_error_event() {
        let event = GameEvent::SystemError {
            message: "Test error".to_string(),
            timestamp: 5000.0,
        };

        let json = serde_json::to_string(&event).unwrap(); // Failed to serialize");
        assert!(json.contains("Test error"));
    }
}

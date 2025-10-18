//! # Responsibility
//! Defines player input action contracts.
//!
//! ---
//!
//! Contains all possible player input actions that can be sent to the backend.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Enumerates all possible player input actions in the game.
///
/// ---
///
/// This tagged enum uses Serde's `tag = "type"` for clean JSON serialization.
/// Each variant contains the relevant data for that action type.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerAction {
    /// Player pressed a musical key (Q, E, R, T, F, G, C)
    KeyPressed {
        key: char,
        timestamp: f64,
        accuracy: f32, // 0.0 to 1.0
    },
    /// Player initiated a dash
    DashInitiated {
        direction: Vec2,
        timestamp: f64,
        on_beat: bool,
    },
    /// Player attempted a parry
    ParryAttempted { timestamp: f64 },
    /// Player activated ultimate ability
    UltimateActivated { timestamp: f64 },
    /// Player moved (mouse position update)
    MouseMoved { position: Vec2, timestamp: f64 },
}

/// # Responsibility
/// Represents analyzed musical input from the player.
///
/// ---
///
/// Contains processed data about player input quality and timing.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalInputAnalysis {
    pub timestamp: f64,
    pub beat_accuracy: f32, // 0.0 to 1.0
    pub harmonic_quality: f32, // 0.0 to 1.0
    pub rhythm_consistency: f32, // 0.0 to 1.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_action_key_pressed_serialization() {
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95,
        };

        let json = serde_json::to_string(&action).unwrap();
        let deserialized: PlayerAction = serde_json::from_str(&json).unwrap();

        assert_eq!(action, deserialized);
    }

    #[test]
    fn test_player_action_dash_serialization() {
        let action = PlayerAction::DashInitiated {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 2000.0,
            on_beat: true,
        };

        let json = serde_json::to_string(&action).unwrap();
        assert!(json.contains(r#""type":"dashInitiated""#));
    }

    #[test]
    fn test_musical_input_analysis_serialization() {
        let analysis = MusicalInputAnalysis {
            timestamp: 1500.0,
            beat_accuracy: 0.9,
            harmonic_quality: 0.85,
            rhythm_consistency: 0.92,
        };

        let json = serde_json::to_string(&analysis).unwrap();
        let deserialized: MusicalInputAnalysis = serde_json::from_str(&json).unwrap();

        assert_eq!(analysis, deserialized);
    }
}

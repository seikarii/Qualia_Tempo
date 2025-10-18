//! # Responsibility
//! Defines all player input action types.
//!
//! ---
//!
//! This module contains `PlayerAction` enum which enumerates all possible
//! player inputs that can be sent to the backend for processing.

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
    /// Player pressed a musical key
    KeyPressed {
        key: char,
        timestamp: f64,
        accuracy: f32, // 0.0 to 1.0
    },
    /// Player performed a dash movement
    Dash {
        direction: Vec2,
        timestamp: f64,
    },
    /// Player activated parry ability
    Parry {
        timestamp: f64,
    },
    /// Player activated ultimate ability
    ActivateUltimate {
        timestamp: f64,
    },
    /// Player deactivated ultimate ability
    DeactivateUltimate {
        timestamp: f64,
    },
    /// Player moved using WASD or analog stick
    Move {
        direction: Vec2,
        timestamp: f64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_pressed_serialization() {
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95,
        };

        let json = serde_json::to_string(&action).unwrap(); // Failed to serialize");
        let deserialized: PlayerAction = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        if let PlayerAction::KeyPressed { key, accuracy, .. } = deserialized {
            assert_eq!(key, 'Q');
            assert!((accuracy - 0.95).abs() < f32::EPSILON);
        } else {
            panic!("Deserialized to wrong variant");
        }
    }

    #[test]
    fn test_dash_serialization() {
        let action = PlayerAction::Dash {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 2000.0,
        };

        let json = serde_json::to_string(&action).unwrap(); // Failed to serialize");
        assert!(json.contains(r#""type":"dash"#));
    }

    #[test]
    fn test_parry_serialization() {
        let action = PlayerAction::Parry { timestamp: 3000.0 };

        let json = serde_json::to_string(&action).unwrap(); // Failed to serialize");
        let deserialized: PlayerAction = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        matches!(deserialized, PlayerAction::Parry { .. });
    }
}

//! # Responsibility
//! Defines player input action types and musical input analysis structures.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::Vec2;

/// # Responsibility
/// Enumerates all possible player input actions in the game.
///
/// ---
///
/// This tagged enum uses Serde's `tag = "type"` for clean JSON serialization.
/// Each variant contains the relevant data for that action type.
/// Directly translated from prototype's PlayerAction types.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerAction {
    /// Player pressed a musical key (Q, E, R, T, F, G, C)
    KeyPressed {
        /// The musical key pressed
        key: char,
        /// Timestamp when key was pressed (ms since epoch)
        timestamp: u64,
        /// Accuracy of timing (0.0 - 1.0, based on metronome sync)
        accuracy: f32,
    },
    
    /// Player performed a dash
    Dash {
        /// Direction of dash
        direction: Vec2,
        /// Timestamp when dash was performed
        timestamp: u64,
        /// Whether dash was perfectly timed with metronome
        perfect_timing: bool,
    },
    
    /// Player collected a qualia orb
    QualiaCollected {
        /// Position where qualia was collected
        position: Vec2,
        /// Timestamp of collection
        timestamp: u64,
        /// Value of collected qualia (affected by timing)
        value: f32,
        /// Color/type of qualia (maps to musical note)
        qualia_type: String,
    },
    
    /// Player activated parry ability
    Parry {
        /// Timestamp of parry activation
        timestamp: u64,
        /// Whether parry was successful (timed correctly)
        successful: bool,
    },
    
    /// Player activated ultimate ability
    UltimateActivated {
        /// Timestamp of activation
        timestamp: u64,
        /// Current combo level when activated
        combo_level: u32,
    },
}

impl PlayerAction {
    /// Get the timestamp of this action
    #[must_use]
    pub const fn timestamp(&self) -> u64 {
        match self {
            Self::KeyPressed { timestamp, .. }
            | Self::Dash { timestamp, .. }
            | Self::QualiaCollected { timestamp, .. }
            | Self::Parry { timestamp, .. }
            | Self::UltimateActivated { timestamp, .. } => *timestamp,
        }
    }
    
    /// Check if this action has perfect timing
    #[must_use]
    pub const fn has_perfect_timing(&self) -> bool {
        match self {
            Self::Dash { perfect_timing, .. } => *perfect_timing,
            Self::KeyPressed { accuracy, .. } => *accuracy > 0.95,
            Self::Parry { successful, .. } => *successful,
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn player_action_timestamp_extraction() {
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 12345,
            accuracy: 0.9,
        };
        assert_eq!(action.timestamp(), 12345);
    }

    #[test]
    fn player_action_perfect_timing_detection() {
        let perfect_dash = PlayerAction::Dash {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 100,
            perfect_timing: true,
        };
        assert!(perfect_dash.has_perfect_timing());
        
        let imperfect_dash = PlayerAction::Dash {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 100,
            perfect_timing: false,
        };
        assert!(!imperfect_dash.has_perfect_timing());
    }

    #[test]
    fn player_action_serialization() {
        let action = PlayerAction::KeyPressed {
            key: 'E',
            timestamp: 999,
            accuracy: 0.85,
        };
        
        let json = serde_json::to_string(&action).unwrap();
        let deserialized: PlayerAction = serde_json::from_str(&json).unwrap();
        
        assert_eq!(action, deserialized);
    }

    #[test]
    fn player_action_variants() {
        let actions = vec![
            PlayerAction::KeyPressed { key: 'Q', timestamp: 1, accuracy: 1.0 },
            PlayerAction::Dash { 
                direction: Vec2::new(1.0, 0.0), 
                timestamp: 2, 
                perfect_timing: true 
            },
            PlayerAction::QualiaCollected { 
                position: Vec2::zero(), 
                timestamp: 3, 
                value: 1.0, 
                qualia_type: "harmony".to_string() 
            },
            PlayerAction::Parry { timestamp: 4, successful: true },
            PlayerAction::UltimateActivated { timestamp: 5, combo_level: 40 },
        ];
        
        for action in actions {
            let json = serde_json::to_string(&action).unwrap();
            let deserialized: PlayerAction = serde_json::from_str(&json).unwrap();
            assert_eq!(action, deserialized);
        }
    }
}

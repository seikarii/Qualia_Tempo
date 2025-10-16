//! # Responsibility
//! Defines player input action structures and enums.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::Vector2;

/// # Responsibility
/// Enumerates all possible player input actions in the game.
///
/// ---
///
/// This tagged enum uses Serde's `tag = "type"` for clean JSON serialization.
/// Each variant contains the relevant data for that action type.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerAction {
    /// Player pressed a musical key (Q, E, R, T, F, G, C)
    KeyPressed {
        /// The musical key pressed ('Q', 'E', 'R', etc.)
        key: char,
        /// Timestamp of the action
        timestamp: f64,
        /// Accuracy of the timing (0-1)
        accuracy: f32,
    },
    /// Player performed a dash
    Dash {
        /// Direction of the dash
        direction: Vector2,
        /// Timestamp of the action
        timestamp: f64,
    },
    /// Player activated ultimate ability
    UltimateActivated {
        /// Timestamp of activation
        timestamp: f64,
    },
    /// Player attempted a parry
    ParryAttempt {
        /// Timestamp of the attempt
        timestamp: f64,
    },
}

/// # Responsibility
/// Enumerates rhythmic pattern types detected from player input.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RhythmicPattern {
    /// No pattern detected
    None,
    /// Steady regular pattern
    Steady,
    /// Syncopated (off-beat) pattern
    Syncopated,
    /// Polyrhythmic (multiple simultaneous patterns)
    Polyrhythmic,
    /// Chaotic/random pattern
    Chaotic,
}

/// # Responsibility
/// Represents input accuracy levels.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InputAccuracy {
    /// Perfect timing
    Perfect,
    /// Good timing
    Good,
    /// Okay timing
    Ok,
    /// Missed timing
    Miss,
}

/// # Responsibility
/// Defines a single action within a combo sequence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ComboActionType {
    /// Hit action
    Hit,
    /// Dash action
    Dash,
    /// Parry action
    Parry,
    /// Sustain action
    Sustain,
}

/// # Responsibility
/// Contains the analysis of the player's input from a musical perspective.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalInputAnalysis {
    /// Analysis timestamp
    pub timestamp: f64,
    /// Rhythmic consistency measure (0-1)
    pub rhythmic_consistency: f32,
    /// Detected rhythmic pattern
    pub detected_pattern: RhythmicPattern,
    /// Harmonic alignment with song (0-1)
    pub harmonic_alignment: f32,
    /// Musical phrase completion (0-1)
    pub phrase_completion: f32,
    /// Dynamic range of inputs (0-1)
    pub dynamic_range: f32,
}

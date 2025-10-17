//! # Responsibility
//! Defines player input action contracts.
//!
//! ---
//!
//! These enums represent all possible player actions that can be sent from
//! frontend to backend. Uses tagged enum serialization for clean JSON.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use super::game_state::Vec2;

/// # Responsibility
/// Enumerates all possible player input actions.
///
/// ---
///
/// Tagged enum using `#[serde(tag = "type")]` for clean JSON serialization.
/// Each variant contains the relevant data for that action type.
///
/// **Source**: TypeScript prototype `PlayerAction.d.ts`
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerAction {
    /// Player pressed a musical note key (Q, E, R, T, F, G, C)
    KeyPressed {
        key: char,
        timestamp: u64,
        /// Timing accuracy (0.0 - 1.0)
        accuracy: f32,
    },
    
    /// Player performed a dash action
    Dash {
        direction: Vec2,
        timestamp: u64,
    },
    
    /// Player activated parry ability
    Parry {
        timestamp: u64,
    },
    
    /// Player activated ultimate ability
    Ultimate {
        timestamp: u64,
    },
    
    /// Player moved their character
    Move {
        position: Vec2,
        timestamp: u64,
    },
    
    /// Player paused the game
    Pause {
        timestamp: u64,
    },
    
    /// Player resumed from pause
    Resume {
        timestamp: u64,
    },
}

/// # Responsibility
/// Contains analyzed musical input data from player actions.
///
/// ---
///
/// This structure is calculated in the frontend before being sent to backend,
/// providing rich context about the musical quality of the input.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalInputAnalysis {
    /// Note name (e.g., "C", "D#", "Bb")
    pub note: String,
    
    /// Octave number
    pub octave: u8,
    
    /// Frequency in Hz
    pub frequency: f32,
    
    /// Timing offset from ideal beat (milliseconds)
    pub timing_offset_ms: f64,
    
    /// Whether this note is harmonically consonant with current context
    pub is_harmonic: bool,
    
    /// Velocity/loudness (0.0 - 1.0)
    pub velocity: f32,
}

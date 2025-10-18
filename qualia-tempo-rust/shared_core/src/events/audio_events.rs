//! # Responsibility
//! Defines audio-specific event types per MUSIC.RUST.md.
//!
//! ---
//!
//! Contains PlayGenerativeNote and other audio events.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Event commanding the Performance Engine to play a generated note.
///
/// ---
///
/// Critical event type for generative music system. Sent from backend to frontend.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayGenerativeNote {
    pub note_pitch: u8, // MIDI note number (0-127)
    pub velocity: u8,   // MIDI velocity (0-127)
    pub instrument_patch_id: String,
    pub position: Vec2, // For 8D audio positioning
    pub duration_sec: Option<f32>, // None = default ADSR envelope
}

/// # Responsibility
/// Event for metronome tick synchronization.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetronomeTick {
    pub beat_number: u32,
    pub timestamp: f64,
    pub bpm: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_play_generative_note_serialization() {
        let note = PlayGenerativeNote {
            note_pitch: 60, // Middle C
            velocity: 100,
            instrument_patch_id: "crystal_bell".to_string(),
            position: Vec2::new(0.0, 0.0),
            duration_sec: Some(1.5),
        };

        let json = serde_json::to_string(&note).unwrap();
        let deserialized: PlayGenerativeNote = serde_json::from_str(&json).unwrap();

        assert_eq!(note, deserialized);
    }

    #[test]
    fn test_metronome_tick_serialization() {
        let tick = MetronomeTick {
            beat_number: 4,
            timestamp: 2000.0,
            bpm: 120.0,
        };

        let json = serde_json::to_string(&tick).unwrap();
        let deserialized: MetronomeTick = serde_json::from_str(&json).unwrap();

        assert_eq!(tick, deserialized);
    }
}

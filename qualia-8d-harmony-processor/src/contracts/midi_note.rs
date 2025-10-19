//! # Responsibility
//! MIDI note representation with pitch bend support.

use serde::{Deserialize, Serialize};

/// Represents a single MIDI note with pitch bend information.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MidiNote {
    pub midi_number: u8,               // 0-127 MIDI note number
    pub start_time_sec: f64,
    pub duration_sec: f64,
    pub velocity: u8,                  // 0-127 velocity
    pub pitch_bend: Option<Vec<PitchBendPoint>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PitchBendPoint {
    pub time_offset_sec: f64,          // Relative to note start
    pub bend_semitones: f32,           // ±2 semitones typical range
}

impl MidiNote {
    /// Validates MIDI note parameters are within valid ranges
    pub fn is_valid(&self) -> bool {
        self.midi_number <= 127
            && self.velocity <= 127
            && self.duration_sec >= 0.0
            && self.start_time_sec >= 0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_midi_note_validation() {
        let valid_note = MidiNote {
            midi_number: 60,  // Middle C
            start_time_sec: 1.0,
            duration_sec: 0.5,
            velocity: 100,
            pitch_bend: None,
        };
        assert!(valid_note.is_valid());

        let invalid_note = MidiNote {
            midi_number: 128,  // Out of range
            start_time_sec: 0.0,
            duration_sec: 0.0,
            velocity: 0,
            pitch_bend: None,
        };
        assert!(!invalid_note.is_valid());
    }

    #[test]
    fn test_pitch_bend_serialization() {
        let note = MidiNote {
            midi_number: 60,
            start_time_sec: 0.0,
            duration_sec: 1.0,
            velocity: 80,
            pitch_bend: Some(vec![
                PitchBendPoint {
                    time_offset_sec: 0.25,
                    bend_semitones: 0.5,
                },
                PitchBendPoint {
                    time_offset_sec: 0.75,
                    bend_semitones: -0.3,
                },
            ]),
        };

        let json = serde_json::to_string(&note).unwrap();
        let deserialized: MidiNote = serde_json::from_str(&json).unwrap();
        assert_eq!(note, deserialized);
    }
}

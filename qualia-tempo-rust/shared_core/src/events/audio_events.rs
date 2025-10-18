//! # Responsibility
//! Defines audio-specific event types for the `EventBus`.
//!
//! ---
//!
//! This module contains events related to generative music, audio layers,
//! and the Performance Engine defined in MUSIC.RUST.md.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::contracts::audio::PlayGenerativeNote;

/// # Responsibility
/// Audio-specific events for music generation and playback.
///
/// ---
///
/// These events flow from backend (Harmony Engine) to frontend (Performance Engine)
/// to trigger procedural music generation in real-time.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AudioEvent {
    /// Generate and play a musical note
    PlayGenerativeNote {
        /// Note generation parameters
        note_data: PlayGenerativeNote,
    },

    /// Start a new audio layer (e.g., drums, bass, lead)
    StartAudioLayer {
        /// Layer identifier
        layer_id: String,
        /// Instrument patch ID
        instrument_patch: String,
        /// Initial volume (0.0 - 1.0)
        volume: f32,
    },

    /// Stop an active audio layer
    StopAudioLayer {
        /// Layer identifier to stop
        layer_id: String,
        /// Fade out duration in milliseconds
        fade_out_ms: u32,
    },

    /// Update audio layer parameters in real-time
    UpdateAudioLayer {
        /// Layer identifier
        layer_id: String,
        /// New volume (0.0 - 1.0)
        volume: Option<f32>,
        /// New pan (-1.0 = left, 1.0 = right)
        pan: Option<f32>,
        /// New reverb amount (0.0 - 1.0)
        reverb: Option<f32>,
    },

    /// Trigger combo effect audio (remolino, atractor, etc.)
    PlayComboEffect {
        /// Combo effect identifier
        effect_id: String,
        /// Audio intensity (0.0 - 1.0)
        intensity: f32,
    },

    /// Play boss attack audio cue
    PlayBossAttackCue {
        /// Attack type identifier
        attack_type: String,
        /// Position in 3D space (x, y, z)
        position: [f32; 3],
    },

    /// Update background music parameters based on `QualiaState`
    UpdateBackgroundMusic {
        /// Intensity multiplier (0.0 - 2.0)
        intensity_multiplier: f32,
        /// Filter cutoff frequency (Hz)
        filter_cutoff: f32,
        /// Distortion amount (0.0 - 1.0)
        distortion: f32,
    },

    /// Trigger `8D` audio spatialization update
    Update8DAudio {
        /// Player head position (x, y, z)
        listener_position: [f32; 3],
        /// Player facing direction (normalized)
        listener_forward: [f32; 3],
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_play_generative_note_event() {
        let note = PlayGenerativeNote {
            note: 60, // Middle C (MIDI)
            velocity: 0.8,
            duration: 0.5,
            patch_id: "piano".to_string(),
            spatial_position: Some((0.0, 0.0, -5.0)),
        };

        let event = AudioEvent::PlayGenerativeNote { note_data: note };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: AudioEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            AudioEvent::PlayGenerativeNote { note_data } => {
                assert_eq!(note_data.note, 60);
                assert_eq!(note_data.velocity, 0.8);
                assert_eq!(note_data.patch_id, "piano");
            }
            _ => panic!("Wrong event type deserialized"),
        }
    }

    #[test]
    fn test_start_audio_layer_event() {
        let event = AudioEvent::StartAudioLayer {
            layer_id: "drums".to_string(),
            instrument_patch: "808_kit".to_string(),
            volume: 0.7,
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("startAudioLayer"));
        assert!(json.contains("drums"));
    }

    #[test]
    fn test_update_8d_audio_event() {
        let event = AudioEvent::Update8DAudio {
            listener_position: [0.0, 1.5, 0.0],
            listener_forward: [0.0, 0.0, 1.0],
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: AudioEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            AudioEvent::Update8DAudio {
                listener_position,
                listener_forward,
            } => {
                assert_eq!(listener_position[1], 1.5);
                assert_eq!(listener_forward[2], 1.0);
            }
            _ => panic!("Wrong event type"),
        }
    }
}

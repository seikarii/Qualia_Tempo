//! # Responsibility
//! Defines audio-specific event types for the Performance Engine (frontend audio synthesis).
//!
//! ---
//!
//! This module implements audio events from MUSIC.RUST.md, used to communicate
//! between GameLogicService and the frontend's AudioService for generative music playback.

use serde::{Deserialize, Serialize};
use crate::contracts::audio::InstrumentPatch;

/// # Responsibility
/// Defines the category of audio event for mixing purposes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AudioEventCategory {
    Music,
    Sfx,
    Ui,
    Ambience,
}

/// # Responsibility
/// Event commanding the frontend to play a generative note.
///
/// ---
///
/// This is the primary audio event sent from backend to frontend.
/// The Performance Engine receives this and synthesizes the note using
/// the specified instrument patch and musical parameters.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayGenerativeNoteEvent {
    pub note: String,          // e.g., "C4", "D#5"
    pub velocity: f32,         // 0.0 to 1.0 (note loudness)
    pub duration_sec: f64,     // Note duration
    pub instrument: InstrumentPatch,
    pub category: AudioEventCategory,
}

/// # Responsibility
/// Event commanding playback of a pre-recorded audio file.
///
/// ---
///
/// Used for UI sounds, boss roars, special effects that require
/// high-fidelity samples rather than synthesis.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayAudioFileEvent {
    pub file_path: String,
    pub volume: f32,           // 0.0 to 1.0
    pub loop_playback: bool,
    pub category: AudioEventCategory,
}

/// # Responsibility
/// Event commanding audio parameter changes (volume, pitch, filter cutoff).
///
/// ---
///
/// Used for real-time audio mixing based on QualiaState changes.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioParameterChangeEvent {
    pub category: AudioEventCategory,
    pub parameter_name: String, // e.g., "master_volume", "reverb_mix"
    pub target_value: f32,
    pub transition_duration_sec: f64,
}

/// # Responsibility
/// Event signaling the metronome tick (musical beat).
///
/// ---
///
/// Sent from backend at each beat of the song, used for:
/// - Dash cooldown reset
/// - Visual pulse synchronization
/// - Combo timing validation
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetronomeTickEvent {
    pub beat_number: u32,
    pub measure_number: u32,
    pub is_downbeat: bool,
    pub timestamp: f64, // Seconds since song start
}

/// # Responsibility
/// Aggregates all audio event types into a single enum.
///
/// ---
///
/// This is used internally by GameEvent and for EventBus serialization.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AudioEvent {
    PlayGenerativeNote(PlayGenerativeNoteEvent),
    PlayAudioFile(PlayAudioFileEvent),
    AudioParameterChange(AudioParameterChangeEvent),
    MetronomeTick(MetronomeTickEvent),
}

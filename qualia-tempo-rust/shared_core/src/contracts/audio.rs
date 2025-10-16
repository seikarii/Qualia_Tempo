//! # Responsibility
//! Defines audio system structures for generative music and spatial audio.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::Vector3;

/// # Responsibility
/// Defines a single harmonic region within a song's timeline.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct HarmonicContext {
    /// Start time in seconds
    pub start_time_sec: f64,
    /// End time in seconds
    pub end_time_sec: f64,
    /// Chord symbol (e.g., "Am7", "G", "Cmaj7")
    pub chord: String,
    /// MIDI pitches allowed in this section (0-127)
    pub scale: Vec<u8>,
}

/// # Responsibility
/// Contains the complete musical theory analysis of a song.
/// This map is the "ruleset" for all generative music.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct HarmonyMap {
    /// Song unique identifier
    pub song_id: String,
    /// Key signature (e.g., "C Major")
    pub key_signature: String,
    /// Time signature (numerator, denominator)
    pub time_signature: (u8, u8),
    /// Harmonic progression over time
    pub progression: Vec<HarmonicContext>,
}

/// # Responsibility
/// Defines synthesizer parameters for procedural sound generation.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SynthParameters {
    /// Oscillator type ("sine", "square", "sawtooth", "triangle")
    pub oscillator1_type: String,
    /// Filter cutoff frequency
    pub filter_cutoff: f32,
    /// ADSR attack time
    pub adsr_attack: f32,
    /// ADSR decay time
    pub adsr_decay: f32,
    /// ADSR sustain level
    pub adsr_sustain: f32,
    /// ADSR release time
    pub adsr_release: f32,
}

/// # Responsibility
/// Defines the type of instrument patch (sampler or synthesizer).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PatchType {
    /// Sample-based instrument
    Sampler {
        /// URL to JSON mapping MIDI notes to .wav files
        sample_map_url: String,
    },
    /// Synthesizer-based instrument
    Synth {
        /// Synthesizer configuration parameters
        parameters: SynthParameters,
    },
}

/// # Responsibility
/// Defines a playable instrument, either sample-based or synthesized.
/// Player and Boss will have a collection of these assigned per level.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InstrumentPatch {
    /// Patch unique identifier
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Patch type and configuration
    pub patch_type: PatchType,
}

/// # Responsibility
/// Commands the frontend Performance Engine to generate a sound in 3D space.
///
/// ---
///
/// CRITICAL: Uses Vector3 for 3D spatial audio positioning.
/// The audio engine will use this position for proper 8D spatialization.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlayGenerativeNote {
    /// MIDI pitch value (0-127)
    pub note_pitch: u8,
    /// Note velocity (0-127)
    pub velocity: u8,
    /// ID of the InstrumentPatch to use
    pub instrument_patch_id: String,
    /// World position for 3D/8D spatialization
    pub position: Vector3,
}

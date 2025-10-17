//! # Responsibility
//! Contains audio system data structures for generative music.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::math::Vec2;

/// # Responsibility
/// Commands the frontend Performance Engine to generate a sound.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayGenerativeNote {
    pub note_pitch: u8,
    pub velocity: u8,
    pub instrument_patch_id: String,
    pub position: Vec2,
}

/// # Responsibility
/// Defines a single harmonic region within a song's timeline.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HarmonicContext {
    pub start_time_sec: f64,
    pub end_time_sec: f64,
    pub chord: String,
    pub scale: Vec<u8>,
}

/// # Responsibility
/// Contains the complete musical theory analysis of a song.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HarmonyMap {
    pub song_id: String,
    pub harmonic_regions: Vec<HarmonicContext>,
    pub key: String,
    pub bpm: f32,
}

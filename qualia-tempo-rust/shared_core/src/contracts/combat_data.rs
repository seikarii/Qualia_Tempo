//! # Responsibility
//! Defines all combat-related data structures for song patterns, lyrics, and musical combos.
//!
//! ---
//!
//! This module implements the complete combat data model from DATA.RUST.md, including
//! SongData (musical structure), PatternData (boss attack patterns), and MusicalComboData
//! (player combo definitions). All structs are serializable for loading from JSON/RON files.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Defines the musical time signature of a song.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimeSignature {
    pub numerator: u8,
    pub denominator: u8,
}

impl Default for TimeSignature {
    fn default() -> Self {
        Self {
            numerator: 4,
            denominator: 4,
        }
    }
}

/// # Responsibility
/// Defines a structural section of a song (verse, chorus, bridge, etc.).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongSection {
    pub name: String,
    pub start_time_sec: f64,
    pub end_time_sec: f64,
}

/// # Responsibility
/// Defines a single beat in the song's timeline.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BeatData {
    pub timestamp: f64,
    pub beat_number: u32,
    pub measure_number: u32,
    pub is_downbeat: bool,
}

/// # Responsibility
/// Defines the difficulty tier of a song.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DifficultyTier {
    Easy,
    Normal,
    Hard,
    Expert,
    Master,
}

/// # Responsibility
/// Defines the complete musical structure and rhythm data of a song.
///
/// ---
///
/// This is loaded from JSON/RON files at the start of a combat encounter.
/// Contains all musical metadata needed by HarmonyAnalysisService and GameLogicService.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongData {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub bpm: f32,
    pub time_signature: TimeSignature,
    pub duration_sec: f64,
    pub audio_file_path: String,
    pub sections: Vec<SongSection>,
    pub beats: Vec<BeatData>,
    pub difficulty_tier: DifficultyTier,
    pub key_signature: String, // e.g., "C_MINOR", "D_MAJOR"
}

/// # Responsibility
/// Defines the shape and behavior of a boss attack pattern.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PatternShape {
    Circle,
    Spiral,
    Wave,
    Cross,
    Random,
    Targeted,
}

/// # Responsibility
/// Defines the element type of an attack pattern (affects visuals and audio).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PatternElement {
    Fire,
    Ice,
    Lightning,
    Void,
    Harmony,
    Chaos,
}

/// # Responsibility
/// Defines a single boss attack pattern.
///
/// ---
///
/// Used by BossAIService to determine which attack to execute based on
/// current game phase, player qualia state, and combat intensity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternData {
    pub id: String,
    pub name: String,
    pub shape: PatternShape,
    pub element: PatternElement,
    pub duration_sec: f64,
    pub telegraph_duration_sec: f64,
    pub projectile_count: u32,
    pub projectile_speed: f32,
    pub damage: f32,
    pub required_phase: u8, // Minimum boss phase to use this pattern
}

/// # Responsibility
/// Defines the type of musical combo effect.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ComboEffectType {
    Beneficial, // Harmonic combos
    Malicious,  // Chaotic combos
}

/// # Responsibility
/// Defines a single musical combo that players can execute.
///
/// ---
///
/// Combos are emergent - they can be triggered through multiple sources:
/// - Direct key presses (Q+E+R)
/// - Qualia collection in specific musical intervals
/// - Rhythm-perfect timing with metronome beats
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalComboData {
    pub id: String,
    pub name: String,
    pub required_notes: Vec<String>, // e.g., ["Q", "E", "R"]
    pub effect_type: ComboEffectType,
    pub effect_description: String,
    pub cooldown_sec: f64,
    pub qualia_generation_multiplier: f32,
}

/// # Responsibility
/// Aggregates all combat data for a single encounter.
///
/// ---
///
/// This is the root data structure loaded at combat start.
/// Contains everything needed to run a complete boss fight.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatData {
    pub encounter_id: String,
    pub song: SongData,
    pub boss_id: String,
    pub patterns: Vec<PatternData>,
    pub combos: Vec<MusicalComboData>,
}

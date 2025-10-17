//! # Responsibility
//! Defines all combat-related data structures for songs, combos, and boss patterns.
//!
//! ---
//!
//! This module contains the data contracts loaded from configuration files
//! that define the musical structure, combo sequences, and boss attack patterns.
//! These are the building blocks for combat orchestration.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use super::game_state::{QualiaState, Vec2};

/// # Responsibility
/// Defines the musical time signature.
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
/// Defines a structural section of a song (e.g., verse, chorus).
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
    pub bar_number: u32,
    pub is_downbeat: bool,
}

/// # Responsibility
/// Defines the difficulty tier of a song.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SongDifficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

impl Default for SongDifficulty {
    fn default() -> Self {
        Self::Medium
    }
}

/// # Responsibility
/// Contains all metadata and structural information for a song.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongData {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub bpm: f32,
    pub duration_sec: f64,
    pub audio_file_path: String,
    pub time_signature: TimeSignature,
    pub key: Option<String>,
    pub sections: Vec<SongSection>,
    pub beat_map: Vec<BeatData>,
    pub difficulty: SongDifficulty,
    pub preview_start_sec: Option<f64>,
}

/// # Responsibility
/// Defines a single action within a combo sequence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ComboActionType {
    Hit,
    Dash,
    Parry,
    Sustain,
}

/// # Responsibility
/// Defines the timing requirement for a combo action.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ComboTiming {
    Exact,
    Early,
    Late,
    Any,
}

/// # Responsibility
/// Defines a step in a combo sequence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ComboStep {
    pub action: ComboActionType,
    pub timing: ComboTiming,
    pub max_delay_ms: Option<u32>,
}

/// # Responsibility
/// Defines a musical combo and its effects.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalComboData {
    pub id: String,
    pub name: String,
    pub sequence: Vec<ComboStep>,
    pub bonus_multiplier: f32,
    pub qualia_modifiers: QualiaState,
    pub visual_effect_id: Option<String>,
    pub audio_effect_id: Option<String>,
    pub difficulty: SongDifficulty,
}

/// # Responsibility
/// Defines the type of a boss attack pattern.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PatternType {
    Projectile,
    Area,
    Melee,
    Summon,
    Buff,
}

/// # Responsibility
/// Defines the visual properties of a pattern note.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternNoteVisuals {
    pub color: Option<String>,
    pub size: Option<f32>,
    pub shape: Option<String>,
}

/// # Responsibility
/// Defines a single note or projectile within a boss attack pattern.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternNote {
    pub timestamp: f64,
    pub position: Vec2,
    pub velocity: Option<Vec2>,
    pub damage: f32,
    pub visual_data: Option<PatternNoteVisuals>,
}

/// # Responsibility
/// Defines the thresholds required to trigger a pattern.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaThreshold {
    pub aggression: Option<f32>,
    pub chaos: Option<f32>,
}

/// # Responsibility
/// Defines a complete boss attack pattern.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternData {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub pattern_type: PatternType,
    pub phases: Vec<u32>,
    pub notes: Vec<PatternNote>,
    pub duration_sec: f64,
    pub cooldown_sec: f64,
    pub required_qualia_threshold: Option<QualiaThreshold>,
}

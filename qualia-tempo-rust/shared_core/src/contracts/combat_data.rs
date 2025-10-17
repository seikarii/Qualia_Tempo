//! # Responsibility
//! Contains all combat-related data structures for songs, patterns, and combos.
//!
//! ---
//!
//! This module defines the battle content structures: song metadata, boss attack
//! patterns, musical combo definitions, and lyric data. These are typically loaded
//! from configuration files (JSON/RON) at combat initialization.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::math::Vec2;
use super::game_state::QualiaState;

/// # Responsibility
/// Defines the musical time signature (e.g., 4/4, 3/4, 7/8).
///
/// ---
///
/// Used to calculate beat alignment and musical timing windows.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimeSignature {
    /// Top number (beats per bar)
    pub numerator: u8,
    
    /// Bottom number (note value)
    pub denominator: u8,
}

/// # Responsibility
/// Defines a structural section of a song (e.g., verse, chorus, bridge).
///
/// ---
///
/// Used for phase transitions and intensity scaling.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongSection {
    /// Section name (e.g., "intro", "verse1", "chorus")
    pub name: String,
    
    /// Start time in seconds
    pub start_time_sec: f64,
    
    /// End time in seconds
    pub end_time_sec: f64,
}

/// # Responsibility
/// Defines a single beat in the song's timeline.
///
/// ---
///
/// Used for rhythm synchronization and Qualia generation timing.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BeatData {
    /// Timestamp in seconds
    pub timestamp: f64,
    
    /// Beat number within the song
    pub beat_number: u32,
    
    /// Bar (measure) number
    pub bar_number: u32,
    
    /// Whether this is a downbeat (first beat of the bar)
    pub is_downbeat: bool,
}

/// # Responsibility
/// Defines the difficulty tier of a song.
///
/// ---
///
/// Affects timing windows, pattern complexity, and score multipliers.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
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
///
/// ---
///
/// This is loaded from configuration files and used by the HarmonyAnalysisService
/// to understand the song's structure.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongData {
    /// Unique identifier
    pub id: String,
    
    /// Song title
    pub title: String,
    
    /// Artist name
    pub artist: String,
    
    /// Beats per minute
    pub bpm: f32,
    
    /// Total duration in seconds
    pub duration_sec: f64,
    
    /// Path to audio file (relative or absolute)
    pub audio_file_path: String,
    
    /// Time signature
    pub time_signature: TimeSignature,
    
    /// Musical key (e.g., "C major", "A minor")
    pub key: Option<String>,
    
    /// Song sections
    pub sections: Vec<SongSection>,
    
    /// Beat map for rhythm synchronization
    pub beat_map: Vec<BeatData>,
    
    /// Difficulty level
    pub difficulty: SongDifficulty,
    
    /// Preview start time for song select screen
    pub preview_start_sec: Option<f64>,
}

/// # Responsibility
/// Defines a single action within a combo sequence.
///
/// ---
///
/// Used to validate player input sequences for combo detection.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ComboActionType {
    /// Hit a musical note
    Hit,
    
    /// Dash action
    Dash,
    
    /// Parry action
    Parry,
    
    /// Sustain a note
    Sustain,
}

/// # Responsibility
/// Defines the timing requirement for a combo action.
///
/// ---
///
/// Used to determine if player input matches combo timing constraints.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ComboTiming {
    /// Must be frame-perfect
    Exact,
    
    /// Slightly before the beat
    Early,
    
    /// Slightly after the beat
    Late,
    
    /// Any timing is acceptable
    Any,
}

/// # Responsibility
/// Defines a step in a combo sequence.
///
/// ---
///
/// Combos are sequences of these steps that must be executed in order
/// with correct timing to trigger combo effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ComboStep {
    /// Type of action required
    pub action: ComboActionType,
    
    /// Timing requirement
    pub timing: ComboTiming,
    
    /// Maximum delay in milliseconds before combo breaks
    pub max_delay_ms: Option<u32>,
}

/// # Responsibility
/// Defines a musical combo and its effects.
///
/// ---
///
/// Combos provide score multipliers and Qualia modifiers when successfully
/// executed. See GDD.md Section 3.4 for combo system details.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalComboData {
    /// Unique identifier
    pub id: String,
    
    /// Human-readable name (e.g., "Remolino", "Atractor")
    pub name: String,
    
    /// Sequence of steps required to execute this combo
    pub sequence: Vec<ComboStep>,
    
    /// Score multiplier bonus (1.0 = no bonus, 1.5 = 50% increase)
    pub bonus_multiplier: f32,
    
    /// Qualia state modifiers applied on combo success
    pub qualia_modifiers: QualiaState,
    
    /// ID of visual effect to spawn
    pub visual_effect_id: Option<String>,
    
    /// ID of audio effect to play
    pub audio_effect_id: Option<String>,
    
    /// Difficulty level required to unlock this combo
    pub difficulty: SongDifficulty,
}

/// # Responsibility
/// Defines the type of a boss attack pattern.
///
/// ---
///
/// Used to determine collision detection and visual rendering.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PatternType {
    /// Spawns projectiles that travel
    Projectile,
    
    /// Area-of-effect attack
    Area,
    
    /// Close-range attack
    Melee,
    
    /// Summons additional entities
    Summon,
    
    /// Applies buff to boss
    Buff,
}

/// # Responsibility
/// Defines the visual properties of a pattern note.
///
/// ---
///
/// Used by the renderer to display attack projectiles/effects.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternNoteVisuals {
    /// Color (hex string, e.g., "#FF0000")
    pub color: Option<String>,
    
    /// Size multiplier (1.0 = default)
    pub size: Option<f32>,
    
    /// Shape identifier (e.g., "sphere", "cube")
    pub shape: Option<String>,
}

/// # Responsibility
/// Defines a single note or projectile within a boss attack pattern.
///
/// ---
///
/// Patterns are sequences of these notes spawned over time.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternNote {
    /// Timestamp in seconds from pattern start
    pub timestamp: f64,
    
    /// Spawn position
    pub position: Vec2,
    
    /// Initial velocity (if projectile)
    pub velocity: Option<Vec2>,
    
    /// Damage dealt on hit
    pub damage: f32,
    
    /// Visual appearance properties
    pub visual_data: Option<PatternNoteVisuals>,
}

/// # Responsibility
/// Defines the Qualia thresholds required to trigger a pattern.
///
/// ---
///
/// Patterns can be conditional on player Qualia state, making boss AI
/// reactive to player performance.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaThreshold {
    /// Minimum aggression level (0.0 to 1.0)
    pub aggression: Option<f32>,
    
    /// Minimum chaos level (0.0 to 1.0)
    pub chaos: Option<f32>,
}

/// # Responsibility
/// Defines a complete boss attack pattern.
///
/// ---
///
/// Patterns are selected by the BossAIService based on current phase,
/// player Qualia, and cooldowns. See GDD.md Section 3.5 for details.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternData {
    /// Unique identifier
    pub id: String,
    
    /// Human-readable name
    pub name: String,
    
    /// Pattern type
    #[serde(rename = "type")]
    pub pattern_type: PatternType,
    
    /// Boss phases where this pattern can be used
    pub phases: Vec<u32>,
    
    /// Sequence of notes/projectiles
    pub notes: Vec<PatternNote>,
    
    /// Total duration in seconds
    pub duration_sec: f64,
    
    /// Cooldown in seconds before pattern can be used again
    pub cooldown_sec: f64,
    
    /// Qualia threshold required to trigger (if any)
    pub required_qualia_threshold: Option<QualiaThreshold>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_signature_serialization() {
        let ts = TimeSignature {
            numerator: 4,
            denominator: 4,
        };
        
        let json = serde_json::to_string(&ts).expect("Failed to serialize");
        let deserialized: TimeSignature = serde_json::from_str(&json).expect("Failed to deserialize");
        
        assert_eq!(ts, deserialized);
    }

    #[test]
    fn test_song_difficulty_default() {
        assert_eq!(SongDifficulty::default(), SongDifficulty::Medium);
    }

    #[test]
    fn test_combo_action_type_serialization() {
        let action = ComboActionType::Dash;
        let json = serde_json::to_string(&action).expect("Failed to serialize");
        assert!(json.contains("dash"));
    }

    #[test]
    fn test_pattern_type_serialization() {
        let pattern = PatternType::Projectile;
        let json = serde_json::to_string(&pattern).expect("Failed to serialize");
        assert!(json.contains("projectile"));
    }
}

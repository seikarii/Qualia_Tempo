//! # Responsibility
//! Defines combat encounter data structures loaded from configuration files.
//!
//! ---
//!
//! This module contains `SongData`, `PatternData`, `LyricData`, and related types
//! that define a complete combat encounter. These are loaded at startup from JSON/RON
//! files and used by the backend to orchestrate boss battles.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Defines the musical time signature.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimeSignature {
    pub numerator: u8,
    pub denominator: u8,
}

/// # Responsibility
/// Defines a structural section of a song (e.g., verse, chorus).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongSection {
    /// Section name (e.g., "intro", "verse", "chorus", "bridge", "outro")
    pub name: String,
    /// Start time in seconds
    pub start_time_sec: f64,
    /// End time in seconds
    pub end_time_sec: f64,
}

/// # Responsibility
/// Defines a single beat in the song's timeline.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BeatData {
    /// Beat number (0-indexed)
    pub beat_number: u32,
    /// Timestamp in seconds
    pub timestamp_sec: f64,
    /// Beat strength (0.0 to 1.0, 1.0 = downbeat)
    pub strength: f32,
}

/// # Responsibility
/// Defines the complete musical structure and metadata for a song.
///
/// ---
///
/// This is loaded from JSON/RON configuration files and used by the backend
/// to synchronize gameplay with music.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongData {
    /// Song identifier
    pub id: String,
    /// Song title
    pub title: String,
    /// Artist name
    pub artist: String,
    /// Audio file path
    pub audio_file: String,
    /// Tempo in BPM
    pub bpm: f32,
    /// Time signature
    pub time_signature: TimeSignature,
    /// Song duration in seconds
    pub duration_sec: f64,
    /// Structural sections
    pub sections: Vec<SongSection>,
    /// Beat timeline
    pub beats: Vec<BeatData>,
}

/// # Responsibility
/// Enumerates attack pattern types.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AttackPatternType {
    Projectile,
    AreaOfEffect,
    Melee,
    Wave,
    Spiral,
}

/// # Responsibility
/// Defines a boss attack pattern tied to song timing.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternData {
    /// Pattern identifier
    pub id: String,
    /// Pattern name
    pub name: String,
    /// Pattern type
    pub pattern_type: AttackPatternType,
    /// Trigger time in seconds
    pub trigger_time_sec: f64,
    /// Telegraph duration in seconds (visual warning before attack)
    pub telegraph_duration_sec: f64,
    /// Attack duration in seconds
    pub attack_duration_sec: f64,
    /// Damage value
    pub damage: f32,
    /// Spawn positions for projectiles/AOE
    pub spawn_positions: Vec<Vec2>,
    /// Additional metadata (JSON blob for extensibility)
    pub metadata: serde_json::Value,
}

/// # Responsibility
/// Represents a line of lyrics with timing information.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LyricLine {
    /// Lyric text
    pub text: String,
    /// Start time in seconds
    pub start_time_sec: f64,
    /// End time in seconds
    pub end_time_sec: f64,
}

/// # Responsibility
/// Defines the complete lyrics data for a song.
///
/// ---
///
/// Lyrics are synchronized with combat and can trigger narrative events
/// or visual effects in the frontend.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LyricData {
    /// Song identifier (matches `SongData::id`)
    pub song_id: String,
    /// Language code (e.g., "en", "es", "ja")
    pub language: String,
    /// Lyric lines with timing
    pub lines: Vec<LyricLine>,
}

/// # Responsibility
/// Defines a complete combat encounter with all necessary data.
///
/// ---
///
/// This is the top-level structure loaded for each boss fight.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatData {
    /// Encounter identifier
    pub id: String,
    /// Boss identifier
    pub boss_id: String,
    /// Song data
    pub song: SongData,
    /// Attack patterns
    pub patterns: Vec<PatternData>,
    /// Lyrics (optional)
    pub lyrics: Option<LyricData>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_song_data_serialization() {
        let song = SongData {
            id: "test_song".to_string(),
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            audio_file: "test.ogg".to_string(),
            bpm: 120.0,
            time_signature: TimeSignature {
                numerator: 4,
                denominator: 4,
            },
            duration_sec: 180.0,
            sections: vec![SongSection {
                name: "intro".to_string(),
                start_time_sec: 0.0,
                end_time_sec: 8.0,
            }],
            beats: vec![BeatData {
                beat_number: 0,
                timestamp_sec: 0.0,
                strength: 1.0,
            }],
        };

        let json = serde_json::to_string(&song).unwrap(); // Failed to serialize");
        let deserialized: SongData = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        assert_eq!(song, deserialized);
    }

    #[test]
    fn test_pattern_data_serialization() {
        let pattern = PatternData {
            id: "pattern_1".to_string(),
            name: "Spiral Wave".to_string(),
            pattern_type: AttackPatternType::Spiral,
            trigger_time_sec: 10.0,
            telegraph_duration_sec: 0.5,
            attack_duration_sec: 2.0,
            damage: 15.0,
            spawn_positions: vec![Vec2::new(0.0, 0.0), Vec2::new(1.0, 1.0)],
            metadata: serde_json::json!({ "spiral_arms": 4 }),
        };

        let json = serde_json::to_string(&pattern).unwrap(); // Failed to serialize");
        let deserialized: PatternData =
            serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        assert_eq!(pattern.id, deserialized.id);
        assert_eq!(pattern.pattern_type, deserialized.pattern_type);
    }

    #[test]
    fn test_lyric_data_serialization() {
        let lyrics = LyricData {
            song_id: "test_song".to_string(),
            language: "en".to_string(),
            lines: vec![LyricLine {
                text: "In the depths of the abyss".to_string(),
                start_time_sec: 0.0,
                end_time_sec: 2.5,
            }],
        };

        let json = serde_json::to_string(&lyrics).unwrap(); // Failed to serialize");
        let deserialized: LyricData = serde_json::from_str(&json).unwrap(); // Failed to deserialize");

        assert_eq!(lyrics, deserialized);
    }

    #[test]
    fn test_combat_data_full() {
        let combat = CombatData {
            id: "encounter_1".to_string(),
            boss_id: "boss_1".to_string(),
            song: SongData {
                id: "song_1".to_string(),
                title: "Battle Theme".to_string(),
                artist: "Composer".to_string(),
                audio_file: "battle.ogg".to_string(),
                bpm: 140.0,
                time_signature: TimeSignature {
                    numerator: 4,
                    denominator: 4,
                },
                duration_sec: 200.0,
                sections: vec![],
                beats: vec![],
            },
            patterns: vec![],
            lyrics: None,
        };

        let json = serde_json::to_string(&combat).unwrap(); // Failed to serialize");
        let _deserialized: CombatData =
            serde_json::from_str(&json).unwrap(); // Failed to deserialize");
    }
}

//! # Responsibility
//! Defines combat data contracts loaded from configuration files.
//!
//! ---
//!
//! Contains SongData, PatternData, MusicalComboData and related structures
//! as specified in DATA.RUST.md. These contracts define the complete data
//! structure for boss fights, including song metadata, attack patterns,
//! combo systems, and lyrical narrative integration.

use crate::contracts::audio::{HarmonyMap, InstrumentPatch};
use crate::contracts::game_state::QualiaState;
use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// ============================================================================
// Song Data Structures (Section 2.1 of DATA.RUST.md)
// ============================================================================

/// # Responsibility
/// Defines the musical time signature of a song.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimeSignature {
    pub numerator: u8,
    pub denominator: u8,
}

/// # Responsibility
/// Defines a structural section of a song (e.g., verse, chorus, bridge).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongSection {
    /// Name of the section (e.g., "intro", "verse", "chorus")
    pub name: String,
    pub start_time_sec: f64,
    pub end_time_sec: f64,
}

/// # Responsibility
/// Defines a single beat in the song's timeline for rhythm tracking.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BeatData {
    /// Timestamp in seconds from song start
    pub timestamp: f64,
    pub beat_number: u32,
    pub bar_number: u32,
    pub is_downbeat: bool,
}

/// # Responsibility
/// Enumerates the difficulty tiers for songs and gameplay elements.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SongDifficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

/// # Responsibility
/// Contains all metadata and structural information for a song.
///
/// ---
///
/// This is the complete song data structure loaded from configuration files.
/// It includes musical structure (beats, sections), metadata (title, artist),
/// and harmony analysis for generative music systems.
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

// ============================================================================
// Musical Combo System (Section 2.2 of DATA.RUST.md)
// ============================================================================

/// # Responsibility
/// Enumerates the types of actions that can be part of a combo sequence.
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
/// Defines a single step in a musical combo sequence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ComboStep {
    pub action: ComboActionType,
    pub timing: ComboTiming,
    pub max_delay_ms: Option<u32>,
}

/// # Responsibility
/// Defines a complete musical combo with its effects and requirements.
///
/// ---
///
/// Combos are emergent patterns that can be beneficial (harmonic) or
/// malicious (chaotic) depending on the musical context. This structure
/// defines the sequence, rewards, and modifiers for a combo pattern.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalComboDataFull {
    pub id: String,
    pub name: String,
    pub sequence: Vec<ComboStep>,
    pub bonus_multiplier: f32,
    /// Partial QualiaState used as modifier
    pub qualia_modifiers: QualiaState,
    pub visual_effect_id: Option<String>,
    pub audio_effect_id: Option<String>,
    pub difficulty: SongDifficulty,
}

// ============================================================================
// Boss Pattern System (Section 2.3 of DATA.RUST.md)
// ============================================================================

/// # Responsibility
/// Enumerates the types of boss attack patterns.
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
/// Defines the visual properties of a pattern note/projectile.
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
    /// Timestamp in seconds from pattern start
    pub timestamp: f64,
    pub position: Vec2,
    pub velocity: Option<Vec2>,
    pub damage: f32,
    pub visual_data: Option<PatternNoteVisuals>,
}

/// # Responsibility
/// Defines QualiaState thresholds required to trigger a pattern.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaThreshold {
    pub aggression: Option<f32>,
    pub chaos: Option<f32>,
}

/// # Responsibility
/// Defines a complete boss attack pattern with all metadata and execution data.
///
/// ---
///
/// Patterns are triggered by BossAI based on QualiaState thresholds and
/// song position. Each pattern contains timing data, projectile sequences,
/// and visual/audio cues for telegraphing.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternDataFull {
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

// ============================================================================
// Legacy Simplified Structures (Backward Compatibility)
// ============================================================================

// ============================================================================
// Legacy Simplified Structures (Backward Compatibility)
// ============================================================================

/// # Responsibility
/// Simplified combo data for basic pattern matching.
///
/// ---
///
/// This is a streamlined version used for emergent harmonic detection.
/// For full combo configuration, use MusicalComboDataFull.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[allow(clippy::derive_partial_eq_without_eq)] // Contains String (not Eq)
#[serde(rename_all = "camelCase")]
pub struct MusicalComboData {
    pub id: String,
    pub name: String,
    pub required_notes: Vec<char>, // e.g., ['Q', 'E', 'R']
    pub is_beneficial: bool, // true = harmonic, false = chaotic
    pub effect_description: String,
    pub visual_effect_id: Option<String>,
}

/// # Responsibility
/// Simplified pattern data for basic boss attack orchestration.
///
/// ---
///
/// This is a streamlined version for rapid prototyping.
/// For full pattern configuration, use PatternDataFull.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternData {
    pub id: String,
    pub name: String,
    pub telegraph_duration_ms: f64,
    pub execution_duration_ms: f64,
    pub damage: f32,
    pub spawn_positions: Vec<Vec2>,
    pub visual_effect_id: String,
    pub audio_cue_id: Option<String>,
}

/// # Responsibility
/// Defines a lyrical timestamp for narrative integration.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LyricData {
    pub timestamp_sec: f64,
    pub text: String,
    pub narrative_trigger: Option<String>, // Optional event to trigger
}

/// # Responsibility
/// Complete combat data for a single boss fight.
///
/// ---
///
/// Loaded at fight initialization, contains all data needed for orchestration.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatData {
    pub id: String,
    pub boss_id: String,
    pub song_id: String,
    pub harmony_map: HarmonyMap,
    pub patterns: Vec<PatternData>,
    pub combos: Vec<MusicalComboData>,
    pub lyrics: Vec<LyricData>,
    pub player_instrument_patches: Vec<InstrumentPatch>,
    pub boss_instrument_patches: Vec<InstrumentPatch>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // Song Data Tests
    // ========================================================================

    #[test]
    fn test_time_signature_serialization() {
        let ts = TimeSignature {
            numerator: 4,
            denominator: 4,
        };

        let json = serde_json::to_string(&ts).unwrap();
        let deserialized: TimeSignature = serde_json::from_str(&json).unwrap();

        assert_eq!(ts, deserialized);
        assert!(json.contains(r#""numerator":4"#));
        assert!(json.contains(r#""denominator":4"#));
    }

    #[test]
    fn test_song_section_serialization() {
        let section = SongSection {
            name: "chorus".to_string(),
            start_time_sec: 30.0,
            end_time_sec: 60.0,
        };

        let json = serde_json::to_string(&section).unwrap();
        let deserialized: SongSection = serde_json::from_str(&json).unwrap();

        assert_eq!(section, deserialized);
    }

    #[test]
    fn test_beat_data_serialization() {
        let beat = BeatData {
            timestamp: 1.5,
            beat_number: 2,
            bar_number: 1,
            is_downbeat: false,
        };

        let json = serde_json::to_string(&beat).unwrap();
        let deserialized: BeatData = serde_json::from_str(&json).unwrap();

        assert_eq!(beat, deserialized);
    }

    #[test]
    fn test_song_difficulty_enum() {
        let difficulties = vec![
            SongDifficulty::Easy,
            SongDifficulty::Medium,
            SongDifficulty::Hard,
            SongDifficulty::Expert,
        ];

        for diff in difficulties {
            let json = serde_json::to_string(&diff).unwrap();
            let deserialized: SongDifficulty = serde_json::from_str(&json).unwrap();
            assert_eq!(diff, deserialized);
        }
    }

    #[test]
    fn test_song_data_serialization() {
        let song = SongData {
            id: "song_001".to_string(),
            title: "Infernal Descent".to_string(),
            artist: "Charlie Hellsinger".to_string(),
            bpm: 140.0,
            duration_sec: 180.0,
            audio_file_path: "/assets/songs/infernal_descent.ogg".to_string(),
            time_signature: TimeSignature {
                numerator: 4,
                denominator: 4,
            },
            key: Some("Dm".to_string()),
            sections: vec![],
            beat_map: vec![],
            difficulty: SongDifficulty::Hard,
            preview_start_sec: Some(30.0),
        };

        let json = serde_json::to_string(&song).unwrap();
        let deserialized: SongData = serde_json::from_str(&json).unwrap();

        assert_eq!(song, deserialized);
        assert!(json.contains(r#""bpm":140"#));
    }

    // ========================================================================
    // Combo System Tests
    // ========================================================================

    #[test]
    fn test_combo_action_type_enum() {
        let actions = vec![
            ComboActionType::Hit,
            ComboActionType::Dash,
            ComboActionType::Parry,
            ComboActionType::Sustain,
        ];

        for action in actions {
            let json = serde_json::to_string(&action).unwrap();
            let deserialized: ComboActionType = serde_json::from_str(&json).unwrap();
            assert_eq!(action, deserialized);
        }
    }

    #[test]
    fn test_combo_timing_enum() {
        let timings = vec![
            ComboTiming::Exact,
            ComboTiming::Early,
            ComboTiming::Late,
            ComboTiming::Any,
        ];

        for timing in timings {
            let json = serde_json::to_string(&timing).unwrap();
            let deserialized: ComboTiming = serde_json::from_str(&json).unwrap();
            assert_eq!(timing, deserialized);
        }
    }

    #[test]
    fn test_combo_step_serialization() {
        let step = ComboStep {
            action: ComboActionType::Dash,
            timing: ComboTiming::Exact,
            max_delay_ms: Some(200),
        };

        let json = serde_json::to_string(&step).unwrap();
        let deserialized: ComboStep = serde_json::from_str(&json).unwrap();

        assert_eq!(step, deserialized);
    }

    #[test]
    fn test_musical_combo_data_full_serialization() {
        let combo = MusicalComboDataFull {
            id: "combo_harmonic_1".to_string(),
            name: "Harmonic Vortex".to_string(),
            sequence: vec![ComboStep {
                action: ComboActionType::Hit,
                timing: ComboTiming::Exact,
                max_delay_ms: Some(100),
            }],
            bonus_multiplier: 1.5,
            qualia_modifiers: QualiaState::default(),
            visual_effect_id: Some("vortex_effect".to_string()),
            audio_effect_id: Some("vortex_sound".to_string()),
            difficulty: SongDifficulty::Expert,
        };

        let json = serde_json::to_string(&combo).unwrap();
        let deserialized: MusicalComboDataFull = serde_json::from_str(&json).unwrap();

        assert_eq!(combo, deserialized);
    }

    // ========================================================================
    // Pattern System Tests
    // ========================================================================

    #[test]
    fn test_pattern_type_enum() {
        let types = vec![
            PatternType::Projectile,
            PatternType::Area,
            PatternType::Melee,
            PatternType::Summon,
            PatternType::Buff,
        ];

        for pattern_type in types {
            let json = serde_json::to_string(&pattern_type).unwrap();
            let deserialized: PatternType = serde_json::from_str(&json).unwrap();
            assert_eq!(pattern_type, deserialized);
        }
    }

    #[test]
    fn test_pattern_note_visuals_serialization() {
        let visuals = PatternNoteVisuals {
            color: Some("#FF0000".to_string()),
            size: Some(2.5),
            shape: Some("sphere".to_string()),
        };

        let json = serde_json::to_string(&visuals).unwrap();
        let deserialized: PatternNoteVisuals = serde_json::from_str(&json).unwrap();

        assert_eq!(visuals, deserialized);
    }

    #[test]
    fn test_pattern_note_serialization() {
        let note = PatternNote {
            timestamp: 1.5,
            position: Vec2::new(10.0, 20.0),
            velocity: Some(Vec2::new(-5.0, 0.0)),
            damage: 15.0,
            visual_data: Some(PatternNoteVisuals {
                color: Some("#FF0000".to_string()),
                size: Some(1.0),
                shape: None,
            }),
        };

        let json = serde_json::to_string(&note).unwrap();
        let deserialized: PatternNote = serde_json::from_str(&json).unwrap();

        assert_eq!(note, deserialized);
    }

    #[test]
    fn test_qualia_threshold_serialization() {
        let threshold = QualiaThreshold {
            aggression: Some(0.7),
            chaos: Some(0.5),
        };

        let json = serde_json::to_string(&threshold).unwrap();
        let deserialized: QualiaThreshold = serde_json::from_str(&json).unwrap();

        assert_eq!(threshold, deserialized);
    }

    #[test]
    fn test_pattern_data_full_serialization() {
        let pattern = PatternDataFull {
            id: "pattern_wave".to_string(),
            name: "Sonic Wave Barrage".to_string(),
            pattern_type: PatternType::Projectile,
            phases: vec![1, 2],
            notes: vec![],
            duration_sec: 5.0,
            cooldown_sec: 10.0,
            required_qualia_threshold: Some(QualiaThreshold {
                aggression: Some(0.6),
                chaos: None,
            }),
        };

        let json = serde_json::to_string(&pattern).unwrap();
        let deserialized: PatternDataFull = serde_json::from_str(&json).unwrap();

        assert_eq!(pattern, deserialized);
    }

    // ========================================================================
    // Legacy Compatibility Tests
    // ========================================================================

    #[test]
    fn test_musical_combo_serialization() {
        let combo = MusicalComboData {
            id: "combo_1".to_string(),
            name: "Harmonic Swirl".to_string(),
            required_notes: vec!['Q', 'E', 'R'],
            is_beneficial: true,
            effect_description: "Attracts nearby Qualia".to_string(),
            visual_effect_id: Some("swirl_effect".to_string()),
        };

        let json = serde_json::to_string(&combo).unwrap();
        let deserialized: MusicalComboData = serde_json::from_str(&json).unwrap();

        assert_eq!(combo, deserialized);
    }

    #[test]
    fn test_pattern_data_serialization() {
        let pattern = PatternData {
            id: "pattern_1".to_string(),
            name: "Sonic Wave".to_string(),
            telegraph_duration_ms: 500.0,
            execution_duration_ms: 200.0,
            damage: 15.0,
            spawn_positions: vec![Vec2::new(0.0, 0.0)],
            visual_effect_id: "wave_effect".to_string(),
            audio_cue_id: Some("wave_sound".to_string()),
        };

        let json = serde_json::to_string(&pattern).unwrap();
        let deserialized: PatternData = serde_json::from_str(&json).unwrap();

        assert_eq!(pattern, deserialized);
    }

    #[test]
    fn test_lyric_data_serialization() {
        let lyric = LyricData {
            timestamp_sec: 30.5,
            text: "Descend into chaos...".to_string(),
            narrative_trigger: Some("phase_2_transition".to_string()),
        };

        let json = serde_json::to_string(&lyric).unwrap();
        let deserialized: LyricData = serde_json::from_str(&json).unwrap();

        assert_eq!(lyric, deserialized);
    }
}

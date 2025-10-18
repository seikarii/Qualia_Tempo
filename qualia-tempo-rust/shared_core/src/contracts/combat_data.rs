//! # Responsibility
//! Defines combat data contracts loaded from configuration files.
//!
//! ---
//!
//! Contains SongData, PatternData, MusicalComboData and related structures.

use crate::contracts::audio::{HarmonyMap, InstrumentPatch};
use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Defines a single musical combo pattern.
///
/// ---
///
/// Combos are emergent from harmonic context + player input.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
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
/// Defines a boss attack pattern.
///
/// ---
///
/// Patterns are triggered by BossAI based on QualiaState and song position.
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

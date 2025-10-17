//! # Responsibility
//! Contains input-related data structures and musical analysis types.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use super::combat_data::ComboActionType;
use super::game_state::QualiaState;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RhythmicPattern {
    None,
    Steady,
    Syncopated,
    Polyrhythmic,
    Chaotic,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InputAccuracy {
    Perfect,
    Good,
    Ok,
    Miss,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecentInput {
    pub action: ComboActionType,
    pub timestamp: f64,
    pub timing_offset: f64,
    pub accuracy: InputAccuracy,
}

/// # Responsibility
/// Contains the analysis of the player's input from a musical perspective.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalInputAnalysis {
    pub timestamp: f64,
    pub recent_inputs: Vec<RecentInput>,
    pub rhythmic_consistency: f32,
    pub detected_pattern: RhythmicPattern,
    pub harmonic_alignment: f32,
    pub phrase_completion: f32,
    pub dynamic_range: f32,
    pub suggested_qualia_shift: QualiaState,
}

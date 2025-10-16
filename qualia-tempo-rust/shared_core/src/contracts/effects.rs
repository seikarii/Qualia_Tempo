//! # Responsibility
//! Defines visual and environment effect structures for status effects and environmental modifiers.
//!
//! ---
//!
//! This module implements all effect-related data structures from DATA.RUST.md.
//! Effects represent temporary modifications to player/boss state, environmental conditions,
//! and visual post-processing parameters driven by QualiaState.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Defines the category of an effect.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EffectCategory {
    Buff,
    Debuff,
    Environmental,
    Visual,
}

/// # Responsibility
/// Defines the specific type of effect.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EffectType {
    // Player buffs
    DamageBoost,
    SpeedBoost,
    ShieldActive,
    InvulnerabilityFrames,
    ComboMultiplier,
    
    // Player debuffs
    SlowDebuff,
    SilenceDebuff,
    DamageOverTime,
    MovementLocked,
    
    // Environmental
    IntensityAmplification,
    HarmonyDistortion,
    ChaosField,
    KairosZone,
    
    // Visual
    Bloom,
    ChromaticAberration,
    GodRays,
    MotionBlur,
}

/// # Responsibility
/// Represents an active status effect on an entity.
///
/// ---
///
/// Effects have a duration and can modify entity stats or behavior.
/// They are applied/removed by GameLogicService based on combat events.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffect {
    pub id: String,
    pub effect_type: EffectType,
    pub category: EffectCategory,
    pub duration_remaining: f64, // milliseconds
    pub stack_count: u32,
    pub magnitude: f32, // Multiplier or absolute value
}

/// # Responsibility
/// Represents an environmental modifier that affects the entire arena.
///
/// ---
///
/// Environmental effects are typically triggered by boss phase transitions
/// or high combo chains, and affect all entities in the combat space.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEffect {
    pub id: String,
    pub effect_type: EffectType,
    pub duration_remaining: f64, // milliseconds
    pub intensity: f32, // 0.0 to 1.0
    pub radius: f32,    // Effect area radius
}

/// # Responsibility
/// Configuration for visual post-processing effects.
///
/// ---
///
/// These parameters are sent to the frontend's rendering pipeline
/// and are dynamically adjusted based on QualiaState values.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisualEffectsConfig {
    pub bloom_intensity: f32,
    pub bloom_threshold: f32,
    pub god_rays_intensity: f32,
    pub chromatic_aberration_amount: f32,
    pub motion_blur_amount: f32,
    pub vignette_intensity: f32,
    pub color_grading_temperature: f32,
}

impl Default for VisualEffectsConfig {
    fn default() -> Self {
        Self {
            bloom_intensity: 0.5,
            bloom_threshold: 0.8,
            god_rays_intensity: 0.3,
            chromatic_aberration_amount: 0.0,
            motion_blur_amount: 0.0,
            vignette_intensity: 0.2,
            color_grading_temperature: 1.0,
        }
    }
}

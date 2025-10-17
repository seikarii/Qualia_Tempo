//! # Responsibility
//! Defines visual and environment effect data structures.
//!
//! ---
//!
//! This module contains contracts for active visual effects and environmental
//! modifiers that alter gameplay. Effects are triggered by game events and
//! rendered by the Kairos Visual Engine.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::collections::HashMap;
use super::game_state::Vec2;
use super::combat_data::QualiaThreshold;

/// # Responsibility
/// Defines a 3D vector for positions and directions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }
}

/// # Responsibility
/// Enumerates types of active visual effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ActiveEffectType {
    ParticleBurst,
    Trail,
    Aura,
    ScreenShake,
    ColorShift,
    Distortion,
    BloomPulse,
    GodRays,
    ReactionDiffusion,
    SdfMorph,
}

/// # Responsibility
/// Represents an active, instantiated visual effect in the world.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffect {
    pub id: String,
    pub effect_type: ActiveEffectType,
    pub start_time: f64,
    pub duration_sec: f64,
    pub position: Vec3,
    pub intensity: f32,
    pub color: [f32; 4],
    pub scale: f32,
    pub fade_in_sec: Option<f64>,
    pub fade_out_sec: Option<f64>,
    pub attached_to_entity: Option<String>,
    pub custom_parameters: Option<HashMap<String, f32>>,
}

/// # Responsibility
/// Enumerates types of environmental effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EnvironmentEffectType {
    GravityShift,
    TimeDilation,
    ColorFilter,
    AmbientParticles,
    LightingChange,
    Fog,
    Wind,
    Barrier,
}

/// # Responsibility
/// Defines the shape of an affected area.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AffectedAreaShape {
    Circle,
    Rectangle,
    Global,
}

/// # Responsibility
/// Defines the spatial area affected by an environment effect.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AffectedArea {
    pub shape: AffectedAreaShape,
    pub center: Option<Vec2>,
    pub radius: Option<f32>,
    pub width: Option<f32>,
    pub height: Option<f32>,
}

/// # Responsibility
/// Represents an environmental effect that modifies the gameplay area.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEffect {
    pub id: String,
    #[serde(rename = "type")]
    pub effect_type: EnvironmentEffectType,
    pub start_time: f64,
    pub duration_sec: f64,
    pub affected_area: AffectedArea,
    pub intensity: f32,
    pub gameplay_modifiers: Option<HashMap<String, f32>>,
    pub visual_parameters: Option<HashMap<String, f32>>,
    pub triggered_by_qualia_state: Option<QualiaThreshold>,
}

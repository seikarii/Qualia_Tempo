//! # Responsibility
//! Contains data structures for visual and environmental effects.
//!
//! ---
//!
//! This module defines active effects (particle bursts, trails, auras) and
//! environment effects (gravity shifts, time dilation, lighting changes).

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::collections::HashMap;
use crate::utils::math::{Vec2, Vec3};
use super::combat_data::QualiaThreshold;

/// # Responsibility
/// Enumerates types of active visual effects.
///
/// ---
///
/// These effects are instantiated in the world at specific positions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
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
///
/// ---
///
/// Effects have a duration and can be attached to entities.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffect {
    /// Unique identifier
    pub id: String,
    
    /// Type of effect
    pub effect_type: ActiveEffectType,
    
    /// Start time (JavaScript timestamp)
    pub start_time: f64,
    
    /// Duration in seconds
    pub duration_sec: f64,
    
    /// World position
    pub position: Vec3,
    
    /// Effect intensity (0.0 to 1.0+)
    pub intensity: f32,
    
    /// RGBA color
    pub color: [f32; 4],
    
    /// Scale multiplier
    pub scale: f32,
    
    /// Fade-in duration
    pub fade_in_sec: Option<f64>,
    
    /// Fade-out duration
    pub fade_out_sec: Option<f64>,
    
    /// ID of entity this effect is attached to (if any)
    pub attached_to_entity: Option<String>,
    
    /// Custom shader parameters
    pub custom_parameters: Option<HashMap<String, f32>>,
}

/// # Responsibility
/// Enumerates types of environmental effects.
///
/// ---
///
/// These effects modify the gameplay area or physics.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
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
///
/// ---
///
/// Used to determine which entities are affected by environmental effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AffectedAreaShape {
    Circle,
    Rectangle,
    Global,
}

/// # Responsibility
/// Defines the spatial area affected by an environmental effect.
///
/// ---
///
/// Can be circular, rectangular, or global (entire arena).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AffectedArea {
    /// Shape of the area
    pub shape: AffectedAreaShape,
    
    /// Center position (for Circle/Rectangle)
    pub center: Option<Vec2>,
    
    /// Radius (for Circle)
    pub radius: Option<f32>,
    
    /// Width (for Rectangle)
    pub width: Option<f32>,
    
    /// Height (for Rectangle)
    pub height: Option<f32>,
}

/// # Responsibility
/// Represents an environmental effect that modifies the gameplay area.
///
/// ---
///
/// Environmental effects can affect physics, visuals, or gameplay mechanics
/// within a specific area or globally.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEffect {
    /// Unique identifier
    pub id: String,
    
    /// Type of effect
    #[serde(rename = "type")]
    pub effect_type: EnvironmentEffectType,
    
    /// Start time (JavaScript timestamp)
    pub start_time: f64,
    
    /// Duration in seconds
    pub duration_sec: f64,
    
    /// Area affected by this effect
    pub affected_area: AffectedArea,
    
    /// Effect intensity (0.0 to 1.0+)
    pub intensity: f32,
    
    /// Gameplay modifier values (e.g., "gravity" -> -0.5, "speed" -> 1.2)
    pub gameplay_modifiers: Option<HashMap<String, f32>>,
    
    /// Visual parameter values (e.g., "hue" -> 180.0, "saturation" -> 0.8)
    pub visual_parameters: Option<HashMap<String, f32>>,
    
    /// Qualia threshold required to trigger this effect
    pub triggered_by_qualia_state: Option<QualiaThreshold>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_active_effect_serialization() {
        let effect = ActiveEffect {
            id: "test_effect".to_string(),
            effect_type: ActiveEffectType::ParticleBurst,
            start_time: 0.0,
            duration_sec: 1.0,
            position: Vec3::new(0.0, 0.0, 0.0),
            intensity: 1.0,
            color: [1.0, 0.0, 0.0, 1.0],
            scale: 1.0,
            fade_in_sec: None,
            fade_out_sec: None,
            attached_to_entity: None,
            custom_parameters: None,
        };
        
        let json = serde_json::to_string(&effect).expect("Failed to serialize");
        let deserialized: ActiveEffect = serde_json::from_str(&json).expect("Failed to deserialize");
        
        assert_eq!(effect, deserialized);
    }

    #[test]
    fn test_environment_effect_type_serialization() {
        let effect_type = EnvironmentEffectType::GravityShift;
        let json = serde_json::to_string(&effect_type).expect("Failed to serialize");
        assert!(json.contains("gravity_shift"));
    }
}

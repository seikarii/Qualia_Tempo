//! # Responsibility
//! Defines active gameplay effects and environmental effects.
//!
//! ---
//!
//! This module contains structs for buffs, debuffs, and environmental effects
//! that modify gameplay behavior and visuals. These are applied to entities
//! and tracked in the combat state.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Enumerates types of active effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EffectType {
    Buff,
    Debuff,
    DamageOverTime,
    HealOverTime,
    Shield,
    Stun,
    Slow,
    Haste,
}

/// # Responsibility
/// Represents an active effect applied to an entity.
///
/// ---
///
/// Effects can be buffs (beneficial), debuffs (harmful), or neutral modifiers.
/// They have duration, magnitude, and visual identifiers.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffect {
    /// Unique effect instance ID
    pub id: String,
    /// Effect type identifier (references effect definition)
    pub effect_type_id: String,
    /// Effect category
    pub category: EffectType,
    /// Display name
    pub name: String,
    /// Remaining duration in seconds
    pub duration_remaining: f64,
    /// Maximum duration for UI progress
    pub max_duration: f64,
    /// Effect magnitude (damage/heal per tick, speed multiplier, etc.)
    pub magnitude: f32,
    /// Tick interval for periodic effects (seconds)
    pub tick_interval: Option<f64>,
    /// Time until next tick
    pub time_to_next_tick: Option<f64>,
    /// Number of stacks (for stackable effects)
    pub stacks: u32,
    /// Maximum allowed stacks
    pub max_stacks: u32,
    /// Icon identifier for UI
    pub icon_id: Option<String>,
}

/// # Responsibility
/// Enumerates types of environmental effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EnvironmentEffectType {
    Fire,
    Ice,
    Lightning,
    Poison,
    Healing,
    Warp,
}

/// # Responsibility
/// Represents an environmental hazard or beneficial zone.
///
/// ---
///
/// Environmental effects are area-based and affect entities within their radius.
/// Examples: fire zones, healing auras, electric fields.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEffect {
    /// Unique effect instance ID
    pub id: String,
    /// Effect type
    pub effect_type: EnvironmentEffectType,
    /// Display name
    pub name: String,
    /// Center position in world space
    pub position: Vec2,
    /// Effect radius
    pub radius: f32,
    /// Remaining duration in seconds
    pub duration_remaining: f64,
    /// Maximum duration
    pub max_duration: f64,
    /// Effect magnitude (damage/heal per second)
    pub magnitude: f32,
    /// Whether this affects player
    pub affects_player: bool,
    /// Whether this affects boss
    pub affects_boss: bool,
    /// Visual effect identifier
    pub visual_effect_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_active_effect_serialization() {
        let effect = ActiveEffect {
            id: "effect_001".to_string(),
            effect_type_id: "speed_boost".to_string(),
            category: EffectType::Buff,
            name: "Haste".to_string(),
            duration_remaining: 5.0,
            max_duration: 10.0,
            magnitude: 1.5,
            tick_interval: None,
            time_to_next_tick: None,
            stacks: 1,
            max_stacks: 3,
            icon_id: Some("haste_icon".to_string()),
        };

        let json = serde_json::to_string(&effect).expect("Failed to serialize");
        let deserialized: ActiveEffect = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(effect.id, deserialized.id);
        assert_eq!(effect.category, deserialized.category);
    }

    #[test]
    fn test_environment_effect_serialization() {
        let effect = EnvironmentEffect {
            id: "env_001".to_string(),
            effect_type: EnvironmentEffectType::Fire,
            name: "Fire Zone".to_string(),
            position: Vec2::new(100.0, 100.0),
            radius: 50.0,
            duration_remaining: 15.0,
            max_duration: 15.0,
            magnitude: 10.0,
            affects_player: true,
            affects_boss: false,
            visual_effect_id: Some("fire_particles".to_string()),
        };

        let json = serde_json::to_string(&effect).expect("Failed to serialize");
        let deserialized: EnvironmentEffect = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(effect.effect_type, deserialized.effect_type);
        assert_eq!(effect.position, deserialized.position);
    }

    #[test]
    fn test_effect_type_enum() {
        let buff = EffectType::Buff;
        let json = serde_json::to_string(&buff).expect("Failed to serialize");
        assert_eq!(json, r#""buff""#);
    }
}

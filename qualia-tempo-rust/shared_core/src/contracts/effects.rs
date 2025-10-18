//! # Responsibility
//! Defines effect system contracts (buffs, debuffs, environmental effects).
//!
//! ---
//!
//! Contains ActiveEffect and EnvironmentEffect structures.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents an active effect on an entity (player or boss).
///
/// ---
///
/// Effects can be buffs, debuffs, or status conditions.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffect {
    pub id: String,
    pub name: String,
    pub effect_type: EffectType,
    pub duration_remaining: f64, // milliseconds
    pub stack_count: u8,
    pub source: String, // "player", "boss", "environment"
}

/// # Responsibility
/// Enumerates possible effect types.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EffectType {
    Buff,
    Debuff,
    Heal,
    Damage,
    Stun,
    Invulnerability,
}

/// # Responsibility
/// Represents a persistent environmental effect in the arena.
///
/// ---
///
/// Examples: fire zones, healing areas, sonic barriers.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEffect {
    pub id: String,
    pub position: Vec2,
    pub radius: f32,
    pub effect_type: EffectType,
    pub damage_per_second: Option<f32>,
    pub heal_per_second: Option<f32>,
    pub duration_remaining: f64, // milliseconds, None = permanent
    pub visual_effect_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_active_effect_serialization() {
        let effect = ActiveEffect {
            id: "effect_1".to_string(),
            name: "Qualia Overcharge".to_string(),
            effect_type: EffectType::Buff,
            duration_remaining: 5000.0,
            stack_count: 3,
            source: "player".to_string(),
        };

        let json = serde_json::to_string(&effect).unwrap();
        let deserialized: ActiveEffect = serde_json::from_str(&json).unwrap();

        assert_eq!(effect, deserialized);
    }

    #[test]
    fn test_environment_effect_serialization() {
        let effect = EnvironmentEffect {
            id: "zone_1".to_string(),
            position: Vec2::new(50.0, 50.0),
            radius: 20.0,
            effect_type: EffectType::Damage,
            damage_per_second: Some(10.0),
            heal_per_second: None,
            duration_remaining: 15000.0,
            visual_effect_id: "fire_zone".to_string(),
        };

        let json = serde_json::to_string(&effect).unwrap();
        let deserialized: EnvironmentEffect = serde_json::from_str(&json).unwrap();

        assert_eq!(effect, deserialized);
    }

    #[test]
    fn test_effect_type_enum() {
        let effect_type = EffectType::Stun;
        let json = serde_json::to_string(&effect_type).unwrap();
        assert_eq!(json, r#""stun""#);
    }
}

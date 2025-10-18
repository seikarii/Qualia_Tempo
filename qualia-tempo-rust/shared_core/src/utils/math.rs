//! # Responsibility
//! Provides foundational mathematical types and utility functions for the game.
//!
//! ---
//!
//! This module defines wrapper types around glam vectors with full serialization
//! support including `JsonSchema` for documentation generation.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// 2D vector for positions, velocities, and directions.
///
/// ---
///
/// Wraps `glam::Vec2` with full serde and `JsonSchema` support. Used extensively in
/// game logic for player/boss positions and movement calculations.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Vec2(pub glam::Vec2);

impl Vec2 {
    /// Zero vector constant (0, 0)
    pub const ZERO: Self = Self(glam::Vec2::ZERO);

    /// Unit vector on X axis (1, 0)
    pub const X: Self = Self(glam::Vec2::X);

    /// Unit vector on Y axis (0, 1)
    pub const Y: Self = Self(glam::Vec2::Y);

    /// Vector with all components set to 1.0
    pub const ONE: Self = Self(glam::Vec2::ONE);

    #[inline]
    #[must_use]
    pub const fn new(x: f32, y: f32) -> Self {
        Self(glam::Vec2::new(x, y))
    }

    #[inline]
    #[must_use]
    pub const fn splat(v: f32) -> Self {
        Self(glam::Vec2::splat(v))
    }

    #[inline]
    #[must_use]
    pub const fn x(self) -> f32 {
        self.0.x
    }

    #[inline]
    #[must_use]
    pub const fn y(self) -> f32 {
        self.0.y
    }
}

impl JsonSchema for Vec2 {
    fn schema_name() -> String {
        "Vec2".to_string()
    }

    fn json_schema(gen: &mut schemars::gen::SchemaGenerator) -> schemars::schema::Schema {
        let mut schema = schemars::schema::SchemaObject::default();
        schema.instance_type = Some(schemars::schema::InstanceType::Object.into());
        let mut props = schemars::Map::new();
        props.insert("x".to_string(), gen.subschema_for::<f32>());
        props.insert("y".to_string(), gen.subschema_for::<f32>());
        schema.object = Some(Box::new(schemars::schema::ObjectValidation {
            properties: props,
            required: vec!["x".to_string(), "y".to_string()].into_iter().collect(),
            ..Default::default()
        }));
        schemars::schema::Schema::Object(schema)
    }
}

impl From<glam::Vec2> for Vec2 {
    #[inline]
    fn from(v: glam::Vec2) -> Self {
        Self(v)
    }
}

impl From<Vec2> for glam::Vec2 {
    #[inline]
    fn from(v: Vec2) -> Self {
        v.0
    }
}

/// # Responsibility
/// 3D vector for spatial calculations and particle systems.
///
/// ---
///
/// Wraps `glam::Vec3` with full serde and `JsonSchema` support. Used in rendering
/// and 3D particle simulations.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Vec3(pub glam::Vec3);

impl Vec3 {
    #[inline]
    #[must_use]
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self(glam::Vec3::new(x, y, z))
    }

    #[inline]
    #[must_use]
    pub const fn splat(v: f32) -> Self {
        Self(glam::Vec3::splat(v))
    }

    #[inline]
    #[must_use]
    pub const fn x(self) -> f32 {
        self.0.x
    }

    #[inline]
    #[must_use]
    pub const fn y(self) -> f32 {
        self.0.y
    }

    #[inline]
    #[must_use]
    pub const fn z(self) -> f32 {
        self.0.z
    }
}

impl JsonSchema for Vec3 {
    fn schema_name() -> String {
        "Vec3".to_string()
    }

    fn json_schema(gen: &mut schemars::gen::SchemaGenerator) -> schemars::schema::Schema {
        let mut schema = schemars::schema::SchemaObject::default();
        schema.instance_type = Some(schemars::schema::InstanceType::Object.into());
        let mut props = schemars::Map::new();
        props.insert("x".to_string(), gen.subschema_for::<f32>());
        props.insert("y".to_string(), gen.subschema_for::<f32>());
        props.insert("z".to_string(), gen.subschema_for::<f32>());
        schema.object = Some(Box::new(schemars::schema::ObjectValidation {
            properties: props,
            required: vec!["x".to_string(), "y".to_string(), "z".to_string()]
                .into_iter()
                .collect(),
            ..Default::default()
        }));
        schemars::schema::Schema::Object(schema)
    }
}

impl From<glam::Vec3> for Vec3 {
    #[inline]
    fn from(v: glam::Vec3) -> Self {
        Self(v)
    }
}

impl From<Vec3> for glam::Vec3 {
    #[inline]
    fn from(v: Vec3) -> Self {
        v.0
    }
}

/// # Responsibility
/// Clamps a value to a specified range [min, max].
///
/// ---
///
/// Used extensively to ensure game values stay within valid bounds.
/// Example: Clamping `QualiaState` values to [0.0, 1.0] range.
#[inline]
pub fn clamp<T: PartialOrd>(value: T, min: T, max: T) -> T {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

/// # Responsibility
/// Linearly interpolates between two values.
///
/// ---
///
/// Used for smooth transitions and animations.
/// t=0.0 returns start, t=1.0 returns end.
#[inline]
#[must_use]
pub fn lerp(start: f32, end: f32, t: f32) -> f32 {
    (end - start).mul_add(t, start)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp_within_range() {
        assert_eq!(clamp(0.5, 0.0, 1.0), 0.5);
    }

    #[test]
    fn test_clamp_below_min() {
        assert_eq!(clamp(-0.5, 0.0, 1.0), 0.0);
    }

    #[test]
    fn test_clamp_above_max() {
        assert_eq!(clamp(1.5, 0.0, 1.0), 1.0);
    }

    #[test]
    fn test_lerp_at_start() {
        assert!((lerp(0.0, 10.0, 0.0) - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_lerp_at_end() {
        assert!((lerp(0.0, 10.0, 1.0) - 10.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_lerp_midpoint() {
        assert!((lerp(0.0, 10.0, 0.5) - 5.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_vec2_serde() {
        let v = Vec2::new(1.0, 2.0);
        let json = serde_json::to_string(&v).unwrap(); // Failed to serialize Vec2");
        let deserialized: Vec2 = serde_json::from_str(&json).unwrap(); // Failed to deserialize Vec2");
        assert_eq!(v, deserialized);
    }

    #[test]
    fn test_vec3_serde() {
        let v = Vec3::new(1.0, 2.0, 3.0);
        let json = serde_json::to_string(&v).unwrap(); // Failed to serialize Vec3");
        let deserialized: Vec3 = serde_json::from_str(&json).unwrap(); // Failed to deserialize Vec3");
        assert_eq!(v, deserialized);
    }
}

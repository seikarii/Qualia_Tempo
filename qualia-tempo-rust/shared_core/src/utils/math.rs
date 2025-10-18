//! # Responsibility
//! Provides mathematical utilities and vector types for Qualia Tempo.
//!
//! ---
//!
//! Re-exports glam types (Vec2, Vec3) with JsonSchema support via manual implementation.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// Re-export glam types with serialization and JsonSchema support
pub use glam::Vec2 as GlamVec2;
pub use glam::Vec3 as GlamVec3;

/// # Responsibility
/// 2D vector with full serialization and schema support.
///
/// ---
///
/// Wrapper around glam::Vec2 to provide JsonSchema implementation.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Vec2(pub GlamVec2);

impl Vec2 {
    pub const ZERO: Self = Self(GlamVec2::ZERO);
    pub const ONE: Self = Self(GlamVec2::ONE);

    #[inline]
    #[must_use]
    pub const fn new(x: f32, y: f32) -> Self {
        Self(GlamVec2::new(x, y))
    }

    #[inline]
    #[must_use]
    pub fn x(&self) -> f32 {
        self.0.x
    }

    #[inline]
    #[must_use]
    pub fn y(&self) -> f32 {
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
        let mut properties = schemars::Map::new();
        properties.insert("x".to_string(), gen.subschema_for::<f32>());
        properties.insert("y".to_string(), gen.subschema_for::<f32>());
        schema.object().properties = properties;
        schema.object().required.insert("x".to_string());
        schema.object().required.insert("y".to_string());
        schema.into()
    }
}

impl std::ops::Deref for Vec2 {
    type Target = GlamVec2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for Vec2 {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl From<GlamVec2> for Vec2 {
    fn from(v: GlamVec2) -> Self {
        Self(v)
    }
}

impl From<Vec2> for GlamVec2 {
    fn from(v: Vec2) -> Self {
        v.0
    }
}

/// # Responsibility
/// 3D vector with full serialization and schema support.
///
/// ---
///
/// Wrapper around glam::Vec3 to provide JsonSchema implementation.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Vec3(pub GlamVec3);

impl Vec3 {
    pub const ZERO: Self = Self(GlamVec3::ZERO);
    pub const ONE: Self = Self(GlamVec3::ONE);

    #[inline]
    #[must_use]
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self(GlamVec3::new(x, y, z))
    }

    #[inline]
    #[must_use]
    pub fn x(&self) -> f32 {
        self.0.x
    }

    #[inline]
    #[must_use]
    pub fn y(&self) -> f32 {
        self.0.y
    }

    #[inline]
    #[must_use]
    pub fn z(&self) -> f32 {
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
        let mut properties = schemars::Map::new();
        properties.insert("x".to_string(), gen.subschema_for::<f32>());
        properties.insert("y".to_string(), gen.subschema_for::<f32>());
        properties.insert("z".to_string(), gen.subschema_for::<f32>());
        schema.object().properties = properties;
        schema.object().required.insert("x".to_string());
        schema.object().required.insert("y".to_string());
        schema.object().required.insert("z".to_string());
        schema.into()
    }
}

impl std::ops::Deref for Vec3 {
    type Target = GlamVec3;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for Vec3 {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl From<GlamVec3> for Vec3 {
    fn from(v: GlamVec3) -> Self {
        Self(v)
    }
}

impl From<Vec3> for GlamVec3 {
    fn from(v: Vec3) -> Self {
        v.0
    }
}

/// # Responsibility
/// Clamps a value between a minimum and maximum bound.
///
/// ---
///
/// # Arguments
/// * `value` - The value to clamp
/// * `min` - The minimum bound (inclusive)
/// * `max` - The maximum bound (inclusive)
///
/// # Returns
/// The clamped value within [min, max]
#[inline]
#[must_use]
pub fn clamp(value: f32, min: f32, max: f32) -> f32 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

/// # Responsibility
/// Performs linear interpolation between two values.
///
/// ---
///
/// # Arguments
/// * `a` - Start value
/// * `b` - End value
/// * `t` - Interpolation factor (typically 0.0 to 1.0)
///
/// # Returns
/// The interpolated value: a + (b - a) * t
#[inline]
#[must_use]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp_within_bounds() {
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
        assert_eq!(lerp(0.0, 10.0, 0.0), 0.0);
    }

    #[test]
    fn test_lerp_at_middle() {
        assert_eq!(lerp(0.0, 10.0, 0.5), 5.0);
    }

    #[test]
    fn test_lerp_at_end() {
        assert_eq!(lerp(0.0, 10.0, 1.0), 10.0);
    }

    #[test]
    fn test_vec2_serialization() {
        let vec = Vec2::new(1.5, 2.5);
        let json = serde_json::to_string(&vec).unwrap();
        let deserialized: Vec2 = serde_json::from_str(&json).unwrap();
        assert_eq!(vec, deserialized);
    }

    #[test]
    fn test_vec3_serialization() {
        let vec = Vec3::new(1.0, 2.0, 3.0);
        let json = serde_json::to_string(&vec).unwrap();
        let deserialized: Vec3 = serde_json::from_str(&json).unwrap();
        assert_eq!(vec, deserialized);
    }

    #[test]
    fn test_vec2_schema() {
        let schema = schemars::schema_for!(Vec2);
        let json = serde_json::to_string_pretty(&schema).unwrap();
        assert!(json.contains("Vec2"));
    }

    #[test]
    fn test_vec3_schema() {
        let schema = schemars::schema_for!(Vec3);
        let json = serde_json::to_string_pretty(&schema).unwrap();
        assert!(json.contains("Vec3"));
    }
}

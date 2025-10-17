//! # Responsibility
//! Provides mathematical utilities and vector types for the game.
//!
//! ---
//!
//! This module uses glam for vector math but re-exports with custom
//! type aliases for convenience and documentation.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Represents a 2D vector for positions, directions, and velocities.
///
/// ---
///
/// This is a type alias for glam::Vec2 with Serde and JsonSchema support.
pub type Vector2 = glam::Vec2;

/// # Responsibility
/// Represents a 3D vector for 3D positions and effects.
///
/// ---
///
/// This is a type alias for glam::Vec3 with Serde and JsonSchema support.
pub type Vector3 = glam::Vec3;

/// # Responsibility
/// Represents a 2D vector compatible with JavaScript (using f32).
///
/// ---
///
/// Custom implementation for cases where we need explicit Serialize/Deserialize control.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    /// Creates a new Vec2
    #[inline]
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    /// Zero vector
    #[inline]
    pub const fn zero() -> Self {
        Self { x: 0.0, y: 0.0 }
    }

    /// Unit vector in X direction
    #[inline]
    pub const fn unit_x() -> Self {
        Self { x: 1.0, y: 0.0 }
    }

    /// Unit vector in Y direction
    #[inline]
    pub const fn unit_y() -> Self {
        Self { x: 0.0, y: 1.0 }
    }

    /// Calculate length
    #[inline]
    pub fn length(&self) -> f32 {
        (self.x * self.x + self.y * self.y).sqrt()
    }

    /// Normalize to unit vector
    #[inline]
    pub fn normalize(&self) -> Self {
        let len = self.length();
        if len > 0.0 {
            Self {
                x: self.x / len,
                y: self.y / len,
            }
        } else {
            Self::zero()
        }
    }
}

/// # Responsibility
/// Represents a 3D vector compatible with JavaScript (using f32).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    /// Creates a new Vec3
    #[inline]
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    /// Zero vector
    #[inline]
    pub const fn zero() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0 }
    }

    /// Calculate length
    #[inline]
    pub fn length(&self) -> f32 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }
}

/// Clamps a value between min and max
#[inline]
pub fn clamp(value: f32, min: f32, max: f32) -> f32 {
    value.max(min).min(max)
}

/// Linear interpolation between a and b
#[inline]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vec2_length() {
        let v = Vec2::new(3.0, 4.0);
        assert!((v.length() - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_vec2_normalize() {
        let v = Vec2::new(3.0, 4.0).normalize();
        assert!((v.length() - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_clamp() {
        assert_eq!(clamp(5.0, 0.0, 10.0), 5.0);
        assert_eq!(clamp(-5.0, 0.0, 10.0), 0.0);
        assert_eq!(clamp(15.0, 0.0, 10.0), 10.0);
    }

    #[test]
    fn test_lerp() {
        assert_eq!(lerp(0.0, 10.0, 0.0), 0.0);
        assert_eq!(lerp(0.0, 10.0, 1.0), 10.0);
        assert_eq!(lerp(0.0, 10.0, 0.5), 5.0);
    }
}

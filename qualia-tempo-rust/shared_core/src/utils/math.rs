//! # Responsibility
//! Provides core mathematical primitives for 2D/3D vector operations.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Represents a 2D vector for positions, velocities, and directions.
///
/// ---
///
/// Used throughout the game for player/boss positions, dash vectors, and
/// particle velocities. All operations are implemented for performance.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    /// Create a new Vec2.
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    /// Zero vector (0, 0).
    pub const fn zero() -> Self {
        Self { x: 0.0, y: 0.0 }
    }

    /// Unit vector pointing right (1, 0).
    pub const fn right() -> Self {
        Self { x: 1.0, y: 0.0 }
    }

    /// Unit vector pointing up (0, 1).
    pub const fn up() -> Self {
        Self { x: 0.0, y: 1.0 }
    }

    /// Calculate magnitude (length) of the vector.
    #[must_use]
    pub fn magnitude(self) -> f32 {
        (self.x * self.x + self.y * self.y).sqrt()
    }

    /// Calculate squared magnitude (faster than magnitude, avoids sqrt).
    #[must_use]
    pub const fn magnitude_squared(self) -> f32 {
        self.x * self.x + self.y * self.y
    }

    /// Normalize the vector to unit length. Returns zero vector if magnitude is zero.
    #[must_use]
    pub fn normalize(self) -> Self {
        let mag = self.magnitude();
        if mag > 0.0 {
            Self {
                x: self.x / mag,
                y: self.y / mag,
            }
        } else {
            Self::zero()
        }
    }

    /// Calculate dot product with another vector.
    #[must_use]
    pub const fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y
    }

    /// Calculate distance to another vector.
    #[must_use]
    pub fn distance(self, other: Self) -> f32 {
        (self - other).magnitude()
    }

    /// Linear interpolation between two vectors.
    #[must_use]
    pub fn lerp(self, other: Self, t: f32) -> Self {
        Self {
            x: lerp(self.x, other.x, t),
            y: lerp(self.y, other.y, t),
        }
    }
}

// Arithmetic operators
impl std::ops::Add for Vec2 {
    type Output = Self;
    fn add(self, rhs: Self) -> Self::Output {
        Self {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
        }
    }
}

impl std::ops::Sub for Vec2 {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self::Output {
        Self {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
        }
    }
}

impl std::ops::Mul<f32> for Vec2 {
    type Output = Self;
    fn mul(self, rhs: f32) -> Self::Output {
        Self {
            x: self.x * rhs,
            y: self.y * rhs,
        }
    }
}

impl std::ops::Div<f32> for Vec2 {
    type Output = Self;
    fn div(self, rhs: f32) -> Self::Output {
        Self {
            x: self.x / rhs,
            y: self.y / rhs,
        }
    }
}

/// # Responsibility
/// Represents a 3D vector for colors, 3D positions, and normals.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    /// Create a new Vec3.
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    /// Zero vector (0, 0, 0).
    pub const fn zero() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }

    /// Calculate magnitude.
    #[must_use]
    pub fn magnitude(self) -> f32 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    /// Normalize to unit length.
    #[must_use]
    pub fn normalize(self) -> Self {
        let mag = self.magnitude();
        if mag > 0.0 {
            Self {
                x: self.x / mag,
                y: self.y / mag,
                z: self.z / mag,
            }
        } else {
            Self::zero()
        }
    }

    /// Calculate cross product.
    #[must_use]
    pub const fn cross(self, other: Self) -> Self {
        Self {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }
}

/// # Responsibility
/// Clamps a value between min and max bounds.
///
/// ---
///
/// Used extensively for normalizing qualia values to [0.0, 1.0] range.
#[must_use]
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
/// Linear interpolation between two values.
///
/// ---
///
/// Used for smooth transitions in qualia calculations, animation, and audio.
/// t should be in [0.0, 1.0] but is not clamped for performance.
#[must_use]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// # Responsibility
/// Maps a value from one range to another.
///
/// ---
///
/// Example: map_range(0.5, 0.0, 1.0, 0.0, 100.0) = 50.0
#[must_use]
pub fn map_range(value: f32, in_min: f32, in_max: f32, out_min: f32, out_max: f32) -> f32 {
    out_min + (value - in_min) * (out_max - out_min) / (in_max - in_min)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vec2_magnitude_calculation() {
        let v = Vec2::new(3.0, 4.0);
        assert!((v.magnitude() - 5.0).abs() < 0.001);
    }

    #[test]
    fn vec2_normalize() {
        let v = Vec2::new(3.0, 4.0).normalize();
        assert!((v.magnitude() - 1.0).abs() < 0.001);
    }

    #[test]
    fn vec2_normalize_zero() {
        let v = Vec2::zero().normalize();
        assert_eq!(v, Vec2::zero());
    }

    #[test]
    fn vec2_distance() {
        let v1 = Vec2::new(0.0, 0.0);
        let v2 = Vec2::new(3.0, 4.0);
        assert!((v1.distance(v2) - 5.0).abs() < 0.001);
    }

    #[test]
    fn vec2_lerp() {
        let v1 = Vec2::new(0.0, 0.0);
        let v2 = Vec2::new(10.0, 10.0);
        let v = v1.lerp(v2, 0.5);
        assert_eq!(v, Vec2::new(5.0, 5.0));
    }

    #[test]
    fn vec2_arithmetic() {
        let v1 = Vec2::new(1.0, 2.0);
        let v2 = Vec2::new(3.0, 4.0);
        assert_eq!(v1 + v2, Vec2::new(4.0, 6.0));
        assert_eq!(v2 - v1, Vec2::new(2.0, 2.0));
        assert_eq!(v1 * 2.0, Vec2::new(2.0, 4.0));
        assert_eq!(v1 / 2.0, Vec2::new(0.5, 1.0));
    }

    #[test]
    fn clamp_values() {
        assert_eq!(clamp(5, 0, 10), 5);
        assert_eq!(clamp(-5, 0, 10), 0);
        assert_eq!(clamp(15, 0, 10), 10);
    }

    #[test]
    fn lerp_values() {
        assert!((lerp(0.0, 10.0, 0.0) - 0.0).abs() < 0.001);
        assert!((lerp(0.0, 10.0, 1.0) - 10.0).abs() < 0.001);
        assert!((lerp(0.0, 10.0, 0.5) - 5.0).abs() < 0.001);
    }

    #[test]
    fn map_range_values() {
        let result = map_range(0.5, 0.0, 1.0, 0.0, 100.0);
        assert!((result - 50.0).abs() < 0.001);
    }

    #[test]
    fn vec3_cross_product() {
        let v1 = Vec3::new(1.0, 0.0, 0.0);
        let v2 = Vec3::new(0.0, 1.0, 0.0);
        let cross = v1.cross(v2);
        assert_eq!(cross, Vec3::new(0.0, 0.0, 1.0));
    }
}

//! # Responsibility
//! Provides mathematical types and utility functions for game calculations.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Represents a 2D vector for positions, velocities, and directions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
pub struct Vector2 {
    /// X coordinate
    pub x: f32,
    /// Y coordinate
    pub y: f32,
}

impl Vector2 {
    /// Creates a new Vector2
    #[inline]
    #[must_use]
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    /// Zero vector
    #[inline]
    #[must_use]
    pub const fn zero() -> Self {
        Self { x: 0.0, y: 0.0 }
    }

    /// Calculates the magnitude (length) of the vector
    #[inline]
    #[must_use]
    pub fn magnitude(self) -> f32 {
        (self.x * self.x + self.y * self.y).sqrt()
    }

    /// Normalizes the vector to unit length
    #[inline]
    #[must_use]
    pub fn normalize(self) -> Self {
        let mag = self.magnitude();
        if mag > 0.0 {
            Self {
                x: self.x / mag,
                y: self.y / mag,
            }
        } else {
            self
        }
    }
}

/// # Responsibility
/// Represents a 3D vector for positions, velocities, and directions in 3D space.
///
/// ---
///
/// CRITICAL: Qualia Tempo is a 3D game with deferred rendering pipeline.
/// All spatial positions must use Vector3 for proper depth-based rendering.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
pub struct Vector3 {
    /// X coordinate
    pub x: f32,
    /// Y coordinate
    pub y: f32,
    /// Z coordinate (depth)
    pub z: f32,
}

impl Vector3 {
    /// Zero vector constant
    pub const ZERO: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };

    /// Unit X vector constant
    pub const X: Self = Self {
        x: 1.0,
        y: 0.0,
        z: 0.0,
    };

    /// Unit Y vector constant
    pub const Y: Self = Self {
        x: 0.0,
        y: 1.0,
        z: 0.0,
    };

    /// Unit Z vector constant
    pub const Z: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 1.0,
    };

    /// Creates a new Vector3
    #[inline]
    #[must_use]
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    /// Zero vector
    #[inline]
    #[must_use]
    pub const fn zero() -> Self {
        Self::ZERO
    }

    /// Calculates the magnitude (length) of the vector
    #[inline]
    #[must_use]
    pub fn magnitude(self) -> f32 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    /// Calculates squared magnitude (faster than magnitude, useful for comparisons)
    #[inline]
    #[must_use]
    pub fn magnitude_squared(self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    /// Normalizes the vector to unit length
    #[inline]
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
            self
        }
    }

    /// Calculates dot product with another vector
    #[inline]
    #[must_use]
    pub fn dot(self, other: Self) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    /// Calculates cross product with another vector
    #[inline]
    #[must_use]
    pub fn cross(self, other: Self) -> Self {
        Self {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    /// Linear interpolation between two vectors
    #[inline]
    #[must_use]
    pub fn lerp(self, other: Self, t: f32) -> Self {
        Self {
            x: lerp(self.x, other.x, t),
            y: lerp(self.y, other.y, t),
            z: lerp(self.z, other.z, t),
        }
    }

    /// Calculates distance to another vector
    #[inline]
    #[must_use]
    pub fn distance(self, other: Self) -> f32 {
        (self - other).magnitude()
    }
}

// Arithmetic operations for Vector3
impl std::ops::Add for Vector3 {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self {
            x: self.x + other.x,
            y: self.y + other.y,
            z: self.z + other.z,
        }
    }
}

impl std::ops::Sub for Vector3 {
    type Output = Self;

    fn sub(self, other: Self) -> Self {
        Self {
            x: self.x - other.x,
            y: self.y - other.y,
            z: self.z - other.z,
        }
    }
}

impl std::ops::Mul<f32> for Vector3 {
    type Output = Self;

    fn mul(self, scalar: f32) -> Self {
        Self {
            x: self.x * scalar,
            y: self.y * scalar,
            z: self.z * scalar,
        }
    }
}

impl std::ops::Div<f32> for Vector3 {
    type Output = Self;

    fn div(self, scalar: f32) -> Self {
        Self {
            x: self.x / scalar,
            y: self.y / scalar,
            z: self.z / scalar,
        }
    }
}

/// Clamps a value between min and max
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

/// Linear interpolation between two values
#[inline]
#[must_use]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector3_magnitude() {
        let v = Vector3::new(3.0, 4.0, 0.0);
        assert!((v.magnitude() - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_vector3_normalize() {
        let v = Vector3::new(3.0, 4.0, 0.0);
        let normalized = v.normalize();
        assert!((normalized.magnitude() - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_vector3_dot_product() {
        let v1 = Vector3::new(1.0, 0.0, 0.0);
        let v2 = Vector3::new(0.0, 1.0, 0.0);
        assert_eq!(v1.dot(v2), 0.0); // Perpendicular vectors

        let v3 = Vector3::new(1.0, 0.0, 0.0);
        let v4 = Vector3::new(1.0, 0.0, 0.0);
        assert_eq!(v3.dot(v4), 1.0); // Parallel vectors
    }

    #[test]
    fn test_vector3_cross_product() {
        let x = Vector3::X;
        let y = Vector3::Y;
        let z = x.cross(y);
        
        // X cross Y should equal Z
        assert!((z.x - 0.0).abs() < 0.001);
        assert!((z.y - 0.0).abs() < 0.001);
        assert!((z.z - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_vector3_arithmetic() {
        let v1 = Vector3::new(1.0, 2.0, 3.0);
        let v2 = Vector3::new(4.0, 5.0, 6.0);
        
        let sum = v1 + v2;
        assert_eq!(sum, Vector3::new(5.0, 7.0, 9.0));
        
        let diff = v2 - v1;
        assert_eq!(diff, Vector3::new(3.0, 3.0, 3.0));
        
        let scaled = v1 * 2.0;
        assert_eq!(scaled, Vector3::new(2.0, 4.0, 6.0));
    }

    #[test]
    fn test_vector3_distance() {
        let v1 = Vector3::new(0.0, 0.0, 0.0);
        let v2 = Vector3::new(3.0, 4.0, 0.0);
        assert!((v1.distance(v2) - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_clamp() {
        assert_eq!(clamp(0.5, 0.0, 1.0), 0.5);
        assert_eq!(clamp(-0.5, 0.0, 1.0), 0.0);
        assert_eq!(clamp(1.5, 0.0, 1.0), 1.0);
    }

    #[test]
    fn test_lerp() {
        assert_eq!(lerp(0.0, 10.0, 0.0), 0.0);
        assert_eq!(lerp(0.0, 10.0, 1.0), 10.0);
        assert_eq!(lerp(0.0, 10.0, 0.5), 5.0);
    }
}

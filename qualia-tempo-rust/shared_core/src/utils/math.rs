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
/// Represents a 3D vector for spatial audio and 3D effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
pub struct Vector3 {
    /// X coordinate
    pub x: f32,
    /// Y coordinate
    pub y: f32,
    /// Z coordinate
    pub z: f32,
}

impl Vector3 {
    /// Zero vector constant
    pub const ZERO: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
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

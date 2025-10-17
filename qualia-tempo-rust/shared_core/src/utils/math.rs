//! # Responsibility
//! Mathematical utilities and vector operations.

/// # Responsibility
/// Clamps a value between min and max bounds.
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
/// Linear interpolation between two values.
#[inline]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// # Responsibility
/// Inverse linear interpolation - finds t for a value between a and b.
#[inline]
pub fn inv_lerp(a: f32, b: f32, value: f32) -> f32 {
    if (b - a).abs() < f32::EPSILON {
        0.0
    } else {
        (value - a) / (b - a)
    }
}

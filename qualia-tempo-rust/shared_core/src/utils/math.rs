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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp() {
        assert_eq!(clamp(5, 0, 10), 5);
        assert_eq!(clamp(-5, 0, 10), 0);
        assert_eq!(clamp(15, 0, 10), 10);
    }

    #[test]
    fn test_lerp() {
        assert!((lerp(0.0, 10.0, 0.5) - 5.0).abs() < f32::EPSILON);
        assert!((lerp(0.0, 10.0, 0.0) - 0.0).abs() < f32::EPSILON);
        assert!((lerp(0.0, 10.0, 1.0) - 10.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_inv_lerp() {
        assert!((inv_lerp(0.0, 10.0, 5.0) - 0.5).abs() < f32::EPSILON);
        assert!((inv_lerp(0.0, 10.0, 0.0) - 0.0).abs() < f32::EPSILON);
        assert!((inv_lerp(0.0, 10.0, 10.0) - 1.0).abs() < f32::EPSILON);
    }
}

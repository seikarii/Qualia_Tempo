//! # Responsibility
//! Provides validation utilities for input and boundary validation.

/// Validates that a value is within the [0.0, 1.0] range
#[inline]
#[must_use]
pub fn is_normalized(value: f32) -> bool {
    (0.0..=1.0).contains(&value)
}

/// Validates that all values in a slice are within [0.0, 1.0]
#[inline]
#[must_use]
pub fn are_all_normalized(values: &[f32]) -> bool {
    values.iter().all(|&v| is_normalized(v))
}

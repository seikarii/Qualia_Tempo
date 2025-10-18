//! # Responsibility
//! Validation utilities for backend data structures.
//!
//! ---
//!
//! Provides helper functions for validating game state and player actions.

use anyhow::{bail, Result};

/// # Responsibility
/// Validates that a value is within the range [0.0, 1.0].
///
/// ---
///
/// Used for qualia state validation and other normalized values.
///
/// # Errors
///
/// Returns an error if the value is not in the range [0.0, 1.0].
pub fn validate_normalized(value: f32, field_name: &str) -> Result<()> {
    if !(0.0..=1.0).contains(&value) {
        bail!("{field_name} must be in range [0.0, 1.0], got: {value}");
    }
    Ok(())
}

/// # Responsibility
/// Validates that a value is finite (not NaN or Inf).
///
/// # Errors
///
/// Returns an error if the value is NaN, positive infinity, or negative infinity.
pub fn validate_finite(value: f32, field_name: &str) -> Result<()> {
    if !value.is_finite() {
        bail!("{field_name} must be finite, got: {value}");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_normalized_valid() {
        assert!(validate_normalized(0.0, "test").is_ok());
        assert!(validate_normalized(0.5, "test").is_ok());
        assert!(validate_normalized(1.0, "test").is_ok());
    }

    #[test]
    fn test_validate_normalized_invalid() {
        assert!(validate_normalized(-0.1, "test").is_err());
        assert!(validate_normalized(1.1, "test").is_err());
    }

    #[test]
    fn test_validate_finite_valid() {
        assert!(validate_finite(0.0, "test").is_ok());
        assert!(validate_finite(100.5, "test").is_ok());
        assert!(validate_finite(-50.0, "test").is_ok());
    }

    #[test]
    fn test_validate_finite_invalid() {
        assert!(validate_finite(f32::NAN, "test").is_err());
        assert!(validate_finite(f32::INFINITY, "test").is_err());
        assert!(validate_finite(f32::NEG_INFINITY, "test").is_err());
    }
}

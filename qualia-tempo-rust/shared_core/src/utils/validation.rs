//! # Responsibility
//! Provides validation utilities for contract data structures.
//!
//! ---
//!
//! Re-exports validator crate functionality for use in contract validation.

pub use validator::{Validate, ValidationError};

/// # Responsibility
/// Validates that a float value is within the normalized range [0.0, 1.0].
///
/// ---
///
/// # Arguments
/// * `value` - The value to validate
///
/// # Returns
/// Ok(()) if valid, Err(ValidationError) otherwise
pub fn validate_normalized_range(value: f32) -> Result<(), ValidationError> {
    if (0.0..=1.0).contains(&value) {
        Ok(())
    } else {
        Err(ValidationError::new(
            "Value must be in range [0.0, 1.0]",
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_normalized_range_valid() {
        assert!(validate_normalized_range(0.0).is_ok());
        assert!(validate_normalized_range(0.5).is_ok());
        assert!(validate_normalized_range(1.0).is_ok());
    }

    #[test]
    fn test_validate_normalized_range_invalid() {
        assert!(validate_normalized_range(-0.1).is_err());
        assert!(validate_normalized_range(1.1).is_err());
    }
}

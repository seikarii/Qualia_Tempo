//! # Responsibility
//! Provides validation utilities for data contracts.
//!
//! ---
//!
//! This module contains helper functions for validating data structures
//! at runtime, complementing compile-time type safety.

use anyhow::{bail, Result};

/// # Responsibility
/// Validates that a value is within an inclusive range.
///
/// # Errors
///
/// Returns an error if the value is outside the range.
///
/// # Example
///
/// ```
/// # use shared_core::utils::validation::validate_range;
/// # use anyhow::Result;
/// # fn main() -> Result<()> {
/// validate_range(&0.5, &0.0, &1.0, "intensity")?;
/// # Ok(())
/// # }
/// ```
pub fn validate_range<T: PartialOrd + std::fmt::Display>(
    value: &T,
    min: &T,
    max: &T,
    field_name: &str,
) -> Result<()> {
    if value < min || value > max {
        bail!("{field_name} must be between {min} and {max}, got {value}");
    }
    Ok(())
}

/// # Responsibility
/// Validates that a string is not empty.
///
/// # Errors
///
/// Returns an error if the string is empty.
pub fn validate_not_empty(value: &str, field_name: &str) -> Result<()> {
    if value.is_empty() {
        bail!("{field_name} cannot be empty");
    }
    Ok(())
}

/// # Responsibility
/// Validates that a collection has at least a minimum number of elements.
///
/// # Errors
///
/// Returns an error if the collection is too small.
pub fn validate_min_length<T>(
    collection: &[T],
    min_length: usize,
    field_name: &str,
) -> Result<()> {
    let len = collection.len();
    if len < min_length {
        bail!("{field_name} must have at least {min_length} elements, got {len}");
    }
    Ok(())
}

/// # Responsibility
/// Validates that a collection has at most a maximum number of elements.
///
/// # Errors
///
/// Returns an error if the collection is too large.
pub fn validate_max_length<T>(
    collection: &[T],
    max_length: usize,
    field_name: &str,
) -> Result<()> {
    let len = collection.len();
    if len > max_length {
        bail!("{field_name} must have at most {max_length} elements, got {len}");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_range_valid() {
        assert!(validate_range(&0.5, &0.0, &1.0, "test").is_ok());
        assert!(validate_range(&0.0, &0.0, &1.0, "test").is_ok());
        assert!(validate_range(&1.0, &0.0, &1.0, "test").is_ok());
    }

    #[test]
    fn test_validate_range_invalid() {
        assert!(validate_range(&-0.1, &0.0, &1.0, "test").is_err());
        assert!(validate_range(&1.1, &0.0, &1.0, "test").is_err());
    }

    #[test]
    fn test_validate_not_empty_valid() {
        assert!(validate_not_empty("hello", "test").is_ok());
    }

    #[test]
    fn test_validate_not_empty_invalid() {
        assert!(validate_not_empty("", "test").is_err());
    }

    #[test]
    fn test_validate_min_length_valid() {
        let vec = vec![1, 2, 3];
        assert!(validate_min_length(&vec, 3, "test").is_ok());
        assert!(validate_min_length(&vec, 2, "test").is_ok());
    }

    #[test]
    fn test_validate_min_length_invalid() {
        let vec = vec![1, 2];
        assert!(validate_min_length(&vec, 3, "test").is_err());
    }

    #[test]
    fn test_validate_max_length_valid() {
        let vec = vec![1, 2, 3];
        assert!(validate_max_length(&vec, 3, "test").is_ok());
        assert!(validate_max_length(&vec, 5, "test").is_ok());
    }

    #[test]
    fn test_validate_max_length_invalid() {
        let vec = vec![1, 2, 3, 4];
        assert!(validate_max_length(&vec, 3, "test").is_err());
    }
}

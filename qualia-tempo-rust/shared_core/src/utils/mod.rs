//! # Responsibility
//! Provides utility modules for mathematical operations and validation.
//!
//! ---
//!
//! Contains shared utilities used across contracts and services.

pub mod math;
pub mod validation;

pub use math::{clamp, lerp, Vec2, Vec3};
pub use validation::{validate_normalized_range, Validate, ValidationError};

//! # Responsibility
//! Utility modules for shared mathematical and validation functions.

pub mod math;
pub mod validation;

pub use math::{clamp, lerp, Vec2, Vec3};
pub use validation::{
    validate_max_length, validate_min_length, validate_not_empty, validate_range,
};

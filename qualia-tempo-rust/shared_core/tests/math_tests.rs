//! # Responsibility
//! Integration tests for mathematical utility functions.
//!
//! ---
//!
//! Validates correctness of clamping, interpolation, and inverse
//! interpolation functions used throughout the codebase.

use shared_core::utils::{clamp, inv_lerp, lerp};

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

#[test]
fn test_clamp_edge_cases() {
    // Test with equal bounds
    assert_eq!(clamp(5, 3, 3), 3);
    
    // Test with negative numbers
    assert_eq!(clamp(-10, -20, -5), -10);
    assert_eq!(clamp(-25, -20, -5), -20);
    assert_eq!(clamp(0, -20, -5), -5);
}

#[test]
fn test_lerp_extrapolation() {
    // Beyond bounds
    assert!((lerp(0.0, 10.0, 1.5) - 15.0).abs() < f32::EPSILON);
    assert!((lerp(0.0, 10.0, -0.5) - (-5.0)).abs() < f32::EPSILON);
}

#[test]
fn test_inv_lerp_precision() {
    // Test floating-point precision
    let result = inv_lerp(0.0, 100.0, 33.333333);
    assert!((result - 0.33333333).abs() < 1e-5);
}

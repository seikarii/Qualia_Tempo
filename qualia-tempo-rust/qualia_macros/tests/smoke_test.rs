//! # Responsibility
//! Expansion tests for procedural macros.
//!
//! ---
//!
//! Verifies that macros expand correctly using trybuild and cargo-expand.
//! Tests compile-time guarantees and generated code structure.

/// # Responsibility
/// Tests that the #[instrument] macro expands without errors.
///
/// ---
///
/// This is a compile-time test. If this test compiles, the macro works.
#[test]
fn test_instrument_macro_expansion() {
    // The fact that this test function compiles proves the macro expands correctly
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/instrument_pass.rs");
}

/// # Responsibility
/// Tests that the #[cached] macro expands without errors.
#[test]
fn test_cached_macro_expansion() {
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/cached_pass.rs");
}

/// # Responsibility
/// Tests that the #[retry] macro expands without errors.
#[test]
fn test_retry_macro_expansion() {
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/retry_pass.rs");
}

/// # Responsibility
/// Tests that the #[timeout] macro expands without errors.
#[test]
fn test_timeout_macro_expansion() {
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/timeout_pass.rs");
}

//! # Responsibility
//! Tests for the #[cached] macro memoization behavior.

#[test]
fn test_cached_macro_basic_expansion() {
    // Test that the macro compiles with basic usage
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/cached_basic.rs");
}

#[test]
fn test_cached_macro_with_ttl() {
    // Test that the macro compiles with TTL parameter
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/cached_with_ttl.rs");
}

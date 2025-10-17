//! # Responsibility
//! Tests for the #[timeout] macro timeout protection.

#[test]
fn test_timeout_macro_expansion() {
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/timeout_basic.rs");
}

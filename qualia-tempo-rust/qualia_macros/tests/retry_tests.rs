//! # Responsibility
//! Tests for the #[retry] macro retry logic and exponential backoff.

#[test]
fn test_retry_macro_basic_expansion() {
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/retry_basic.rs");
}

#[test]
fn test_retry_macro_with_exponential_backoff() {
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/retry_exponential.rs");
}

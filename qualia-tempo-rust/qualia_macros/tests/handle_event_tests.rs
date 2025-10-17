//! # Responsibility
//! Tests for the #[handle_event] macro expansion and behavior.
//!
//! ---
//!
//! These tests verify macro expansion correctness using trybuild for
//! compile-time validation per QUALIA.CODE.RUST testing mandates.

#[test]
fn test_handle_event_macro_expansion() {
    // Test that the macro expands correctly
    let t = trybuild::TestCases::new();
    t.pass("tests/ui/handle_event_pass.rs");
}

#[test]
fn test_handle_event_requires_self_parameter() {
    // Test that the macro rejects functions without &self
    let t = trybuild::TestCases::new();
    t.compile_fail("tests/ui/handle_event_no_self.rs");
}

#[test]
fn test_handle_event_requires_event_parameter() {
    // Test that the macro rejects functions with insufficient parameters
    let t = trybuild::TestCases::new();
    t.compile_fail("tests/ui/handle_event_no_event_param.rs");
}

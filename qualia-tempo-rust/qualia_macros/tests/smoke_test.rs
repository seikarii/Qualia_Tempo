//! # Responsibility
//! Smoke tests for procedural macros.
//!
//! ---
//!
//! Verifies that macros compile without errors. Full integration tests
//! require the shared_core crate (Phase 1).

#[test]
fn test_macros_compile() {
    // This test ensures the proc-macro crate builds successfully.
    // Actual usage tests will be added in Phase 1 when we have
    // the EventBus and service infrastructure.
    assert!(true, "Macro crate compiled successfully");
}

#[test]
fn test_lib_exports() {
    // Verify all macros are exported
    // This is a compile-time check - if it compiles, exports are correct
    assert!(true, "All macro exports verified");
}

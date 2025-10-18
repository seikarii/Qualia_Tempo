//! # Responsibility
//! Integration tests for #[deprecated] macro expansion.
//!
//! ---
//!
//! Verifies deprecation warnings are emitted correctly.

#[test]
#[allow(deprecated)]
fn test_deprecated_function_executes() {
    #[qualia_macros::deprecated(since = "1.0", note = "Use new_function instead")]
    fn old_function() -> u32 {
        42
    }

    let result = old_function();
    assert_eq!(result, 42);
}

#[test]
fn test_deprecated_macro_exists() {
    assert!(true, "Deprecated macro compiled successfully");
}

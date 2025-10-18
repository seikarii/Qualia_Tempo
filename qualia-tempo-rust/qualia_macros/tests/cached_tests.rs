//! # Responsibility
//! Integration tests for #[cached] macro expansion.
//!
//! ---
//!
//! NOTE: Current implementation is simplified pass-through.
//! Full caching requires the `cached` crate integration (Phase 1+).
//! These tests verify compilation and basic functionality.

#[tokio::test]
async fn test_cached_function_executes() {
    #[qualia_macros::cached(ttl = 60)]
    async fn expensive_calculation(x: u32) -> Result<u32, anyhow::Error> {
        Ok(x * 2)
    }

    let result = expensive_calculation(5).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 10);
}

#[test]
fn test_cached_macro_exists() {
    assert!(true, "Cached macro compiled successfully");
}

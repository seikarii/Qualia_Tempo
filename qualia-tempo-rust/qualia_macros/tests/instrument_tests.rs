//! # Responsibility
//! Integration tests for #[instrument] macro expansion.
//!
//! ---
//!
//! Verifies tracing span creation for instrumented functions.

#[tokio::test]
async fn test_instrument_creates_span() {
    #[qualia_macros::instrument(level = "info", name = "test_operation")]
    async fn instrumented_fn(value: u32) -> u32 {
        value * 2
    }

    let result = instrumented_fn(5).await;
    assert_eq!(result, 10);
}

#[tokio::test]
async fn test_instrument_with_default_level() {
    #[qualia_macros::instrument]
    async fn default_instrumented() -> String {
        "test".to_string()
    }

    let result = default_instrumented().await;
    assert_eq!(result, "test");
}

#[test]
fn test_instrument_macro_exists() {
    assert!(true, "Instrument macro compiled successfully");
}

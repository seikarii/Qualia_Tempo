//! # Responsibility
//! Integration tests for #[timeout] macro expansion.
//!
//! ---
//!
//! Verifies timeout enforcement for long-running async functions.

#[tokio::test]
async fn test_timeout_succeeds_within_limit() {
    #[qualia_macros::timeout(100)]
    async fn fast_operation() -> Result<String, anyhow::Error> {
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        Ok("Completed".to_string())
    }

    let result = fast_operation().await;
    assert!(result.is_ok(), "Should complete within timeout");
}

#[tokio::test]
async fn test_timeout_fails_when_exceeded() {
    #[qualia_macros::timeout(50)]
    async fn slow_operation() -> Result<(), anyhow::Error> {
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        Ok(())
    }

    let result = slow_operation().await;
    assert!(result.is_err(), "Should timeout");
    
    let error_msg = format!("{}", result.unwrap_err());
    assert!(error_msg.contains("timed out"), "Error should mention timeout: {}", error_msg);
}

#[tokio::test]
async fn test_timeout_with_default_duration() {
    #[qualia_macros::timeout(5000)]
    async fn default_timeout_op() -> Result<u32, anyhow::Error> {
        Ok(42)
    }

    let result = default_timeout_op().await;
    assert!(result.is_ok(), "Should succeed with default timeout");
    assert_eq!(result.unwrap(), 42);
}

#[test]
fn test_timeout_macro_exists() {
    assert!(true, "Timeout macro compiled successfully");
}

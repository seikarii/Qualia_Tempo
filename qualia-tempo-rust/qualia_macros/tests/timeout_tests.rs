//! # Responsibility
//! Integration tests for #[timeout] macro expansion.
//!
//! ---
//!
//! Verifies timeout enforcement for long-running operations.

#![allow(clippy::unwrap_used, clippy::unwrap_err_used)]

use qualia_macros::timeout;

// Standalone functions with timeout macro
#[timeout(100)] // 100ms timeout
async fn fast_operation() -> Result<String, anyhow::Error> {
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    Ok("Completed quickly".to_string())
}

#[timeout(100)] // 100ms timeout
async fn slow_operation() -> Result<String, anyhow::Error> {
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    Ok("This should never return".to_string())
}

#[tokio::test]
async fn test_timeout_allows_fast_operations() {
    let result = fast_operation().await;
    
    assert!(result.is_ok(), "Fast operation should complete successfully");
    assert_eq!(result.unwrap(), "Completed quickly");
}

#[tokio::test]
async fn test_timeout_cancels_slow_operations() {
    let start = tokio::time::Instant::now();
    let result = slow_operation().await;
    let elapsed = start.elapsed();
    
    assert!(result.is_err(), "Slow operation should timeout");
    assert!(
        elapsed.as_millis() < 200,
        "Should timeout within configured duration (100ms + margin)"
    );
    
    let error_msg = result.unwrap_err().to_string();
    assert!(
        error_msg.contains("timed out") || error_msg.contains("timeout"),
        "Error should mention timeout: {}",
        error_msg
    );
}

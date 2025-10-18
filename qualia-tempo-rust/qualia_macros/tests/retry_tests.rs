//! # Responsibility
//! Integration tests for #[retry] macro expansion.
//!
//! ---
//!
//! Verifies retry logic with exponential backoff.

#![allow(clippy::unwrap_used)]

use qualia_macros::retry;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

struct RetryTestService {
    failure_count: Arc<AtomicU32>,
    max_failures: u32,
}

impl RetryTestService {
    fn new(max_failures: u32) -> Self {
        Self {
            failure_count: Arc::new(AtomicU32::new(0)),
            max_failures,
        }
    }

    async fn failing_operation_inner(&self) -> Result<String, anyhow::Error> {
        let count = self.failure_count.fetch_add(1, Ordering::SeqCst);
        
        if count < self.max_failures {
            anyhow::bail!("Simulated failure #{}", count + 1);
        }
        
        Ok("Success!".to_string())
    }
}

// Standalone function with retry macro
#[retry]
async fn failing_operation(service: &RetryTestService) -> Result<String, anyhow::Error> {
    service.failing_operation_inner().await
}

#[tokio::test]
async fn test_retry_succeeds_after_failures() {
    let service = RetryTestService::new(2); // Fail twice, succeed on third
    
    let result = failing_operation(&service).await;
    
    assert!(result.is_ok(), "Should succeed after retries");
    assert_eq!(result.unwrap(), "Success!");
    assert_eq!(
        service.failure_count.load(Ordering::SeqCst),
        3,
        "Should have attempted 3 times (2 failures + 1 success)"
    );
}

#[tokio::test]
async fn test_retry_fails_after_max_attempts() {
    let service = RetryTestService::new(10); // Always fail
    
    let result = failing_operation(&service).await;
    
    assert!(result.is_err(), "Should fail after max attempts");
    assert_eq!(
        service.failure_count.load(Ordering::SeqCst),
        3,
        "Should have attempted exactly 3 times (max_attempts)"
    );
}

#[tokio::test]
async fn test_retry_succeeds_immediately() {
    let service = RetryTestService::new(0); // No failures
    
    let start = tokio::time::Instant::now();
    let result = failing_operation(&service).await;
    let elapsed = start.elapsed();
    
    assert!(result.is_ok(), "Should succeed immediately");
    assert_eq!(
        service.failure_count.load(Ordering::SeqCst),
        1,
        "Should have attempted only once"
    );
    assert!(
        elapsed.as_millis() < 50,
        "Should complete quickly without retries"
    );
}

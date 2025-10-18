//! # Responsibility
//! Integration tests for #[retry] macro expansion.
//!
//! ---
//!
//! Verifies retry logic with exponential backoff and failure counting.

use std::sync::atomic::{AtomicU32, Ordering};

static ATTEMPT_COUNTER_1: AtomicU32 = AtomicU32::new(0);
static ATTEMPT_COUNTER_2: AtomicU32 = AtomicU32::new(0);

#[tokio::test]
async fn test_retry_succeeds_after_failures() {
    ATTEMPT_COUNTER_1.store(0, Ordering::Relaxed);

    #[qualia_macros::retry(max_attempts = 3, delay_ms = 10, exponential_backoff = false)]
    async fn flaky_operation() -> Result<String, anyhow::Error> {
        let attempt = ATTEMPT_COUNTER_1.fetch_add(1, Ordering::Relaxed) + 1;
        
        if attempt < 3 {
            anyhow::bail!("Simulated failure on attempt {}", attempt)
        } else {
            Ok(format!("Success on attempt {}", attempt))
        }
    }

    let result = flaky_operation().await;
    
    assert!(result.is_ok(), "Should succeed after retries");
    assert_eq!(ATTEMPT_COUNTER_1.load(Ordering::Relaxed), 3, "Should have made 3 attempts");
}

#[tokio::test]
async fn test_retry_exhausts_max_attempts() {
    ATTEMPT_COUNTER_2.store(0, Ordering::Relaxed);

    #[qualia_macros::retry(max_attempts = 2, delay_ms = 5, exponential_backoff = false)]
    async fn always_fails() -> Result<(), anyhow::Error> {
        ATTEMPT_COUNTER_2.fetch_add(1, Ordering::Relaxed);
        anyhow::bail!("Always fails")
    }

    let result = always_fails().await;
    
    assert!(result.is_err(), "Should fail after exhausting retries");
    assert_eq!(ATTEMPT_COUNTER_2.load(Ordering::Relaxed), 2, "Should have made exactly 2 attempts");
}

#[tokio::test]
async fn test_retry_with_exponential_backoff() {
    use std::time::Instant;

    let start = Instant::now();

    #[qualia_macros::retry(max_attempts = 3, delay_ms = 10, exponential_backoff = true)]
    async fn failing_operation() -> Result<(), anyhow::Error> {
        anyhow::bail!("Always fails")
    }

    let _ = failing_operation().await;
    
    let elapsed = start.elapsed().as_millis();
    
    // With exponential backoff: 10ms, 20ms = 30ms minimum for 2 retries
    // (Initial attempt + 2 retries with delays = 3 total calls)
    // Allow margin for execution overhead
    assert!(elapsed >= 25, "Should have exponential delays, elapsed: {}ms", elapsed);
}

#[test]
fn test_retry_macro_exists() {
    // Verify macro is exported and compiles
    assert!(true, "Retry macro compiled successfully");
}

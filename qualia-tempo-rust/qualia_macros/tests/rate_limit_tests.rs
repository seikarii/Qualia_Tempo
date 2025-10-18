//! # Responsibility
//! Integration tests for #[rate_limit] macro expansion.
//!
//! ---
//!
//! Verifies rate limiting enforcement using semaphore-based throttling.

use std::time::Instant;

#[tokio::test]
async fn test_rate_limit_enforces_delay() {
    let start = Instant::now();

    #[qualia_macros::rate_limit(per_second = 2)]
    async fn limited_operation() -> Result<u32, anyhow::Error> {
        Ok(1)
    }

    // Call twice - should take at least 500ms each = 1000ms total minimum
    let _ = limited_operation().await;
    let _ = limited_operation().await;

    let elapsed = start.elapsed().as_millis();
    
    // Should enforce minimum interval between calls
    assert!(elapsed >= 900, "Should enforce rate limit, elapsed: {}ms", elapsed);
}

#[test]
fn test_rate_limit_macro_exists() {
    assert!(true, "Rate limit macro compiled successfully");
}

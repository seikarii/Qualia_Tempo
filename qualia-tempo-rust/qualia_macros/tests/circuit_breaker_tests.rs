//! # Responsibility
//! Integration tests for #[circuit_breaker] macro expansion.
//!
//! ---
//!
//! Verifies circuit breaker pattern with failure threshold tracking.

use std::sync::atomic::{AtomicU32, Ordering};

static CB_ATTEMPT_COUNTER: AtomicU32 = AtomicU32::new(0);

#[tokio::test]
async fn test_circuit_breaker_opens_after_failures() {
    CB_ATTEMPT_COUNTER.store(0, Ordering::Relaxed);

    #[qualia_macros::circuit_breaker(failure_threshold = 3)]
    async fn failing_service() -> Result<(), anyhow::Error> {
        CB_ATTEMPT_COUNTER.fetch_add(1, Ordering::Relaxed);
        anyhow::bail!("Service failure")
    }

    // First 3 failures should execute
    for _ in 0..3 {
        let _ = failing_service().await;
    }

    // 4th call should be rejected by open circuit
    let result = failing_service().await;
    assert!(result.is_err());
    
    let error_msg = format!("{}", result.unwrap_err());
    assert!(error_msg.contains("Circuit breaker open"), "Should reject due to open circuit");
    
    // Counter should be 3 (circuit opened before 4th attempt)
    assert_eq!(CB_ATTEMPT_COUNTER.load(Ordering::Relaxed), 3);
}

#[test]
fn test_circuit_breaker_macro_exists() {
    assert!(true, "Circuit breaker macro compiled successfully");
}

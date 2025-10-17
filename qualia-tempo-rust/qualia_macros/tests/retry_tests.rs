//! # Responsibility
//! Tests for the #[retry] procedural macro.

use qualia_macros::retry;

#[tokio::test]
async fn test_retry_succeeds_first_attempt() {
    struct TestService;
    
    impl TestService {
        #[retry(max_attempts = 3, delay_ms = 10, exponential_backoff = false)]
        async fn operation_that_succeeds(&self) -> Result<u32, anyhow::Error> {
            Ok(42)
        }
    }
    
    let service = TestService;
    let result = service.operation_that_succeeds().await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 42);
}

#[tokio::test]
async fn test_retry_fails_after_max_attempts() {
    struct TestService {
        attempts: std::sync::Arc<std::sync::atomic::AtomicU32>,
    }
    
    impl TestService {
        #[retry(max_attempts = 3, delay_ms = 10, exponential_backoff = false)]
        async fn operation_that_fails(&self) -> Result<u32, anyhow::Error> {
            self.attempts.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            Err(anyhow::anyhow!("Simulated failure"))
        }
    }
    
    let service = TestService {
        attempts: std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0)),
    };
    
    let result = service.operation_that_fails().await;
    assert!(result.is_err());
    assert_eq!(service.attempts.load(std::sync::atomic::Ordering::SeqCst), 3);
}

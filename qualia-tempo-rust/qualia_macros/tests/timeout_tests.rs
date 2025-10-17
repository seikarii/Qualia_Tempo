//! # Responsibility
//! Tests for the #[timeout] procedural macro.

use qualia_macros::timeout;

#[tokio::test]
async fn test_timeout_succeeds_within_limit() {
    struct TestService;
    
    impl TestService {
        #[timeout(1000)]
        async fn fast_operation(&self) -> Result<u32, anyhow::Error> {
            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            Ok(42)
        }
    }
    
    let service = TestService;
    let result = service.fast_operation().await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 42);
}

#[tokio::test]
async fn test_timeout_fails_when_exceeded() {
    struct TestService;
    
    impl TestService {
        #[timeout(50)]
        async fn slow_operation(&self) -> Result<u32, anyhow::Error> {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            Ok(42)
        }
    }
    
    let service = TestService;
    let result = service.slow_operation().await;
    assert!(result.is_err());
    let error_message = result.unwrap_err().to_string();
    assert!(error_message.contains("timed out"));
}

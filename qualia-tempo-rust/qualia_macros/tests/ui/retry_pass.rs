//! # Responsibility
//! Tests that #[retry] macro expands correctly.

use qualia_macros::retry;

struct TestService {}

impl TestService {
    #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
    async fn unreliable_operation(&self) -> Result<String, anyhow::Error> {
        Ok("success".to_string())
    }
}

fn main() {}

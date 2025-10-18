//! # Responsibility
//! Tests that #[timeout] macro expands correctly.

use qualia_macros::timeout;

struct TestService {}

impl TestService {
    #[timeout(timeout = 5000)]
    async fn long_operation(&self) -> Result<String, anyhow::Error> {
        Ok("completed".to_string())
    }
}

fn main() {}

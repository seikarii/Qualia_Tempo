//! # Responsibility
//! Tests that #[cached] macro expands correctly.

use qualia_macros::cached;

struct TestService {}

impl TestService {
    #[cached(ttl = 60)]
    async fn expensive_operation(&self, input: i32) -> Result<i32, String> {
        Ok(input * 2)
    }
}

fn main() {}

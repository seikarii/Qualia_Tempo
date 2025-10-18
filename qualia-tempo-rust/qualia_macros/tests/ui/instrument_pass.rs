//! # Responsibility
//! Tests that #[instrument] macro expands correctly.

use qualia_macros::instrument;

#[derive(Debug, Clone)]
struct TestService {}

impl TestService {
    #[instrument]
    fn simple_function(&self) {
        println!("Test");
    }

    #[instrument]
    async fn async_function(&self) -> Result<(), String> {
        Ok(())
    }
}

fn main() {}

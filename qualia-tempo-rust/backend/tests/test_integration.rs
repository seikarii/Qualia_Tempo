//! # Responsibility
//! Integration test entry point for backend services.
//!
//! ---
//!
//! Executes comprehensive integration tests verifying service interactions.

mod integration;

use integration::test_container_factory::create_test_container;

// Re-export test module for cargo test discovery
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn integration_tests_available() {
        // Verify test container can be created
        let _ = create_test_container();
    }
}

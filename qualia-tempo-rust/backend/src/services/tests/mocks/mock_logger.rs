//! # Responsibility
//! High-fidelity mock for ILogger trait.
//!
//! ---
//!
//! Provides mockall-based mock implementation for testing services that
//! depend on ILogger without requiring actual log output.

use mockall::mock;
use crate::services::interfaces::ILogger;

mock! {
    /// # Responsibility
    /// High-fidelity mock for ILogger trait, used in unit tests.
    ///
    /// ---
    ///
    /// Allows verification of logging calls without producing actual output.
    /// Supports expectation setting for call counts and argument matching.
    pub Logger {}

    impl ILogger for Logger {
        fn info(&self, message: &str);
        fn warn(&self, message: &str);
        fn error(&self, message: &str);
        fn debug(&self, message: &str);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_logger_expectations() {
        let mut mock_logger = MockLogger::new();

        // Set expectation: info should be called once with "test"
        mock_logger
            .expect_info()
            .times(1)
            .withf(|msg: &str| msg == "test")
            .return_const(());

        // Satisfy expectation
        mock_logger.info("test");

        // Mock will panic if expectations not met
    }

    #[test]
    fn test_mock_logger_multiple_calls() {
        let mut mock_logger = MockLogger::new();

        mock_logger.expect_info().times(2).return_const(());
        mock_logger.expect_error().times(1).return_const(());

        mock_logger.info("First call");
        mock_logger.info("Second call");
        mock_logger.error("Error call");
    }
}

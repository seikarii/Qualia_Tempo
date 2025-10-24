//! # Responsibility
//! High-fidelity mock for ILogger trait.
//!
//! ---
//!
//! Enables verification that services emit correct log messages at appropriate levels
//! without requiring real tracing infrastructure.

use crate::services::interfaces::i_logger::ILogger;
use mockall::mock;

mock! {
    /// # Responsibility
    /// Mock implementation of ILogger for unit testing.
    ///
    /// ---
    ///
    /// **VERIFICATION PATTERN**: Use `.withf()` to verify log message content:
    /// ```rust
    /// mock.expect_error()
    ///     .times(1)
    ///     .withf(|msg: &str| msg.contains("critical failure"))
    ///     .return_const(());
    /// ```
    pub Logger {}

    impl ILogger for Logger {
        fn trace(&self, message: &str);
        fn debug(&self, message: &str);
        fn info(&self, message: &str);
        fn warn(&self, message: &str);
        fn error(&self, message: &str);
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_logger_info() {
        let mut mock = MockLogger::new();
        
        mock.expect_info()
            .times(1)
            .withf(|msg: &str| msg.contains("test message"))
            .return_const(());

        mock.info("test message");
    }

    #[test]
    fn test_mock_logger_error_with_predicate() {
        let mut mock = MockLogger::new();
        
        // Verify error message contains expected substring
        mock.expect_error()
            .times(1)
            .withf(|msg: &str| msg.starts_with("FATAL"))
            .return_const(());

        mock.error("FATAL: critical failure");
    }

    #[test]
    #[should_panic(expected = "MockLogger::warn")]
    fn test_mock_panics_without_expectation() {
        let mock = MockLogger::new();
        mock.warn("unexpected warning");
    }
}

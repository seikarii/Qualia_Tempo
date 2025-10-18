//! # Responsibility
//! High-fidelity mock implementation of ILogger for testing.
//!
//! ---
//!
//! Provides mockall-based mock with type-safe expectations.

use mockall::*;
use shared_core::traits::ILogger;

mock! {
    /// # Responsibility
    /// High-fidelity mock of ILogger trait.
    ///
    /// ---
    ///
    /// Used in unit tests to verify logging behavior without
    /// actual I/O operations.
    pub Logger {}

    impl ILogger for Logger {
        fn info(&self, message: &str);
        fn warn(&self, message: &str);
        fn error(&self, message: &str);
        fn debug(&self, message: &str);
    }
}

impl MockLogger {
    /// # Responsibility
    /// Creates a mock with default expectations that accept all calls.
    ///
    /// ---
    ///
    /// Use this for tests where logging is not the focus.
    pub fn with_defaults() -> Self {
        let mut mock = Self::new();
        mock.expect_info().returning(|_| ());
        mock.expect_warn().returning(|_| ());
        mock.expect_error().returning(|_| ());
        mock.expect_debug().returning(|_| ());
        mock
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_with_defaults() {
        let logger = MockLogger::with_defaults();
        logger.info("test");
        logger.warn("test");
        logger.error("test");
        logger.debug("test");
    }

    #[test]
    fn test_mock_with_expectations() {
        let mut logger = MockLogger::new();
        logger.expect_info()
            .times(1)
            .withf(|msg: &str| msg.contains("success"))
            .returning(|_| ());

        logger.info("success message");
    }
}

//! # Responsibility
//! Provides isolated service containers for integration testing.
//!
//! ---
//!
//! Test modules built here ensure complete isolation between tests.
//! Each test gets fresh service instances.
//! Phase 2 uses manual DI; will migrate to Shaku in future phases.

use backend::services::core::{EventBusService, QualiaLogger, TimerService};
use backend::services::interfaces::{IEventBus, ILogger, ITimer};
use std::sync::Arc;

/// # Responsibility
/// Container holding all core service instances for a test.
pub struct TestContainer {
    pub event_bus: Arc<dyn IEventBus>,
    pub logger: Arc<dyn ILogger>,
    pub timer: Arc<dyn ITimer>,
}

/// # Responsibility
/// Creates an isolated test container with real service implementations.
///
/// ---
///
/// Use this for integration tests that need to verify actual service
/// behavior and interaction patterns.
///
/// # Example
/// ```ignore
/// #[tokio::test]
/// async fn test_full_event_flow() {
///     let container = create_test_container();
///     // Test with real EventBus
/// }
/// ```
#[must_use]
pub fn create_test_container() -> TestContainer {
    TestContainer {
        event_bus: Arc::new(EventBusService::default()),
        logger: Arc::new(QualiaLogger::new()),
        timer: Arc::new(TimerService::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_container_creation() {
        let container = create_test_container();
        
        // Should be able to access all core services
        let _logger = &container.logger;
        let _event_bus = &container.event_bus;
        let _timer = &container.timer;
    }

    #[tokio::test]
    async fn test_event_bus_integration() {
        let container = create_test_container();
        let event_bus = &container.event_bus;
        
        let mut rx = event_bus.subscribe();
        
        let event = shared_core::events::GameEvent::QualiaStateUpdated {
            state: shared_core::contracts::QualiaState::default(),
        };
        
        // Should emit successfully
        let result = event_bus.emit(event);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1); // 1 subscriber
        
        // Should receive event
        let received = rx.try_recv();
        assert!(received.is_ok());
    }

    #[test]
    fn test_logger_integration() {
        let container = create_test_container();
        let logger = &container.logger;
        
        // Should not panic
        logger.info("Integration test log");
        logger.warn("Integration test warning");
        logger.error("Integration test error");
        logger.debug("Integration test debug");
    }

    #[tokio::test]
    async fn test_timer_integration() {
        let container = create_test_container();
        let timer = &container.timer;
        
        let start = timer.elapsed();
        
        // Sleep for 10ms
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        
        let elapsed = timer.elapsed() - start;
        
        // Should have elapsed at least 10ms
        assert!(elapsed.as_millis() >= 10);
    }
}

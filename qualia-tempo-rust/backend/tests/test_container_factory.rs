//! # Responsibility
//! Provides isolated Shaku containers for integration testing.
//!
//! ---
//!
//! Each test gets its own container with fresh service instances
//! to prevent cross-contamination between tests.

use backend::services::core::{EventBusService, QualiaLogger, TimerService};
use shaku::{module, HasComponent};
use shared_core::traits::{IEventBus, ILogger, IBaseService};
use std::sync::Arc;

// Production-like test module with real service implementations.
// Use this for integration tests that need full service stack.
module! {
    pub TestModule {
        components = [
            EventBusService,
            QualiaLogger,
            TimerService,
        ],
        providers = []
    }
}

/// # Responsibility
/// Creates an isolated test container for integration tests.
///
/// ---
///
/// Each test should call this to get a fresh container.
pub fn create_test_container() -> TestModule {
    TestModule::builder().build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_container_resolves_all_services() {
        let container = create_test_container();
        
        let _logger: Arc<dyn ILogger> = container.resolve();
        let _event_bus: Arc<dyn IEventBus> = container.resolve();
        let _timer: Arc<dyn IBaseService> = container.resolve();
    }

    #[tokio::test]
    async fn test_event_bus_integration() {
        let container = create_test_container();
        let event_bus: Arc<dyn IEventBus> = container.resolve();
        
        let mut rx = event_bus.subscribe();
        
        let event = shared_core::events::GameEvent::QualiaStateUpdated {
            state: shared_core::contracts::QualiaState::default(),
        };
        
        let result = event_bus.emit(event.clone());
        assert!(result.is_ok());
        
        let received = rx.try_recv();
        assert!(matches!(
            received,
            Ok(shared_core::events::GameEvent::QualiaStateUpdated { .. })
        ));
    }

    #[test]
    fn test_multiple_containers_are_isolated() {
        let container1 = create_test_container();
        let container2 = create_test_container();
        
        let bus1: Arc<dyn IEventBus> = container1.resolve();
        let bus2: Arc<dyn IEventBus> = container2.resolve();
        
        // These should be different instances
        assert!(Arc::ptr_eq(&bus1, &bus2) == false);
    }
}

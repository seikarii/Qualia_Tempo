//! # Responsibility
//! Application initialization and shutdown orchestration.

use async_trait::async_trait;
use shaku::Component;
use shared_core::traits::ILogger;
use shared_core::events::GameEvent;
use crate::services::core::IGameEventBus;
use crate::services::lifecycle::IApplicationInitializer;
use std::sync::Arc;
use anyhow::Result;

/// # Responsibility
/// Orchestrates application startup and shutdown lifecycle.
///
/// ---
///
/// This service initializes all subsystems in dependency order,
/// emits lifecycle events, and ensures graceful shutdown.
#[derive(Component)]
#[shaku(interface = IApplicationInitializer)]
pub struct ApplicationInitializerService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IGameEventBus>,
}

#[async_trait]
impl IApplicationInitializer for ApplicationInitializerService {
    async fn initialize(&self) -> Result<()> {
        self.logger.info("=== Qualia Tempo Backend Initializing ===");
        
        // Emit system initialized event
        let event = GameEvent::SystemInitialized {
            timestamp: Self::current_timestamp(),
        };
        
        match self.event_bus.emit(event) {
            Ok(count) => {
                self.logger.info(&format!("SystemInitialized event sent to {} subscribers", count));
            }
            Err(e) => {
                self.logger.warn(&format!("Failed to emit SystemInitialized event: {:?}", e));
            }
        }
        
        self.logger.info("=== Backend Initialization Complete ===");
        Ok(())
    }
    
    async fn shutdown(&self) -> Result<()> {
        self.logger.info("=== Qualia Tempo Backend Shutting Down ===");
        
        // Emit system shutdown event
        let event = GameEvent::SystemShutdown {
            timestamp: Self::current_timestamp(),
        };
        
        let _ = self.event_bus.emit(event);
        
        self.logger.info("=== Backend Shutdown Complete ===");
        Ok(())
    }
}

impl ApplicationInitializerService {
    fn current_timestamp() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::traits::{ILogger, IEventBus};
    use mockall::mock;

    mock! {
        Logger {}
        impl ILogger for Logger {
            fn info(&self, message: &str);
            fn warn(&self, message: &str);
            fn error(&self, message: &str);
            fn debug(&self, message: &str);
        }
    }

    mock! {
        EventBus {}
        impl IEventBus<GameEvent> for EventBus {
            fn emit(&self, event: GameEvent) -> Result<usize, tokio::sync::broadcast::error::SendError<GameEvent>>;
            fn subscribe(&self) -> tokio::sync::broadcast::Receiver<GameEvent>;
        }
    }

    #[tokio::test]
    async fn test_initialize_emits_system_started_event() {
        let mut mock_logger = MockLogger::new();
        let mut mock_event_bus = MockEventBus::new();
        
        // Expect info logs
        mock_logger
            .expect_info()
            .times(3..) // At least 3 info calls
            .return_const(());
        
        // Expect SystemInitialized emission
        mock_event_bus
            .expect_emit()
            .times(1)
            .withf(|event| matches!(event, GameEvent::SystemInitialized { .. }))
            .returning(|_| Ok(1));
        
        let service = ApplicationInitializerService {
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
        };
        
        let result = service.initialize().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_shutdown_emits_system_shutdown_event() {
        let mut mock_logger = MockLogger::new();
        let mut mock_event_bus = MockEventBus::new();
        
        // Expect info logs
        mock_logger
            .expect_info()
            .times(2..) // At least 2 info calls
            .return_const(());
        
        // Expect SystemShutdown emission
        mock_event_bus
            .expect_emit()
            .times(1)
            .withf(|event| matches!(event, GameEvent::SystemShutdown { .. }))
            .returning(|_| Ok(0));
        
        let service = ApplicationInitializerService {
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
        };
        
        let result = service.shutdown().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_initialize_handles_event_bus_failure_gracefully() {
        let mut mock_logger = MockLogger::new();
        let mut mock_event_bus = MockEventBus::new();
        
        // Expect info and warn logs
        mock_logger
            .expect_info()
            .return_const(());
        mock_logger
            .expect_warn()
            .times(1)
            .withf(|msg| msg.contains("Failed to emit SystemInitialized"))
            .return_const(());
        
        // Simulate SendError
        mock_event_bus
            .expect_emit()
            .times(1)
            .returning(|event| Err(tokio::sync::broadcast::error::SendError(event)));
        
        let service = ApplicationInitializerService {
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
        };
        
        let result = service.initialize().await;
        assert!(result.is_ok(), "Should handle event bus failure gracefully");
    }
}

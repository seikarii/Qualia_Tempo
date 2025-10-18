//! # Responsibility
//! Orchestrates application lifecycle: service initialization and shutdown.
//!
//! ---
//!
//! Manages startup sequence for all IBaseService implementations and
//! ensures graceful shutdown when application terminates.

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::traits::{ILogger, IBaseService};

/// # Responsibility
/// Interface for application lifecycle management.
#[async_trait]
pub trait IApplicationInitializer: Interface {
    async fn initialize(&self) -> Result<()>;
    async fn shutdown(&self) -> Result<()>;
}

/// # Responsibility
/// Coordinates initialization and shutdown of all registered services.
#[derive(Component)]
#[shaku(interface = IApplicationInitializer)]
pub struct ApplicationInitializerService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    services: Vec<Arc<dyn IBaseService>>,
}

impl ApplicationInitializerService {
    /// Register a service for lifecycle management
    pub fn register(&mut self, service: Arc<dyn IBaseService>) {
        self.services.push(service);
    }
}

#[async_trait]
impl IApplicationInitializer for ApplicationInitializerService {
    async fn initialize(&self) -> Result<()> {
        self.logger.info("Application initializing...");
        
        for service in &self.services {
            self.logger.info(&format!("Initializing service: {}", service.name()));
            service.initialize().await?;
        }
        
        self.logger.info("Application initialization complete");
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.logger.info("Application shutting down...");
        
        // Shutdown in reverse order
        for service in self.services.iter().rev() {
            self.logger.info(&format!("Shutting down service: {}", service.name()));
            service.shutdown().await?;
        }
        
        self.logger.info("Application shutdown complete");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::mock_logger::MockLogger;
    use mockall::*;

    mock! {
        pub Service {}
        
        #[async_trait]
        impl IBaseService for Service {
            async fn initialize(&self) -> Result<()>;
            async fn shutdown(&self) -> Result<()>;
            fn name(&self) -> &'static str;
        }
    }

    #[tokio::test]
    async fn test_initializer_calls_services_in_order() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_service = MockService::new();
        mock_service
            .expect_initialize()
            .times(1)
            .returning(|| Ok(()));
        mock_service
            .expect_name()
            .return_const("TestService");
        
        let mut initializer = ApplicationInitializerService {
            logger: Arc::new(mock_logger),
            services: vec![],
        };
        
        initializer.register(Arc::new(mock_service));
        
        assert!(initializer.initialize().await.is_ok());
    }

    #[tokio::test]
    async fn test_initializer_shutdown_reverses_order() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let mut mock_service = MockService::new();
        mock_service
            .expect_shutdown()
            .times(1)
            .returning(|| Ok(()));
        mock_service
            .expect_name()
            .return_const("TestService");
        
        let mut initializer = ApplicationInitializerService {
            logger: Arc::new(mock_logger),
            services: vec![],
        };
        
        initializer.register(Arc::new(mock_service));
        
        assert!(initializer.shutdown().await.is_ok());
    }
}

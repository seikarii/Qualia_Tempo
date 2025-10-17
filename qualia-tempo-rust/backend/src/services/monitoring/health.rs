//! # Responsibility
//! Monitors health status of critical services (EventBus, StateStore, WebSocket).
//!
//! ---
//!
//! Phase 1: Basic service ping checks (EventBus emit success, StateStore read).
//! Phase 3: Database health, disk space checks, dependency health aggregation.

use shaku::Component;
use std::sync::Arc;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use anyhow::Result;

use super::super::interfaces::{ILogger, IEventBus};
use super::super::gameplay::IStateStore;
use shared_core::events::GameEvent;

/// # Responsibility
/// Health check service configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    /// Enable health checks
    pub enabled: bool,
    
    /// Health check interval (seconds)
    pub check_interval_sec: u64,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            check_interval_sec: 30, // Check every 30 seconds
        }
    }
}

/// # Responsibility
/// Health status of the system.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum HealthStatus {
    /// All services operational
    Healthy,
    
    /// Some services degraded but functional
    Degraded,
    
    /// Critical services down
    Unhealthy,
}

/// # Responsibility
/// Detailed health report with per-service status.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthReport {
    /// Overall health status
    pub status: HealthStatus,
    
    /// EventBus health
    pub event_bus_healthy: bool,
    
    /// StateStore health
    pub state_store_healthy: bool,
    
    /// WebSocket health (Phase 3)
    pub websocket_healthy: Option<bool>,
    
    /// Timestamp of health check (Unix milliseconds)
    pub timestamp: u64,
}

/// # Responsibility
/// Trait for health check services.
#[async_trait]
pub trait IHealthCheckService: shaku::Interface {
    /// Performs a health check on all critical services.
    ///
    /// # Returns
    /// * `HealthReport` with detailed status
    async fn check_health(&self) -> Result<HealthReport>;
}

/// # Responsibility
/// Implements health checks for critical services.
///
/// ---
///
/// Phase 1: Checks EventBus and StateStore.
/// Phase 3: Adds database, disk space, WebSocket connection pool, Redis cache.
#[derive(Component)]
#[shaku(interface = IHealthCheckService)]
pub struct HealthCheckService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    state_store: Arc<dyn IStateStore>,
    
    config: Arc<HealthCheckConfig>,
}

impl HealthCheckService {
    /// Creates a new HealthCheckService instance.
    pub fn new(
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
        state_store: Arc<dyn IStateStore>,
        config: Arc<HealthCheckConfig>,
    ) -> Self {
        logger.info("HealthCheckService initialized");
        Self {
            logger,
            event_bus,
            state_store,
            config,
        }
    }
    
    /// Checks EventBus health by attempting to emit a test event.
    async fn check_event_bus(&self) -> bool {
        // Try to emit a dummy event (no subscribers needed)
        match self.event_bus.emit(GameEvent::Test) {
            Ok(_) => true,  // EventBus accepts events
            Err(_) => {
                self.logger.warn("EventBus health check failed: emit error");
                false
            }
        }
    }
    
    /// Checks StateStore health by attempting to read current state.
    async fn check_state_store(&self) -> bool {
        match self.state_store.get_current_state().await {
            Ok(_) => true,  // StateStore readable
            Err(e) => {
                self.logger.warn(&format!("StateStore health check failed: {}", e));
                false
            }
        }
    }
}

#[async_trait]
impl IHealthCheckService for HealthCheckService {
    async fn check_health(&self) -> Result<HealthReport> {
        if !self.config.enabled {
            self.logger.info("Health checks disabled, returning healthy status");
            return Ok(HealthReport {
                status: HealthStatus::Healthy,
                event_bus_healthy: true,
                state_store_healthy: true,
                websocket_healthy: None,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_millis() as u64,
            });
        }
        
        // Check EventBus
        let event_bus_healthy = self.check_event_bus().await;
        
        // Check StateStore
        let state_store_healthy = self.check_state_store().await;
        
        // Determine overall status
        let status = if event_bus_healthy && state_store_healthy {
            HealthStatus::Healthy
        } else if event_bus_healthy || state_store_healthy {
            HealthStatus::Degraded
        } else {
            HealthStatus::Unhealthy
        };
        
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis() as u64;
        
        self.logger.info(&format!(
            "Health check completed: {:?} (EventBus: {}, StateStore: {})",
            status, event_bus_healthy, state_store_healthy
        ));
        
        Ok(HealthReport {
            status,
            event_bus_healthy,
            state_store_healthy,
            websocket_healthy: None, // Phase 3
            timestamp,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::{QualiaLogger, EventBusService};
    use crate::services::gameplay::StateStoreService;
    
    fn create_test_service() -> HealthCheckService {
        let logger = Arc::new(QualiaLogger);
        let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
        let state_store = Arc::new(StateStoreService::new()) as Arc<dyn IStateStore>;
        let config = Arc::new(HealthCheckConfig::default());
        
        HealthCheckService::new(logger, event_bus, state_store, config)
    }
    
    #[tokio::test]
    async fn test_health_check_all_services_healthy() {
        let service = create_test_service();
        
        let report = service.check_health().await.unwrap();
        
        assert_eq!(report.status, HealthStatus::Healthy, "Should be healthy with all services up");
        assert!(report.event_bus_healthy, "EventBus should be healthy");
        assert!(report.state_store_healthy, "StateStore should be healthy");
    }
    
    #[tokio::test]
    async fn test_health_check_disabled() {
        let logger = Arc::new(QualiaLogger);
        let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
        let state_store = Arc::new(StateStoreService::new()) as Arc<dyn IStateStore>;
        let config = Arc::new(HealthCheckConfig {
            enabled: false,
            check_interval_sec: 30,
        });
        
        let service = HealthCheckService::new(logger, event_bus, state_store, config);
        
        let report = service.check_health().await.unwrap();
        
        assert_eq!(report.status, HealthStatus::Healthy, "Should return healthy when disabled");
    }
    
    #[tokio::test]
    async fn test_health_report_has_timestamp() {
        let service = create_test_service();
        
        let report = service.check_health().await.unwrap();
        
        assert!(report.timestamp > 0, "Should have valid timestamp");
    }
}

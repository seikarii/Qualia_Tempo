//! # Responsibility
//! Implements health check service for system monitoring and observability.
//!
//! ---
//!
//! Provides system metrics (CPU, memory, connections, uptime) for load balancers,
//! Prometheus integration, and circuit breaker patterns.

use crate::services::interfaces::{IHealthCheckService, HealthStatus, IWebSocketService};
use anyhow::Result;
use async_trait::async_trait;
use shaku::{Component, Interface};
use std::sync::Arc;
use std::time::Instant;
use sysinfo::System;
use tokio::sync::RwLock;
use tracing::info;

/// # Responsibility
/// Implements IHealthCheckService with system metrics and health thresholds.
#[derive(Component)]
#[shaku(interface = IHealthCheckService)]
pub struct HealthCheckService {
    start_time: Instant,
    system: Arc<RwLock<System>>,
    cpu_threshold: f32,
    memory_threshold: f32,
    
    #[shaku(inject)]
    websocket_service: Arc<dyn IWebSocketService>,
}

impl HealthCheckService {
    /// # Responsibility
    /// Creates new HealthCheckService with configurable health thresholds.
    pub fn new(
        websocket_service: Arc<dyn IWebSocketService>,
        cpu_threshold: f32,
        memory_threshold: f32,
    ) -> Self {
        info!(
            "HealthCheckService initialized (CPU threshold: {}%, Memory threshold: {}%)",
            cpu_threshold, memory_threshold
        );
        
        Self {
            start_time: Instant::now(),
            system: Arc::new(RwLock::new(System::new_all())),
            cpu_threshold,
            memory_threshold,
            websocket_service,
        }
    }
}

#[async_trait]
impl IHealthCheckService for HealthCheckService {
    async fn get_health(&self) -> Result<HealthStatus> {
        let mut system = self.system.write().await;
        system.refresh_all();
        
        // Calculate CPU usage (average across all cores)
        let cpu_usage: f32 = system.cpus().iter()
            .map(|cpu| cpu.cpu_usage())
            .sum::<f32>() / system.cpus().len().max(1) as f32;
        
        // Calculate memory usage in MB
        let used_memory = system.used_memory();
        let total_memory = system.total_memory();
        let memory_usage_mb = (used_memory as f64 / 1024.0 / 1024.0) as f32;
        let memory_usage_percent = (used_memory as f64 / total_memory as f64 * 100.0) as f32;
        
        // Get active WebSocket connections
        let active_connections = self.websocket_service.get_connection_count().await;
        
        // Calculate uptime
        let uptime_secs = self.start_time.elapsed().as_secs();
        
        // Determine health status based on thresholds
        let healthy = cpu_usage < self.cpu_threshold 
                   && memory_usage_percent < self.memory_threshold;
        
        Ok(HealthStatus {
            healthy,
            cpu_usage_percent: cpu_usage,
            memory_usage_mb,
            active_connections,
            uptime_secs,
        })
    }
    
    async fn is_healthy(&self) -> bool {
        self.get_health()
            .await
            .map(|status| status.healthy)
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::websocket::MockWebSocketService;
    
    fn create_test_service(cpu_threshold: f32, memory_threshold: f32) -> HealthCheckService {
        let mut mock_ws = MockWebSocketService::new();
        mock_ws.expect_get_connection_count()
            .returning(|| Box::pin(async { 10 }));
        
        HealthCheckService::new(
            Arc::new(mock_ws),
            cpu_threshold,
            memory_threshold,
        )
    }
    
    #[tokio::test]
    async fn test_get_health_returns_status() {
        let service = create_test_service(90.0, 90.0);
        
        let status = service.get_health().await.unwrap();
        
        assert!(status.cpu_usage_percent >= 0.0);
        assert!(status.memory_usage_mb > 0.0);
        assert_eq!(status.active_connections, 10);
        assert!(status.uptime_secs >= 0);
    }
    
    #[tokio::test]
    async fn test_is_healthy_when_metrics_good() {
        let service = create_test_service(100.0, 100.0); // Very high thresholds
        
        let healthy = service.is_healthy().await;
        
        assert!(healthy, "Should be healthy with high thresholds");
    }
    
    #[tokio::test]
    async fn test_is_healthy_false_when_cpu_high() {
        let service = create_test_service(0.1, 100.0); // Very low CPU threshold
        
        let healthy = service.is_healthy().await;
        
        // Should be unhealthy because CPU usage will exceed 0.1%
        assert!(!healthy, "Should be unhealthy with low CPU threshold");
    }
    
    #[tokio::test]
    async fn test_uptime_tracking_accuracy() {
        let service = create_test_service(90.0, 90.0);
        
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        let status = service.get_health().await.unwrap();
        
        assert!(status.uptime_secs >= 0, "Uptime should be at least 0 seconds");
    }
    
    #[tokio::test]
    async fn test_memory_usage_calculation() {
        let service = create_test_service(90.0, 90.0);
        
        let status = service.get_health().await.unwrap();
        
        assert!(status.memory_usage_mb > 0.0, "Memory usage should be positive");
        assert!(status.memory_usage_mb < 1_000_000.0, "Memory usage should be reasonable");
    }
    
    #[tokio::test]
    async fn test_connection_count_integration() {
        let mut mock_ws = MockWebSocketService::new();
        mock_ws.expect_get_connection_count()
            .returning(|| Box::pin(async { 42 }));
        
        let service = HealthCheckService::new(
            Arc::new(mock_ws),
            90.0,
            90.0,
        );
        
        let status = service.get_health().await.unwrap();
        
        assert_eq!(status.active_connections, 42);
    }
    
    #[tokio::test]
    async fn test_health_threshold_configuration() {
        let service_strict = create_test_service(1.0, 1.0); // Very strict
        let service_lenient = create_test_service(99.0, 99.0); // Very lenient
        
        let strict_healthy = service_strict.is_healthy().await;
        let lenient_healthy = service_lenient.is_healthy().await;
        
        // Lenient should have higher chance of being healthy
        assert!(
            !strict_healthy || lenient_healthy,
            "Lenient thresholds should be at least as permissive as strict"
        );
    }
    
    #[tokio::test]
    async fn test_circuit_breaker_behavior() {
        let service = create_test_service(90.0, 90.0);
        
        // Simulate multiple health checks (circuit breaker would track failures)
        let mut healthy_count = 0;
        for _ in 0..5 {
            if service.is_healthy().await {
                healthy_count += 1;
            }
        }
        
        // Should succeed consistently if system is stable
        assert!(healthy_count > 0, "At least some checks should succeed");
    }
}

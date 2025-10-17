//! # Responsibility
//! Health check service interface for system monitoring.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;

/// # Responsibility
/// System health status.
#[derive(Debug, Clone)]
pub struct HealthStatus {
    pub healthy: bool,
    pub cpu_usage_percent: f32,
    pub memory_usage_mb: f32,
    pub active_connections: usize,
    pub uptime_secs: u64,
}

/// # Responsibility
/// Monitors system health for load balancers and observability.
#[async_trait]
pub trait IHealthCheckService: Interface {
    /// Returns current health status.
    async fn get_health(&self) -> Result<HealthStatus>;
    
    /// Checks if system is healthy (for /health endpoint).
    async fn is_healthy(&self) -> bool;
}

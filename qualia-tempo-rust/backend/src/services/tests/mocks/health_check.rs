//! # Responsibility
//! High-fidelity mock for IHealthCheckService trait.

use crate::services::interfaces::{IHealthCheckService, HealthStatus};
use anyhow::Result;
use async_trait::async_trait;
use mockall::*;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IHealthCheckService, used in unit tests.
    pub HealthCheckService {}
    
    #[async_trait]
    impl IHealthCheckService for HealthCheckService {
        async fn get_health(&self) -> Result<HealthStatus>;
        async fn is_healthy(&self) -> bool;
    }
}

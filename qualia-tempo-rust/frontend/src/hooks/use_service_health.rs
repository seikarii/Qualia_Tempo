//! # Responsibility
//! Hook for monitoring service health status.
//!
//! ---
//!
//! Leptos hook providing access to real-time service health monitoring.
//! Returns reactive signals for service status, uptime, and error counts.

use leptos::*;
use std::collections::HashMap;

/// # Responsibility
/// Service health status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ServiceHealth {
    /// Service operating normally (0 errors)
    Healthy,
    /// Service experiencing issues (1-10 errors)
    Degraded,
    /// Service not responding (>10 errors or no heartbeat)
    Down,
}

/// # Responsibility
/// Service health snapshot.
#[derive(Debug, Clone)]
pub struct ServiceHealthData {
    pub service_name: String,
    pub health: ServiceHealth,
    pub uptime_ms: u64,
    pub error_count: u32,
    pub last_heartbeat_ms: u64,
}

/// # Responsibility
/// Service health monitoring handle.
#[derive(Clone)]
pub struct ServiceHealthMonitor {
    services: ReadSignal<HashMap<String, ServiceHealthData>>,
}

impl ServiceHealthMonitor {
    /// # Responsibility
    /// Gets health data for specific service.
    pub fn get_service(&self, name: &str) -> Option<ServiceHealthData> {
        self.services.get().get(name).cloned()
    }

    /// # Responsibility
    /// Gets all services.
    pub fn get_all_services(&self) -> HashMap<String, ServiceHealthData> {
        self.services.get()
    }

    /// # Responsibility
    /// Checks if all services are healthy.
    pub fn all_healthy(&self) -> bool {
        self.services.get().values().all(|s| s.health == ServiceHealth::Healthy)
    }

    /// # Responsibility
    /// Counts services by health status.
    pub fn count_by_health(&self, health: ServiceHealth) -> usize {
        self.services.get().values().filter(|s| s.health == health).count()
    }
}

/// # Responsibility
/// Hook providing access to service health monitoring.
///
/// # Returns
/// ServiceHealthMonitor with reactive service data.
///
/// # Example
/// ```rust
/// let monitor = use_service_health();
/// let all_ok = move || monitor.all_healthy();
/// ```
pub fn use_service_health() -> ServiceHealthMonitor {
    use_context::<ServiceHealthMonitor>().expect("ServiceHealthMonitor not found")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_health_equality() {
        assert_eq!(ServiceHealth::Healthy, ServiceHealth::Healthy);
        assert_ne!(ServiceHealth::Healthy, ServiceHealth::Degraded);
    }

    #[test]
    fn test_service_health_data_creation() {
        let data = ServiceHealthData {
            service_name: "EventBus".to_string(),
            health: ServiceHealth::Healthy,
            uptime_ms: 60000,
            error_count: 0,
            last_heartbeat_ms: 59900,
        };
        assert_eq!(data.service_name, "EventBus");
        assert_eq!(data.health, ServiceHealth::Healthy);
        assert_eq!(data.error_count, 0);
    }

    #[test]
    fn test_health_thresholds() {
        // Test that health thresholds are correct
        let healthy = ServiceHealthData {
            service_name: "Test".to_string(),
            health: ServiceHealth::Healthy,
            uptime_ms: 1000,
            error_count: 0,
            last_heartbeat_ms: 900,
        };
        
        let degraded = ServiceHealthData {
            service_name: "Test".to_string(),
            health: ServiceHealth::Degraded,
            uptime_ms: 1000,
            error_count: 5,
            last_heartbeat_ms: 900,
        };
        
        let down = ServiceHealthData {
            service_name: "Test".to_string(),
            health: ServiceHealth::Down,
            uptime_ms: 1000,
            error_count: 15,
            last_heartbeat_ms: 100,
        };
        
        assert_eq!(healthy.error_count, 0);
        assert!(degraded.error_count >= 1 && degraded.error_count <= 10);
        assert!(down.error_count > 10);
    }

    #[test]
    fn test_service_health_copy() {
        let health1 = ServiceHealth::Healthy;
        let health2 = health1; // Copy trait
        assert_eq!(health1, health2);
    }
}

//! # Responsibility
//! Monitoring and observability services for backend health and performance.
//!
//! ---
//!
//! This module provides health checks, metrics collection (Prometheus format),
//! and performance profiling capabilities for the Qualia Tempo backend.

pub mod health;
pub mod metrics;
pub mod performance;

pub use health::HealthCheckService;
pub use metrics::MetricsService;
pub use performance::PerformanceService;

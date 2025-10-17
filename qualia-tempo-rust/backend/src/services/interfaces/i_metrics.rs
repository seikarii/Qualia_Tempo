//! # Responsibility
//! Metrics trait interface for Prometheus metrics collection.

use shaku::Interface;
use anyhow::Result;

/// # Responsibility
/// Provides Prometheus metrics collection and export.
pub trait IMetrics: Interface {
    fn increment_counter(&self, name: &str);
    fn set_gauge(&self, name: &str, value: f64);
    fn record_histogram(&self, name: &str, value: f64);
    fn export_metrics(&self) -> Result<String>;
}

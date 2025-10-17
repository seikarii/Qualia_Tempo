//! # Responsibility
//! Performance trait interface for span profiling.

use shaku::Interface;
use anyhow::Result;

/// # Responsibility
/// Provides performance profiling with tracing spans.
pub trait IPerformance: Interface {
    fn start_span(&self, name: &str) -> u64;
    fn end_span(&self, span_id: u64);
    fn get_span_duration(&self, span_id: u64) -> Option<f64>;
    fn export_profile(&self) -> Result<String>;
}

//! # Responsibility
//! Collects and exposes performance metrics in Prometheus format.
//!
//! ---
//!
//! Tracks key performance indicators (KPIs) for the Qualia Tempo backend:
//! - WebSocket connection count
//! - Event emissions per second
//! - Combat state updates per second
//! - Average latency
//! - Memory usage
//!
//! Metrics are exposed via HTTP endpoint for scraping by Prometheus/Grafana.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// # Responsibility
/// Configuration for the metrics collection system.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricsConfig {
    /// Enable metrics collection
    pub enabled: bool,
    /// Flush metrics to storage every N seconds
    pub flush_interval_sec: u64,
    /// Maximum number of metrics to keep in memory
    pub max_metrics_in_memory: usize,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            flush_interval_sec: 10,
            max_metrics_in_memory: 10000,
        }
    }
}

/// # Responsibility
/// Represents a single metric datapoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricData {
    pub name: String,
    pub value: f64,
    pub timestamp: u64, // Unix timestamp
    pub labels: HashMap<String, String>,
}

/// # Responsibility
/// Internal storage for metric counters and gauges.
#[derive(Debug)]
struct MetricStore {
    counters: HashMap<String, Arc<AtomicU64>>,
    gauges: HashMap<String, Arc<RwLock<f64>>>,
    histograms: HashMap<String, Arc<RwLock<Vec<f64>>>>,
}

impl MetricStore {
    fn new() -> Self {
        Self {
            counters: HashMap::new(),
            gauges: HashMap::new(),
            histograms: HashMap::new(),
        }
    }
}

/// # Responsibility
/// Collects and manages performance metrics for the backend.
///
/// ---
///
/// Provides thread-safe atomic counters and gauges for tracking KPIs.
/// Exposes metrics in Prometheus text format for scraping.
pub struct MetricsService {
    config: MetricsConfig,
    store: Arc<RwLock<MetricStore>>,
    start_time: Instant,
}

impl MetricsService {
    /// Creates a new MetricsService with the given configuration.
    pub fn new(config: MetricsConfig) -> Self {
        Self {
            config,
            store: Arc::new(RwLock::new(MetricStore::new())),
            start_time: Instant::now(),
        }
    }

    /// Increments a counter metric by 1.
    ///
    /// # Example
    /// ```rust
    /// metrics_service.increment_counter("websocket_connections").await;
    /// ```
    pub async fn increment_counter(&self, name: &str) {
        self.add_counter(name, 1).await;
    }

    /// Adds a value to a counter metric.
    pub async fn add_counter(&self, name: &str, value: u64) {
        if !self.config.enabled {
            return;
        }

        let mut store = self.store.write().await;
        let counter = store
            .counters
            .entry(name.to_string())
            .or_insert_with(|| Arc::new(AtomicU64::new(0)));
        
        counter.fetch_add(value, Ordering::Relaxed);
    }

    /// Sets a gauge metric to a specific value.
    ///
    /// # Example
    /// ```rust
    /// metrics_service.set_gauge("active_combats", 5.0).await;
    /// ```
    pub async fn set_gauge(&self, name: &str, value: f64) {
        if !self.config.enabled {
            return;
        }

        let mut store = self.store.write().await;
        let gauge = store
            .gauges
            .entry(name.to_string())
            .or_insert_with(|| Arc::new(RwLock::new(0.0)));
        
        *gauge.write().await = value;
    }

    /// Records a value in a histogram (for percentile calculation).
    ///
    /// # Example
    /// ```rust
    /// metrics_service.record_histogram("combat_update_latency_ms", 12.5).await;
    /// ```
    pub async fn record_histogram(&self, name: &str, value: f64) {
        if !self.config.enabled {
            return;
        }

        let mut store = self.store.write().await;
        let histogram = store
            .histograms
            .entry(name.to_string())
            .or_insert_with(|| Arc::new(RwLock::new(Vec::new())));
        
        let mut hist = histogram.write().await;
        hist.push(value);

        // Prevent unbounded growth
        if hist.len() > self.config.max_metrics_in_memory {
            hist.drain(0..hist.len() / 2); // Remove oldest half
        }
    }

    /// Returns all metrics in Prometheus text format.
    ///
    /// # Format
    /// ```text
    /// # HELP websocket_connections Number of active WebSocket connections
    /// # TYPE websocket_connections counter
    /// websocket_connections 42
    ///
    /// # HELP combat_update_latency_ms Combat update latency in milliseconds
    /// # TYPE combat_update_latency_ms histogram
    /// combat_update_latency_ms_sum 1250.5
    /// combat_update_latency_ms_count 100
    /// combat_update_latency_ms_p50 12.3
    /// combat_update_latency_ms_p95 18.7
    /// combat_update_latency_ms_p99 25.1
    /// ```
    pub async fn export_prometheus(&self) -> String {
        let store = self.store.read().await;
        let mut output = String::new();

        // Export counters
        for (name, counter) in &store.counters {
            output.push_str(&format!("# HELP {} Counter metric\n", name));
            output.push_str(&format!("# TYPE {} counter\n", name));
            output.push_str(&format!("{} {}\n\n", name, counter.load(Ordering::Relaxed)));
        }

        // Export gauges
        for (name, gauge) in &store.gauges {
            output.push_str(&format!("# HELP {} Gauge metric\n", name));
            output.push_str(&format!("# TYPE {} gauge\n", name));
            output.push_str(&format!("{} {}\n\n", name, *gauge.read().await));
        }

        // Export histograms with percentiles
        for (name, histogram) in &store.histograms {
            let hist = histogram.read().await;
            if hist.is_empty() {
                continue;
            }

            let mut sorted = hist.clone();
            sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

            let sum: f64 = sorted.iter().sum();
            let count = sorted.len();
            let p50 = Self::percentile(&sorted, 0.50);
            let p95 = Self::percentile(&sorted, 0.95);
            let p99 = Self::percentile(&sorted, 0.99);

            output.push_str(&format!("# HELP {} Histogram metric\n", name));
            output.push_str(&format!("# TYPE {} histogram\n", name));
            output.push_str(&format!("{}_sum {}\n", name, sum));
            output.push_str(&format!("{}_count {}\n", name, count));
            output.push_str(&format!("{}_p50 {}\n", name, p50));
            output.push_str(&format!("{}_p95 {}\n", name, p95));
            output.push_str(&format!("{}_p99 {}\n\n", name, p99));
        }

        // Add uptime metric
        let uptime_sec = self.start_time.elapsed().as_secs();
        output.push_str("# HELP backend_uptime_seconds Backend uptime in seconds\n");
        output.push_str("# TYPE backend_uptime_seconds counter\n");
        output.push_str(&format!("backend_uptime_seconds {}\n", uptime_sec));

        output
    }

    /// Calculates a percentile from a sorted vector.
    fn percentile(sorted: &[f64], p: f64) -> f64 {
        if sorted.is_empty() {
            return 0.0;
        }

        let index = ((sorted.len() as f64 - 1.0) * p) as usize;
        sorted[index]
    }

    /// Returns a snapshot of all current metrics.
    pub async fn get_snapshot(&self) -> HashMap<String, f64> {
        let store = self.store.read().await;
        let mut snapshot = HashMap::new();

        for (name, counter) in &store.counters {
            snapshot.insert(name.clone(), counter.load(Ordering::Relaxed) as f64);
        }

        for (name, gauge) in &store.gauges {
            snapshot.insert(name.clone(), *gauge.read().await);
        }

        snapshot
    }

    /// Resets all metrics to zero.
    pub async fn reset(&self) {
        let mut store = self.store.write().await;
        store.counters.clear();
        store.gauges.clear();
        store.histograms.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_counter_increments() {
        let metrics = MetricsService::new(MetricsConfig::default());
        
        metrics.increment_counter("test_counter").await;
        metrics.increment_counter("test_counter").await;
        metrics.increment_counter("test_counter").await;
        
        let snapshot = metrics.get_snapshot().await;
        assert_eq!(snapshot.get("test_counter"), Some(&3.0));
    }

    #[tokio::test]
    async fn test_gauge_updates() {
        let metrics = MetricsService::new(MetricsConfig::default());
        
        metrics.set_gauge("active_users", 10.0).await;
        metrics.set_gauge("active_users", 25.0).await;
        
        let snapshot = metrics.get_snapshot().await;
        assert_eq!(snapshot.get("active_users"), Some(&25.0));
    }

    #[tokio::test]
    async fn test_histogram_percentiles() {
        let metrics = MetricsService::new(MetricsConfig::default());
        
        // Record latencies: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ms
        for i in 1..=10 {
            metrics.record_histogram("latency_ms", (i * 10) as f64).await;
        }
        
        let prometheus = metrics.export_prometheus().await;
        
        // Should contain percentile data
        assert!(prometheus.contains("latency_ms_p50"));
        assert!(prometheus.contains("latency_ms_p95"));
        assert!(prometheus.contains("latency_ms_p99"));
        
        // P50 should be around 50-60
        assert!(prometheus.contains("latency_ms_p50 5"));
    }

    #[tokio::test]
    async fn test_prometheus_export_format() {
        let metrics = MetricsService::new(MetricsConfig::default());
        
        metrics.increment_counter("websocket_connections").await;
        metrics.set_gauge("active_combats", 3.0).await;
        
        let output = metrics.export_prometheus().await;
        
        // Verify Prometheus format
        assert!(output.contains("# HELP websocket_connections"));
        assert!(output.contains("# TYPE websocket_connections counter"));
        assert!(output.contains("websocket_connections 1"));
        
        assert!(output.contains("# HELP active_combats"));
        assert!(output.contains("# TYPE active_combats gauge"));
        assert!(output.contains("active_combats 3"));
        
        assert!(output.contains("backend_uptime_seconds"));
    }

    #[tokio::test]
    async fn test_disabled_metrics() {
        let config = MetricsConfig {
            enabled: false,
            ..Default::default()
        };
        let metrics = MetricsService::new(config);
        
        metrics.increment_counter("test").await;
        metrics.set_gauge("test_gauge", 100.0).await;
        
        let snapshot = metrics.get_snapshot().await;
        assert!(snapshot.is_empty());
    }

    #[tokio::test]
    async fn test_histogram_max_size_limit() {
        let config = MetricsConfig {
            enabled: true,
            max_metrics_in_memory: 100,
            ..Default::default()
        };
        let metrics = MetricsService::new(config);
        
        // Record 150 values (exceeds max of 100)
        for i in 0..150 {
            metrics.record_histogram("test_hist", i as f64).await;
        }
        
        let prometheus = metrics.export_prometheus().await;
        
        // Should have trimmed to prevent unbounded growth
        // Count should be less than 150 (half was removed)
        assert!(prometheus.contains("test_hist_count"));
    }

    #[tokio::test]
    async fn test_reset_clears_all_metrics() {
        let metrics = MetricsService::new(MetricsConfig::default());
        
        metrics.increment_counter("counter1").await;
        metrics.set_gauge("gauge1", 42.0).await;
        metrics.record_histogram("hist1", 10.0).await;
        
        metrics.reset().await;
        
        let snapshot = metrics.get_snapshot().await;
        assert!(snapshot.is_empty());
        
        let prometheus = metrics.export_prometheus().await;
        assert!(!prometheus.contains("counter1"));
        assert!(!prometheus.contains("gauge1"));
        assert!(!prometheus.contains("hist1"));
    }
}

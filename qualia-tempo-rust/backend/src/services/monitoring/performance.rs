//! # Responsibility
//! Provides performance profiling and resource monitoring capabilities.
//!
//! ---
//!
//! Tracks CPU usage, memory allocation, frame times, and provides
//! profiling hooks for identifying bottlenecks in the game loop.
//!
//! Integrates with `tracing` for span-based profiling and can generate
//! flamegraphs for performance analysis.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// # Responsibility
/// Configuration for the performance monitoring system.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceConfig {
    /// Enable performance profiling
    pub enabled: bool,
    /// Sample rate for CPU/memory stats (Hz)
    pub sample_rate_hz: u32,
    /// Maximum number of profiling samples to retain
    pub max_samples: usize,
    /// Enable flamegraph generation
    pub enable_flamegraphs: bool,
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            sample_rate_hz: 10, // Sample 10 times per second
            max_samples: 1000,
            enable_flamegraphs: false, // Disabled by default (overhead)
        }
    }
}

/// # Responsibility
/// Represents a single performance sample.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSample {
    pub timestamp: u64, // Unix timestamp ms
    pub cpu_usage_percent: f32,
    pub memory_used_mb: f32,
    pub frame_time_ms: f32,
    pub event_bus_queue_size: u32,
    pub active_websockets: u32,
}

/// # Responsibility
/// Represents a profiled code span with timing information.
#[derive(Debug, Clone)]
struct ProfileSpan {
    name: String,
    start: Instant,
    duration: Option<Duration>,
}

/// # Responsibility
/// Provides performance profiling and resource monitoring.
///
/// ---
///
/// Tracks system resource usage, frame times, and code execution hotspots.
/// Can export profiling data for analysis with external tools (flamegraph, etc.).
pub struct PerformanceService {
    config: PerformanceConfig,
    samples: Arc<RwLock<Vec<PerformanceSample>>>,
    active_spans: Arc<RwLock<Vec<ProfileSpan>>>,
    completed_spans: Arc<RwLock<HashMap<String, Vec<Duration>>>>,
}

impl PerformanceService {
    /// Creates a new PerformanceService with the given configuration.
    pub fn new(config: PerformanceConfig) -> Self {
        Self {
            config,
            samples: Arc::new(RwLock::new(Vec::new())),
            active_spans: Arc::new(RwLock::new(Vec::new())),
            completed_spans: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Records a performance sample with current system state.
    ///
    /// # Example
    /// ```rust
    /// let sample = PerformanceSample {
    ///     timestamp: current_time_ms(),
    ///     cpu_usage_percent: 45.2,
    ///     memory_used_mb: 512.0,
    ///     frame_time_ms: 16.67,
    ///     event_bus_queue_size: 10,
    ///     active_websockets: 5,
    /// };
    /// performance_service.record_sample(sample).await;
    /// ```
    pub async fn record_sample(&self, sample: PerformanceSample) {
        if !self.config.enabled {
            return;
        }

        let mut samples = self.samples.write().await;
        samples.push(sample);

        // Prevent unbounded growth
        if samples.len() > self.config.max_samples {
            samples.drain(0..samples.len() / 2); // Remove oldest half
        }
    }

    /// Starts a profiled span for measuring code execution time.
    ///
    /// # Example
    /// ```rust
    /// let span_id = performance_service.start_span("boss_ai_update").await;
    /// // ... do work ...
    /// performance_service.end_span(span_id).await;
    /// ```
    pub async fn start_span(&self, name: &str) -> usize {
        if !self.config.enabled {
            return 0;
        }

        let span = ProfileSpan {
            name: name.to_string(),
            start: Instant::now(),
            duration: None,
        };

        let mut spans = self.active_spans.write().await;
        spans.push(span);
        spans.len() - 1 // Return index as span ID
    }

    /// Ends a profiled span and records its duration.
    pub async fn end_span(&self, span_id: usize) {
        if !self.config.enabled {
            return;
        }

        let mut active = self.active_spans.write().await;
        if span_id >= active.len() {
            return;
        }

        let mut span = active.remove(span_id);
        span.duration = Some(span.start.elapsed());

        // Record completed span
        let mut completed = self.completed_spans.write().await;
        completed
            .entry(span.name.clone())
            .or_insert_with(Vec::new)
            .push(span.duration.unwrap());
    }

    /// Measures the execution time of a closure.
    ///
    /// # Example
    /// ```rust
    /// let result = performance_service.measure("calculate_qualia", || {
    ///     // ... expensive computation ...
    ///     42
    /// }).await;
    /// ```
    pub async fn measure<F, T>(&self, name: &str, f: F) -> T
    where
        F: FnOnce() -> T,
    {
        let span_id = self.start_span(name).await;
        let result = f();
        self.end_span(span_id).await;
        result
    }

    /// Returns profiling statistics for all measured spans.
    ///
    /// # Returns
    /// Map of span names to (count, avg_ms, p95_ms, p99_ms)
    pub async fn get_profiling_stats(&self) -> HashMap<String, (usize, f64, f64, f64)> {
        let completed = self.completed_spans.read().await;
        let mut stats = HashMap::new();

        for (name, durations) in completed.iter() {
            if durations.is_empty() {
                continue;
            }

            let count = durations.len();
            let avg_ms = durations.iter().map(|d| d.as_secs_f64() * 1000.0).sum::<f64>()
                / count as f64;

            let mut sorted_ms: Vec<f64> = durations
                .iter()
                .map(|d| d.as_secs_f64() * 1000.0)
                .collect();
            sorted_ms.sort_by(|a, b| a.partial_cmp(b).unwrap());

            let p95_ms = Self::percentile(&sorted_ms, 0.95);
            let p99_ms = Self::percentile(&sorted_ms, 0.99);

            stats.insert(name.clone(), (count, avg_ms, p95_ms, p99_ms));
        }

        stats
    }

    /// Calculates a percentile from a sorted vector.
    fn percentile(sorted: &[f64], p: f64) -> f64 {
        if sorted.is_empty() {
            return 0.0;
        }

        let index = ((sorted.len() as f64 - 1.0) * p) as usize;
        sorted[index]
    }

    /// Returns all recorded performance samples.
    pub async fn get_samples(&self) -> Vec<PerformanceSample> {
        self.samples.read().await.clone()
    }

    /// Calculates average frame time from recent samples.
    pub async fn get_avg_frame_time_ms(&self) -> f32 {
        let samples = self.samples.read().await;
        if samples.is_empty() {
            return 0.0;
        }

        let sum: f32 = samples.iter().map(|s| s.frame_time_ms).sum();
        sum / samples.len() as f32
    }

    /// Calculates average CPU usage from recent samples.
    pub async fn get_avg_cpu_usage(&self) -> f32 {
        let samples = self.samples.read().await;
        if samples.is_empty() {
            return 0.0;
        }

        let sum: f32 = samples.iter().map(|s| s.cpu_usage_percent).sum();
        sum / samples.len() as f32
    }

    /// Calculates average memory usage from recent samples.
    pub async fn get_avg_memory_mb(&self) -> f32 {
        let samples = self.samples.read().await;
        if samples.is_empty() {
            return 0.0;
        }

        let sum: f32 = samples.iter().map(|s| s.memory_used_mb).sum();
        sum / samples.len() as f32
    }

    /// Exports profiling data as JSON for external analysis.
    pub async fn export_json(&self) -> String {
        let stats = self.get_profiling_stats().await;
        serde_json::to_string_pretty(&stats).unwrap_or_default()
    }

    /// Resets all profiling data and samples.
    pub async fn reset(&self) {
        self.samples.write().await.clear();
        self.active_spans.write().await.clear();
        self.completed_spans.write().await.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration};

    #[tokio::test]
    async fn test_record_sample() {
        let service = PerformanceService::new(PerformanceConfig::default());

        let sample = PerformanceSample {
            timestamp: 1000,
            cpu_usage_percent: 50.0,
            memory_used_mb: 256.0,
            frame_time_ms: 16.67,
            event_bus_queue_size: 5,
            active_websockets: 3,
        };

        service.record_sample(sample.clone()).await;

        let samples = service.get_samples().await;
        assert_eq!(samples.len(), 1);
        assert_eq!(samples[0].cpu_usage_percent, 50.0);
    }

    #[tokio::test]
    async fn test_span_profiling() {
        let service = PerformanceService::new(PerformanceConfig::default());

        let span_id = service.start_span("test_operation").await;
        sleep(Duration::from_millis(10)).await;
        service.end_span(span_id).await;

        let stats = service.get_profiling_stats().await;
        assert!(stats.contains_key("test_operation"));

        let (count, avg_ms, _, _) = stats.get("test_operation").unwrap();
        assert_eq!(*count, 1);
        assert!(*avg_ms >= 10.0); // Should be at least 10ms
    }

    #[tokio::test]
    async fn test_measure_closure() {
        let service = PerformanceService::new(PerformanceConfig::default());

        let result = service
            .measure("expensive_calc", || {
                std::thread::sleep(std::time::Duration::from_millis(5));
                42
            })
            .await;

        assert_eq!(result, 42);

        let stats = service.get_profiling_stats().await;
        assert!(stats.contains_key("expensive_calc"));
    }

    #[tokio::test]
    async fn test_average_calculations() {
        let service = PerformanceService::new(PerformanceConfig::default());

        for i in 1..=5 {
            let sample = PerformanceSample {
                timestamp: i * 100,
                cpu_usage_percent: i as f32 * 10.0,
                memory_used_mb: i as f32 * 50.0,
                frame_time_ms: 16.0 + i as f32,
                event_bus_queue_size: i as u32,
                active_websockets: i as u32,
            };
            service.record_sample(sample).await;
        }

        let avg_cpu = service.get_avg_cpu_usage().await;
        let avg_memory = service.get_avg_memory_mb().await;
        let avg_frame = service.get_avg_frame_time_ms().await;

        assert_eq!(avg_cpu, 30.0); // (10 + 20 + 30 + 40 + 50) / 5
        assert_eq!(avg_memory, 150.0); // (50 + 100 + 150 + 200 + 250) / 5
        assert_eq!(avg_frame, 19.0); // (17 + 18 + 19 + 20 + 21) / 5
    }

    #[tokio::test]
    async fn test_sample_limit() {
        let config = PerformanceConfig {
            enabled: true,
            max_samples: 10,
            ..Default::default()
        };
        let service = PerformanceService::new(config);

        // Record 20 samples (exceeds max of 10)
        for i in 0..20 {
            let sample = PerformanceSample {
                timestamp: i,
                cpu_usage_percent: 0.0,
                memory_used_mb: 0.0,
                frame_time_ms: 0.0,
                event_bus_queue_size: 0,
                active_websockets: 0,
            };
            service.record_sample(sample).await;
        }

        let samples = service.get_samples().await;
        // Should have trimmed to prevent unbounded growth
        assert!(samples.len() <= 10);
    }

    #[tokio::test]
    async fn test_disabled_profiling() {
        let config = PerformanceConfig {
            enabled: false,
            ..Default::default()
        };
        let service = PerformanceService::new(config);

        let sample = PerformanceSample {
            timestamp: 1000,
            cpu_usage_percent: 50.0,
            memory_used_mb: 256.0,
            frame_time_ms: 16.67,
            event_bus_queue_size: 5,
            active_websockets: 3,
        };
        service.record_sample(sample).await;

        let span_id = service.start_span("test").await;
        service.end_span(span_id).await;

        let samples = service.get_samples().await;
        let stats = service.get_profiling_stats().await;

        assert!(samples.is_empty());
        assert!(stats.is_empty());
    }

    #[tokio::test]
    async fn test_profiling_percentiles() {
        let service = PerformanceService::new(PerformanceConfig::default());

        // Record 100 spans with varying durations
        for i in 1..=100 {
            let span_id = service.start_span("test_op").await;
            sleep(Duration::from_micros(i * 10)).await;
            service.end_span(span_id).await;
        }

        let stats = service.get_profiling_stats().await;
        let (count, avg_ms, p95_ms, p99_ms) = stats.get("test_op").unwrap();

        assert_eq!(*count, 100);
        assert!(*avg_ms > 0.0);
        assert!(*p95_ms > *avg_ms); // P95 should be higher than average
        assert!(*p99_ms >= *p95_ms); // P99 should be >= P95
    }

    #[tokio::test]
    async fn test_reset_clears_all_data() {
        let service = PerformanceService::new(PerformanceConfig::default());

        // Record data
        let sample = PerformanceSample {
            timestamp: 1000,
            cpu_usage_percent: 50.0,
            memory_used_mb: 256.0,
            frame_time_ms: 16.67,
            event_bus_queue_size: 5,
            active_websockets: 3,
        };
        service.record_sample(sample).await;

        let span_id = service.start_span("test").await;
        service.end_span(span_id).await;

        // Reset
        service.reset().await;

        // Verify cleared
        let samples = service.get_samples().await;
        let stats = service.get_profiling_stats().await;

        assert!(samples.is_empty());
        assert!(stats.is_empty());
    }
}

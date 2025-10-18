//! # Responsibility
//! Renders debug overlay with FPS counter, frame timing, and EventBus inspector (BLUEPRINT #47).
//!
//! ---
//!
//! This service provides real-time debugging information for development,
//! including performance metrics, event logs, and qualia state visualization.

use anyhow::Result;
use leptos::*;
use shared_core::contracts::QualiaState;
use std::collections::VecDeque;
use tracing::debug;

/// # Responsibility
/// Represents a single frame timing sample.
#[derive(Debug, Clone, Copy)]
pub struct FrameTiming {
    pub frame_number: u64,
    pub delta_ms: f64,
    pub fps: f32,
}

/// # Responsibility
/// Manages debug overlay rendering and performance metrics.
///
/// ---
///
/// Provides developer tools for real-time performance analysis and state inspection.
/// Only active in debug builds or when explicitly enabled.
#[derive(Clone)]
pub struct DebugOverlayService {
    /// Frame timing history signal
    pub timing_signal: WriteSignal<VecDeque<FrameTiming>>,
    pub timing_reader: ReadSignal<VecDeque<FrameTiming>>,
    
    /// Qualia state reader for visualization
    qualia_reader: ReadSignal<QualiaState>,
    
    /// Maximum frame history samples
    max_history: usize,
    
    /// Debug overlay enabled flag
    pub enabled_signal: WriteSignal<bool>,
    pub enabled_reader: ReadSignal<bool>,
}

impl DebugOverlayService {
    /// # Responsibility
    /// Creates a new DebugOverlayService.
    ///
    /// # Arguments
    /// - `qualia_reader`: ReadSignal for qualia state visualization
    /// - `max_history`: Maximum frame samples to retain (default 120)
    pub fn new(qualia_reader: ReadSignal<QualiaState>, max_history: usize) -> Result<Self> {
        let (timing_reader, timing_signal) = create_signal(VecDeque::new());
        let (enabled_reader, enabled_signal) = create_signal(cfg!(debug_assertions));

        debug!("DebugOverlayService initialized with max_history={}", max_history);

        Ok(Self {
            timing_signal,
            timing_reader,
            qualia_reader,
            max_history,
            enabled_signal,
            enabled_reader,
        })
    }

    /// # Responsibility
    /// Records a new frame timing sample.
    ///
    /// ---
    ///
    /// Called once per frame to update FPS counter and timing graph.
    ///
    /// # Arguments
    /// - `frame_number`: Current frame number
    /// - `delta_ms`: Time since last frame (milliseconds)
    pub fn record_frame(&self, frame_number: u64, delta_ms: f64) {
        let fps = if delta_ms > 0.0 {
            (1000.0 / delta_ms) as f32
        } else {
            0.0
        };

        let timing = FrameTiming {
            frame_number,
            delta_ms,
            fps,
        };

        let mut history = self.timing_reader.get();
        
        if history.len() >= self.max_history {
            history.pop_front();
        }
        
        history.push_back(timing);
        self.timing_signal.set(history);
    }

    /// # Responsibility
    /// Calculates average FPS from recent frames.
    #[must_use]
    pub fn get_average_fps(&self) -> f32 {
        let history = self.timing_reader.get();
        
        if history.is_empty() {
            return 0.0;
        }

        let sum: f32 = history.iter().map(|t| t.fps).sum();
        sum / (history.len() as f32)
    }

    /// # Responsibility
    /// Gets current FPS (most recent frame).
    #[must_use]
    pub fn get_current_fps(&self) -> f32 {
        self.timing_reader.get()
            .back()
            .map_or(0.0, |t| t.fps)
    }

    /// # Responsibility
    /// Gets frame time statistics (min, max, avg).
    #[must_use]
    pub fn get_frame_time_stats(&self) -> (f64, f64, f64) {
        let history = self.timing_reader.get();
        
        if history.is_empty() {
            return (0.0, 0.0, 0.0);
        }

        let deltas: Vec<f64> = history.iter().map(|t| t.delta_ms).collect();
        let min = deltas.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = deltas.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let avg = deltas.iter().sum::<f64>() / (deltas.len() as f64);

        (min, max, avg)
    }

    /// # Responsibility
    /// Renders FPS counter as HTML string.
    #[must_use]
    pub fn render_fps_counter(&self) -> String {
        let current_fps = self.get_current_fps();
        let avg_fps = self.get_average_fps();
        
        let fps_class = if current_fps >= 58.0 {
            "fps-good"
        } else if current_fps >= 30.0 {
            "fps-ok"
        } else {
            "fps-bad"
        };

        format!(
            r#"<div class="debug-fps {class}">
                <span class="fps-label">FPS</span>
                <span class="fps-current">{current:.0}</span>
                <span class="fps-avg">({avg:.1} avg)</span>
            </div>"#,
            class = fps_class,
            current = current_fps,
            avg = avg_fps
        )
    }

    /// # Responsibility
    /// Renders frame timing graph as ASCII art.
    #[must_use]
    pub fn render_timing_graph(&self) -> String {
        let history = self.timing_reader.get();
        
        if history.is_empty() {
            return String::new();
        }

        let (min, max, avg) = self.get_frame_time_stats();

        format!(
            r#"<div class="debug-timing-graph">
                <span>Frame Time: {avg:.2}ms (min: {min:.2}ms, max: {max:.2}ms)</span>
            </div>"#,
            avg = avg,
            min = min,
            max = max
        )
    }

    /// # Responsibility
    /// Renders qualia state inspector as HTML string.
    #[must_use]
    pub fn render_qualia_inspector(&self) -> String {
        let qualia = self.qualia_reader.get();

        format!(
            r#"<div class="debug-qualia-inspector">
                <h3>Qualia State</h3>
                <table>
                    <tr><td>Intensity:</td><td>{:.3}</td></tr>
                    <tr><td>Precision:</td><td>{:.3}</td></tr>
                    <tr><td>Aggression:</td><td>{:.3}</td></tr>
                    <tr><td>Flow:</td><td>{:.3}</td></tr>
                    <tr><td>Chaos:</td><td>{:.3}</td></tr>
                    <tr><td>Recovery:</td><td>{:.3}</td></tr>
                    <tr><td>Transcendence:</td><td>{:.3}</td></tr>
                </table>
            </div>"#,
            qualia.intensity,
            qualia.precision,
            qualia.aggression,
            qualia.flow,
            qualia.chaos,
            qualia.recovery,
            qualia.transcendence
        )
    }

    /// # Responsibility
    /// Renders full debug overlay as HTML string.
    #[must_use]
    pub fn render_full_overlay(&self) -> String {
        if !self.enabled_reader.get() {
            return String::new();
        }

        format!(
            r#"<div class="debug-overlay">
                {}
                {}
                {}
            </div>"#,
            self.render_fps_counter(),
            self.render_timing_graph(),
            self.render_qualia_inspector()
        )
    }

    /// # Responsibility
    /// Toggles debug overlay visibility.
    pub fn toggle(&self) {
        let current = self.enabled_reader.get();
        self.enabled_signal.set(!current);
        debug!("Debug overlay toggled: {}", !current);
    }

    /// # Responsibility
    /// Enables debug overlay.
    pub fn enable(&self) {
        self.enabled_signal.set(true);
        debug!("Debug overlay enabled");
    }

    /// # Responsibility
    /// Disables debug overlay.
    pub fn disable(&self) {
        self.enabled_signal.set(false);
        debug!("Debug overlay disabled");
    }

    /// # Responsibility
    /// Checks if debug overlay is enabled.
    #[must_use]
    pub fn is_enabled(&self) -> bool {
        self.enabled_reader.get()
    }
}

impl Default for DebugOverlayService {
    fn default() -> Self {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        Self::new(qualia_reader, 120).expect("Failed to create DebugOverlayService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_record_frame() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 120).unwrap();

        service.record_frame(1, 16.67); // 60 FPS
        service.record_frame(2, 33.33); // 30 FPS

        let history = service.timing_reader.get();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].frame_number, 1);
        assert_eq!(history[1].frame_number, 2);
    }

    #[test]
    fn test_average_fps() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 120).unwrap();

        service.record_frame(1, 16.67); // ~60 FPS
        service.record_frame(2, 16.67);
        service.record_frame(3, 16.67);

        let avg = service.get_average_fps();
        assert!((avg - 60.0).abs() < 1.0, "Average FPS should be ~60");
    }

    #[test]
    fn test_frame_time_stats() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 120).unwrap();

        service.record_frame(1, 10.0);
        service.record_frame(2, 20.0);
        service.record_frame(3, 30.0);

        let (min, max, avg) = service.get_frame_time_stats();
        assert_eq!(min, 10.0);
        assert_eq!(max, 30.0);
        assert_eq!(avg, 20.0);
    }

    #[test]
    fn test_max_history_limit() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 5).unwrap();

        for i in 1..=10 {
            service.record_frame(i, 16.67);
        }

        let history = service.timing_reader.get();
        assert_eq!(history.len(), 5, "Should not exceed max_history");
        assert_eq!(history[0].frame_number, 6);
        assert_eq!(history[4].frame_number, 10);
    }

    #[test]
    fn test_toggle() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 120).unwrap();

        let initial = service.is_enabled();
        service.toggle();
        assert_eq!(service.is_enabled(), !initial);
        
        service.toggle();
        assert_eq!(service.is_enabled(), initial);
    }

    #[test]
    fn test_enable_disable() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 120).unwrap();

        service.disable();
        assert!(!service.is_enabled());

        service.enable();
        assert!(service.is_enabled());
    }

    #[test]
    fn test_render_fps_counter() {
        let (qualia_reader, _) = create_signal(QualiaState::default());
        let service = DebugOverlayService::new(qualia_reader, 120).unwrap();

        service.record_frame(1, 16.67);

        let html = service.render_fps_counter();
        assert!(html.contains("FPS"));
        assert!(html.contains("60")); // ~60 FPS
    }
}

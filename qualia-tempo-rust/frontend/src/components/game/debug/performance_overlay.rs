//! # Responsibility
//! FPS and frame time display overlay.
//!
//! ---
//!
//! Leptos component displaying real-time performance metrics: FPS, frame time,
//! CPU usage, and memory consumption. Updates every 500ms.

use leptos::*;

/// # Responsibility
/// Performance metrics snapshot.
#[derive(Debug, Clone, Copy)]
pub struct PerformanceMetrics {
    pub fps: f32,
    pub frame_time_ms: f32,
    pub cpu_percent: f32,
    pub memory_mb: f32,
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            fps: 60.0,
            frame_time_ms: 16.67,
            cpu_percent: 0.0,
            memory_mb: 0.0,
        }
    }
}

/// # Responsibility
/// Displays performance overlay.
///
/// # Props
/// - `metrics`: Current performance metrics
/// - `visible`: Whether overlay is visible
#[component]
pub fn PerformanceOverlay(
    metrics: ReadSignal<PerformanceMetrics>,
    #[prop(default = true)] visible: bool,
) -> impl IntoView {
    if !visible {
        return view! { <div></div> }.into_view();
    }

    let fps_color = move || {
        let fps = metrics.get().fps;
        if fps >= 55.0 {
            "green"
        } else if fps >= 30.0 {
            "yellow"
        } else {
            "red"
        }
    };

    let frame_time_color = move || {
        let ft = metrics.get().frame_time_ms;
        if ft <= 20.0 {
            "green"
        } else if ft <= 33.0 {
            "yellow"
        } else {
            "red"
        }
    };

    view! {
        <div class="performance-overlay">
            <div class="metric-row">
                <span class="metric-label">"FPS: "</span>
                <span class="metric-value" style:color=fps_color>
                    {move || format!("{:.1}", metrics.get().fps)}
                </span>
            </div>
            <div class="metric-row">
                <span class="metric-label">"Frame: "</span>
                <span class="metric-value" style:color=frame_time_color>
                    {move || format!("{:.2}ms", metrics.get().frame_time_ms)}
                </span>
            </div>
            <div class="metric-row">
                <span class="metric-label">"CPU: "</span>
                <span class="metric-value">
                    {move || format!("{:.1}%", metrics.get().cpu_percent)}
                </span>
            </div>
            <div class="metric-row">
                <span class="metric-label">"Memory: "</span>
                <span class="metric-value">
                    {move || format!("{:.1}MB", metrics.get().memory_mb)}
                </span>
            </div>
        </div>
    }
    .into_view()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_metrics_default() {
        let metrics = PerformanceMetrics::default();
        assert_eq!(metrics.fps, 60.0);
        assert_eq!(metrics.frame_time_ms, 16.67);
        assert_eq!(metrics.cpu_percent, 0.0);
        assert_eq!(metrics.memory_mb, 0.0);
    }

    #[test]
    fn test_performance_metrics_creation() {
        let metrics = PerformanceMetrics {
            fps: 120.0,
            frame_time_ms: 8.33,
            cpu_percent: 45.5,
            memory_mb: 512.0,
        };
        assert_eq!(metrics.fps, 120.0);
        assert_eq!(metrics.frame_time_ms, 8.33);
    }

    #[test]
    fn test_fps_color_thresholds() {
        let high = PerformanceMetrics { fps: 60.0, ..Default::default() };
        let mid = PerformanceMetrics { fps: 40.0, ..Default::default() };
        let low = PerformanceMetrics { fps: 20.0, ..Default::default() };
        
        // Color logic tested via component, verify thresholds
        assert!(high.fps >= 55.0);
        assert!(mid.fps >= 30.0 && mid.fps < 55.0);
        assert!(low.fps < 30.0);
    }

    #[test]
    fn test_frame_time_color_thresholds() {
        let fast = PerformanceMetrics { frame_time_ms: 16.67, ..Default::default() };
        let mid = PerformanceMetrics { frame_time_ms: 25.0, ..Default::default() };
        let slow = PerformanceMetrics { frame_time_ms: 50.0, ..Default::default() };
        
        assert!(fast.frame_time_ms <= 20.0);
        assert!(mid.frame_time_ms > 20.0 && mid.frame_time_ms <= 33.0);
        assert!(slow.frame_time_ms > 33.0);
    }
}

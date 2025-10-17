//! # Responsibility
//! Visual intensity level indicator with dynamic wave animation.
//!
//! ---
//!
//! Leptos component that displays the player's intensity value as
//! animated waves or bars. Intensity represents action energy and aggression.

use leptos::*;

/// # Responsibility
/// Displays intensity as animated visual indicator.
///
/// # Props
/// - `intensity`: Current intensity value (0.0 - 1.0)
/// - `style`: Display style (Waves, Bars, or Pulse)
/// - `bar_count`: Number of bars for Bars style (default: 10)
#[component]
pub fn IntensityIndicator(
    intensity: ReadSignal<f32>,
    #[prop(default = IntensityStyle::Waves)] style: IntensityStyle,
    #[prop(default = 10)] bar_count: usize,
) -> impl IntoView {
    match style {
        IntensityStyle::Waves => render_waves(intensity),
        IntensityStyle::Bars => render_bars(intensity, bar_count),
        IntensityStyle::Pulse => render_pulse(intensity),
    }
}

/// # Responsibility
/// Renders intensity as animated sine waves.
fn render_waves(intensity: ReadSignal<f32>) -> impl IntoView {
    let wave_style = move || {
        let i = intensity.get().clamp(0.0, 1.0);
        let freq = 1.0 + i * 3.0; // 1-4 Hz
        let amplitude = 10.0 + i * 40.0; // 10-50px
        let color = calculate_intensity_color(i);
        
        format!(
            "animation: wave {}s infinite ease-in-out; --amplitude: {}px; color: {};",
            1.0 / freq, amplitude, color
        )
    };

    view! {
        <div class="intensity-indicator waves">
            <div class="wave-container" style=wave_style>
                <svg viewBox="0 0 100 50" preserveAspectRatio="none">
                    <path d="M0,25 Q25,10 50,25 T100,25" stroke="currentColor" fill="none" stroke-width="2"/>
                </svg>
            </div>
        </div>
    }
}

/// # Responsibility
/// Renders intensity as vertical bars (equalizer style).
fn render_bars(intensity: ReadSignal<f32>, bar_count: usize) -> impl IntoView {
    let bars: Vec<_> = (0..bar_count).collect();
    
    view! {
        <div class="intensity-indicator bars">
            {bars.into_iter().map(|idx| {
                let bar_style = move || {
                    let i = intensity.get().clamp(0.0, 1.0);
                    let threshold = (idx as f32) / (bar_count as f32);
                    let is_active = i >= threshold;
                    let height = if is_active {
                        50.0 + (i * 50.0)
                    } else {
                        10.0
                    };
                    let color = if is_active {
                        calculate_intensity_color(i)
                    } else {
                        "rgb(50, 50, 50)"
                    };
                    
                    format!(
                        "height: {}%; background-color: {}; transition: height 0.2s ease, background-color 0.3s ease;",
                        height, color
                    )
                };
                
                view! {
                    <div class="intensity-bar" style=bar_style></div>
                }
            }).collect_view()}
        </div>
    }
}

/// # Responsibility
/// Renders intensity as pulsing circle.
fn render_pulse(intensity: ReadSignal<f32>) -> impl IntoView {
    let pulse_style = move || {
        let i = intensity.get().clamp(0.0, 1.0);
        let scale = 1.0 + i * 0.5; // 1.0-1.5x
        let freq = 0.5 + i * 1.5; // 0.5-2 Hz
        let color = calculate_intensity_color(i);
        
        format!(
            "transform: scale({}); animation: pulse {}s infinite ease-in-out; background: radial-gradient(circle, {}, transparent);",
            scale, 1.0 / freq, color
        )
    };

    view! {
        <div class="intensity-indicator pulse">
            <div class="pulse-circle" style=pulse_style></div>
        </div>
    }
}

/// # Responsibility
/// Enumerates intensity display styles.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntensityStyle {
    /// Animated sine waves
    Waves,
    /// Vertical equalizer bars
    Bars,
    /// Pulsing circle
    Pulse,
}

/// # Responsibility
/// Calculates color based on intensity level.
///
/// # Color Progression
/// - 0.0-0.25: Blue (calm)
/// - 0.25-0.5: Cyan (building)
/// - 0.5-0.75: Yellow (intense)
/// - 0.75-1.0: Red (maximum)
fn calculate_intensity_color(intensity: f32) -> String {
    let i = intensity.clamp(0.0, 1.0);

    let (r, g, b) = if i < 0.25 {
        // Blue (calm)
        let t = i / 0.25;
        (0, (100.0 + t * 155.0) as u8, 255)
    } else if i < 0.5 {
        // Cyan (building)
        let t = (i - 0.25) / 0.25;
        (0, 255, (255.0 * (1.0 - t)) as u8)
    } else if i < 0.75 {
        // Yellow (intense)
        let t = (i - 0.5) / 0.25;
        ((255.0 * t) as u8, 255, 0)
    } else {
        // Red (maximum)
        let t = (i - 0.75) / 0.25;
        (255, (255.0 * (1.0 - t)) as u8, 0)
    };

    format!("rgb({}, {}, {})", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_intensity_color_calm() {
        let color = calculate_intensity_color(0.1);
        assert!(color.starts_with("rgb(0,"));
        assert!(color.contains(", 255)"));
    }

    #[test]
    fn test_intensity_color_building() {
        let color = calculate_intensity_color(0.4);
        assert!(color.starts_with("rgb(0, 255,"));
    }

    #[test]
    fn test_intensity_color_intense() {
        let color = calculate_intensity_color(0.6);
        assert!(color.contains(", 255, 0)"));
    }

    #[test]
    fn test_intensity_color_maximum() {
        let color = calculate_intensity_color(0.9);
        assert!(color.starts_with("rgb(255,"));
        assert!(color.contains(", 0)"));
    }

    #[test]
    fn test_intensity_color_boundary_0_25() {
        let color = calculate_intensity_color(0.25);
        assert!(color.starts_with("rgb(0, 255, 255)"));
    }

    #[test]
    fn test_intensity_color_boundary_0_5() {
        let color = calculate_intensity_color(0.5);
        assert!(color.starts_with("rgb(0, 255, 0)"));
    }

    #[test]
    fn test_intensity_color_boundary_0_75() {
        let color = calculate_intensity_color(0.75);
        assert!(color.starts_with("rgb(255, 255, 0)"));
    }

    #[test]
    fn test_intensity_color_max() {
        let color = calculate_intensity_color(1.0);
        assert_eq!(color, "rgb(255, 0, 0)");
    }

    #[test]
    fn test_intensity_color_clamps_below() {
        let color = calculate_intensity_color(-0.5);
        assert!(color.starts_with("rgb(0,"));
    }

    #[test]
    fn test_intensity_color_clamps_above() {
        let color = calculate_intensity_color(1.5);
        assert_eq!(color, "rgb(255, 0, 0)");
    }
}

//! # Responsibility
//! Transcendence level gauge (triggers Mandelbulb transformation at 0.9+).
//!
//! ---
//!
//! Leptos component that displays player transcendence level.
//! At 0.9+, player avatar morphs from Capsule to Mandelbulb SDF.

use leptos::*;

/// # Responsibility
/// Displays transcendence gauge with transformation indicator.
///
/// # Props
/// - `transcendence`: Current transcendence value (0.0 - 1.0)
/// - `threshold`: Transformation threshold (default: 0.9)
/// - `show_progress_text`: Whether to show numeric percentage
#[component]
pub fn TranscendenceGauge(
    transcendence: ReadSignal<f32>,
    #[prop(default = 0.9)] threshold: f32,
    #[prop(default = true)] show_progress_text: bool,
) -> impl IntoView {
    let percentage = move || (transcendence.get().clamp(0.0, 1.0) * 100.0);

    let is_transforming = move || transcendence.get() >= threshold;

    let fill_style = move || {
        let pct = percentage();
        let color = calculate_transcendence_color(transcendence.get(), threshold);
        let glow = if is_transforming() {
            "0 0 30px rgb(255, 0, 255), 0 0 60px rgb(255, 0, 255)"
        } else {
            "none"
        };
        
        format!(
            "width: {}%; background: {}; box-shadow: {}; transition: width 0.5s ease-out, background 1s ease;",
            pct, color, glow
        )
    };

    let threshold_marker_style = format!("left: {}%;", threshold * 100.0);

    let progress_text = move || {
        if show_progress_text {
            format!("{:.0}%", percentage())
        } else {
            String::new()
        }
    };

    view! {
        <div class="transcendence-gauge-container">
            <div class="transcendence-label">
                {move || if is_transforming() {
                    "⚡ TRANSCENDENT ⚡"
                } else {
                    "TRANSCENDENCE"
                }}
            </div>
            <div class="transcendence-gauge">
                <div class="gauge-background">
                    <div class="gauge-fill" style=fill_style></div>
                    <div class="threshold-marker" style=threshold_marker_style title="Transformation Threshold"></div>
                </div>
            </div>
            {move || if show_progress_text {
                view! {
                    <div class="transcendence-percentage">{progress_text}</div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
            {move || if is_transforming() {
                view! {
                    <div class="transformation-warning">
                        "🌀 MANDELBULB FORM ACTIVE 🌀"
                    </div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
        </div>
    }
}

/// # Responsibility
/// Calculates transcendence gauge color with fractal-like progression.
///
/// # Color Progression
/// - 0.0-0.3: Dark purple (dormant)
/// - 0.3-0.6: Purple-magenta (awakening)
/// - 0.6-0.9: Bright magenta (approaching)
/// - 0.9-1.0: White-gold (transcendent)
fn calculate_transcendence_color(transcendence: f32, threshold: f32) -> String {
    let t = transcendence.clamp(0.0, 1.0);

    if t >= threshold {
        // White-gold (transcendent)
        let intensity = ((t - threshold) / (1.0 - threshold)) * 0.5 + 0.5;
        format!(
            "linear-gradient(to right, rgb(255, 0, 255), rgb({}, {}, 255))",
            (255.0 * intensity) as u8,
            (215.0 * intensity) as u8
        )
    } else if t >= 0.6 {
        // Bright magenta (approaching)
        let factor = (t - 0.6) / (threshold - 0.6);
        format!(
            "linear-gradient(to right, rgb({}, 0, {}), rgb(255, 0, 255))",
            (200.0 + 55.0 * factor) as u8,
            (200.0 + 55.0 * factor) as u8
        )
    } else if t >= 0.3 {
        // Purple-magenta (awakening)
        let factor = (t - 0.3) / 0.3;
        format!(
            "linear-gradient(to right, rgb(75, 0, 130), rgb({}, 0, {}))",
            (75.0 + 125.0 * factor) as u8,
            (130.0 + 70.0 * factor) as u8
        )
    } else {
        // Dark purple (dormant)
        let factor = t / 0.3;
        format!(
            "linear-gradient(to right, rgb(25, 0, 50), rgb({}, 0, {}))",
            (25.0 + 50.0 * factor) as u8,
            (50.0 + 80.0 * factor) as u8
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transcendence_color_dormant() {
        let color = calculate_transcendence_color(0.1, 0.9);
        assert!(color.contains("rgb(25, 0, 50)"));
    }

    #[test]
    fn test_transcendence_color_awakening() {
        let color = calculate_transcendence_color(0.5, 0.9);
        assert!(color.contains("75, 0, 130"));
    }

    #[test]
    fn test_transcendence_color_approaching() {
        let color = calculate_transcendence_color(0.75, 0.9);
        assert!(color.contains("255, 0, 255"));
    }

    #[test]
    fn test_transcendence_color_transcendent() {
        let color = calculate_transcendence_color(0.95, 0.9);
        assert!(color.contains("255, 0, 255"));
        assert!(color.contains("255"));
    }

    #[test]
    fn test_transcendence_color_at_threshold() {
        let color = calculate_transcendence_color(0.9, 0.9);
        assert!(color.contains("255, 0, 255"));
    }

    #[test]
    fn test_transcendence_color_below_threshold() {
        let color_below = calculate_transcendence_color(0.89, 0.9);
        let color_at = calculate_transcendence_color(0.9, 0.9);
        assert_ne!(color_below, color_at);
    }

    #[test]
    fn test_transcendence_color_clamps_below() {
        let color = calculate_transcendence_color(-0.5, 0.9);
        assert!(color.contains("rgb(25, 0, 50)"));
    }

    #[test]
    fn test_transcendence_color_clamps_above() {
        let color = calculate_transcendence_color(1.5, 0.9);
        assert!(color.contains("255"));
    }

    #[test]
    fn test_transcendence_color_custom_threshold() {
        let color_below = calculate_transcendence_color(0.79, 0.8);
        let color_at = calculate_transcendence_color(0.8, 0.8);
        assert_ne!(color_below, color_at);
    }

    #[test]
    fn test_transcendence_color_boundary_0_3() {
        let color_below = calculate_transcendence_color(0.29, 0.9);
        let color_above = calculate_transcendence_color(0.31, 0.9);
        assert_ne!(color_below, color_above);
    }

    #[test]
    fn test_transcendence_color_boundary_0_6() {
        let color_below = calculate_transcendence_color(0.59, 0.9);
        let color_above = calculate_transcendence_color(0.61, 0.9);
        assert_ne!(color_below, color_above);
    }
}

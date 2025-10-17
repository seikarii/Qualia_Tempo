//! # Responsibility
//! Kairos accumulation gauge with visual fill indicator.
//!
//! ---
//!
//! Leptos component that displays the player's kairos meter (temporal mastery).
//! Kairos represents perfect timing and accumulates when actions sync with the beat.

use leptos::*;

/// # Responsibility
/// Displays kairos meter as a vertical or horizontal gauge.
///
/// # Props
/// - `kairos`: Current kairos value (0.0 - 1.0)
/// - `threshold`: Threshold for special effect activation (default: 0.8)
/// - `orientation`: Gauge orientation (Vertical or Horizontal)
#[component]
pub fn KairosMeter(
    kairos: ReadSignal<f32>,
    #[prop(default = 0.8)] threshold: f32,
    #[prop(default = KairosOrientation::Vertical)] orientation: KairosOrientation,
) -> impl IntoView {
    let percentage = move || (kairos.get().clamp(0.0, 1.0) * 100.0);

    let is_critical = move || kairos.get() >= threshold;

    let fill_style = move || {
        let pct = percentage();
        let color = calculate_kairos_color(kairos.get(), threshold);
        let glow = if is_critical() { "0 0 20px gold" } else { "none" };
        
        match orientation {
            KairosOrientation::Vertical => format!(
                "height: {}%; background: {}; box-shadow: {}; transition: height 0.3s ease-out, background 0.5s ease;",
                pct, color, glow
            ),
            KairosOrientation::Horizontal => format!(
                "width: {}%; background: {}; box-shadow: {}; transition: width 0.3s ease-out, background 0.5s ease;",
                pct, color, glow
            ),
        }
    };

    let container_class = match orientation {
        KairosOrientation::Vertical => "kairos-meter-container vertical",
        KairosOrientation::Horizontal => "kairos-meter-container horizontal",
    };

    let kairos_text = move || format!("{:.0}%", percentage());

    view! {
        <div class=container_class>
            <div class="kairos-label">"KAIROS"</div>
            <div class="kairos-gauge">
                <div class="kairos-fill" style=fill_style>
                    {move || if is_critical() {
                        view! {
                            <div class="kairos-critical-indicator">
                                "⚡"
                            </div>
                        }.into_view()
                    } else {
                        view! { <></> }.into_view()
                    }}
                </div>
            </div>
            <div class="kairos-percentage">{kairos_text}</div>
        </div>
    }
}

/// # Responsibility
/// Enumerates gauge orientation options.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KairosOrientation {
    /// Vertical gauge (bottom to top)
    Vertical,
    /// Horizontal gauge (left to right)
    Horizontal,
}

/// # Responsibility
/// Calculates kairos gauge color based on accumulation level.
///
/// # Color Progression
/// - 0.0-0.3: Blue (building)
/// - 0.3-0.6: Cyan (accumulating)
/// - 0.6-threshold: Yellow (approaching)
/// - threshold-1.0: Gold (critical/ready)
fn calculate_kairos_color(kairos: f32, threshold: f32) -> String {
    let k = kairos.clamp(0.0, 1.0);

    if k >= threshold {
        // Gold (critical)
        String::from("linear-gradient(to top, rgb(255, 215, 0), rgb(255, 255, 150))")
    } else if k >= 0.6 {
        // Yellow (approaching)
        let t = (k - 0.6) / (threshold - 0.6);
        format!(
            "linear-gradient(to top, rgb({}, {}, 0), rgb(255, 255, 150))",
            255,
            (215.0 + (40.0 * t)) as u8
        )
    } else if k >= 0.3 {
        // Cyan (accumulating)
        format!(
            "linear-gradient(to top, rgb(0, {}, 255), rgb(100, 255, 255))",
            (200.0 + (55.0 * ((k - 0.3) / 0.3))) as u8
        )
    } else {
        // Blue (building)
        format!(
            "linear-gradient(to top, rgb(0, 0, {}), rgb(50, 100, 255))",
            (150.0 + (105.0 * (k / 0.3))) as u8
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kairos_color_building() {
        let color = calculate_kairos_color(0.1, 0.8);
        assert!(color.contains("rgb(0, 0,"));
    }

    #[test]
    fn test_kairos_color_accumulating() {
        let color = calculate_kairos_color(0.5, 0.8);
        assert!(color.contains("255)"));
    }

    #[test]
    fn test_kairos_color_approaching() {
        let color = calculate_kairos_color(0.7, 0.8);
        assert!(color.contains("255,"));
    }

    #[test]
    fn test_kairos_color_critical() {
        let color = calculate_kairos_color(0.9, 0.8);
        assert!(color.contains("255, 215, 0"));
    }

    #[test]
    fn test_kairos_color_at_threshold() {
        let color = calculate_kairos_color(0.8, 0.8);
        assert!(color.contains("255, 215, 0"));
    }

    #[test]
    fn test_kairos_color_clamps_below_zero() {
        let color = calculate_kairos_color(-0.5, 0.8);
        assert!(color.contains("rgb(0, 0,"));
    }

    #[test]
    fn test_kairos_color_clamps_above_one() {
        let color = calculate_kairos_color(1.5, 0.8);
        assert!(color.contains("255, 215, 0"));
    }

    #[test]
    fn test_kairos_color_boundary_0_3() {
        let color_below = calculate_kairos_color(0.29, 0.8);
        let color_above = calculate_kairos_color(0.31, 0.8);
        assert_ne!(color_below, color_above);
    }

    #[test]
    fn test_kairos_color_boundary_0_6() {
        let color_below = calculate_kairos_color(0.59, 0.8);
        let color_above = calculate_kairos_color(0.61, 0.8);
        assert_ne!(color_below, color_above);
    }

    #[test]
    fn test_kairos_color_custom_threshold() {
        let color_below = calculate_kairos_color(0.69, 0.7);
        let color_above = calculate_kairos_color(0.71, 0.7);
        assert_ne!(color_below, color_above);
    }
}

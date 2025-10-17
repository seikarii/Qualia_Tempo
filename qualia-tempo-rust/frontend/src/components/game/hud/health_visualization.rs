//! # Responsibility
//! Player and boss health bars with color-coded feedback.
//!
//! ---
//!
//! Leptos component that displays health bars for both player and boss entities.
//! Uses color gradients to indicate health status (green -> yellow -> red).

use leptos::*;

/// # Responsibility
/// Displays health bars for player and boss entities.
///
/// # Props
/// - `player_health`: Current player health (0.0 - 100.0)
/// - `player_max_health`: Maximum player health
/// - `boss_health`: Current boss health (0.0 - 100.0)
/// - `boss_max_health`: Maximum boss health
/// - `show_boss`: Whether to display boss health bar
#[component]
pub fn HealthVisualization(
    player_health: ReadSignal<f32>,
    player_max_health: ReadSignal<f32>,
    boss_health: ReadSignal<f32>,
    boss_max_health: ReadSignal<f32>,
    #[prop(default = true)] show_boss: bool,
) -> impl IntoView {
    let player_percentage = move || {
        let current = player_health.get().max(0.0);
        let max = player_max_health.get().max(1.0);
        ((current / max) * 100.0).clamp(0.0, 100.0)
    };

    let boss_percentage = move || {
        let current = boss_health.get().max(0.0);
        let max = boss_max_health.get().max(1.0);
        ((current / max) * 100.0).clamp(0.0, 100.0)
    };

    let player_bar_style = move || {
        let pct = player_percentage();
        let color = calculate_health_color(pct);
        format!("width: {}%; background-color: {}; transition: width 0.3s ease-out, background-color 0.5s ease;", pct, color)
    };

    let boss_bar_style = move || {
        let pct = boss_percentage();
        let color = calculate_health_color(pct);
        format!("width: {}%; background-color: {}; transition: width 0.3s ease-out, background-color 0.5s ease;", pct, color)
    };

    let player_text = move || format!("{:.0} / {:.0}", player_health.get(), player_max_health.get());
    let boss_text = move || format!("{:.0} / {:.0}", boss_health.get(), boss_max_health.get());

    view! {
        <div class="health-visualization-container">
            <div class="player-health-section">
                <div class="health-label">"PLAYER"</div>
                <div class="health-bar-container">
                    <div class="health-bar-background">
                        <div class="health-bar-fill" style=player_bar_style></div>
                    </div>
                    <div class="health-text">{player_text}</div>
                </div>
            </div>

            {move || if show_boss {
                view! {
                    <div class="boss-health-section">
                        <div class="health-label">"BOSS"</div>
                        <div class="health-bar-container">
                            <div class="health-bar-background">
                                <div class="health-bar-fill" style=boss_bar_style></div>
                            </div>
                            <div class="health-text">{boss_text}</div>
                        </div>
                    </div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
        </div>
    }
}

/// # Responsibility
/// Calculates health bar color based on percentage.
///
/// # Color Thresholds
/// - 75-100%: Green (healthy)
/// - 50-75%: Yellow-Green (caution)
/// - 25-50%: Yellow-Orange (warning)
/// - 10-25%: Orange-Red (danger)
/// - 0-10%: Red (critical)
pub fn calculate_health_color(percentage: f32) -> String {
    let pct = percentage.clamp(0.0, 100.0);

    let (r, g, b) = if pct >= 75.0 {
        // Green (healthy)
        let t = (pct - 75.0) / 25.0; // 0.0 - 1.0
        (0, (200.0 + t * 55.0) as u8, 0)
    } else if pct >= 50.0 {
        // Yellow-Green (caution)
        let t = (pct - 50.0) / 25.0; // 0.0 - 1.0
        ((255.0 * (1.0 - t)) as u8, 255, 0)
    } else if pct >= 25.0 {
        // Yellow-Orange (warning)
        let t = (pct - 25.0) / 25.0; // 0.0 - 1.0
        (255, (255.0 * t) as u8, 0)
    } else if pct >= 10.0 {
        // Orange-Red (danger)
        let t = (pct - 10.0) / 15.0; // 0.0 - 1.0
        (255, (165.0 * t) as u8, 0)
    } else {
        // Red (critical)
        (255, 0, 0)
    };

    format!("rgb({}, {}, {})", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_color_healthy() {
        let color = calculate_health_color(100.0);
        assert!(color.starts_with("rgb(0, 255"));
    }

    #[test]
    fn test_health_color_caution() {
        let color = calculate_health_color(60.0);
        assert!(color.contains("255, 0)"));
    }

    #[test]
    fn test_health_color_warning() {
        let color = calculate_health_color(40.0);
        assert!(color.starts_with("rgb(255,"));
    }

    #[test]
    fn test_health_color_danger() {
        let color = calculate_health_color(15.0);
        assert!(color.starts_with("rgb(255,"));
        assert!(color.contains(", 0)"));
    }

    #[test]
    fn test_health_color_critical() {
        let color = calculate_health_color(5.0);
        assert_eq!(color, "rgb(255, 0, 0)");
    }

    #[test]
    fn test_health_color_zero() {
        let color = calculate_health_color(0.0);
        assert_eq!(color, "rgb(255, 0, 0)");
    }

    #[test]
    fn test_health_color_clamps_above_100() {
        let color = calculate_health_color(150.0);
        assert!(color.starts_with("rgb(0, 255"));
    }

    #[test]
    fn test_health_color_clamps_below_0() {
        let color = calculate_health_color(-50.0);
        assert_eq!(color, "rgb(255, 0, 0)");
    }

    #[test]
    fn test_health_color_boundary_75() {
        let color = calculate_health_color(75.0);
        assert!(color.starts_with("rgb(0,"));
    }

    #[test]
    fn test_health_color_boundary_50() {
        let color = calculate_health_color(50.0);
        assert!(color.starts_with("rgb(255, 255"));
    }

    #[test]
    fn test_health_color_boundary_25() {
        let color = calculate_health_color(25.0);
        assert!(color.starts_with("rgb(255,"));
    }

    #[test]
    fn test_health_color_boundary_10() {
        let color = calculate_health_color(10.0);
        assert!(color.starts_with("rgb(255,"));
    }
}

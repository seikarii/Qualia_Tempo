//! # Responsibility
//! Combo counter with streak visual effects.
//!
//! ---
//!
//! Leptos component that displays the current combo count with
//! animated effects when combo increases. Includes "NEW RECORD!"
//! indicator when player breaks their personal best.

use leptos::*;

/// # Responsibility
/// Displays the current combo streak with visual feedback.
///
/// # Props
/// - `combo`: Reactive signal for current combo count
/// - `max_combo`: Reactive signal for session max combo (for "NEW RECORD!" indicator)
/// - `is_combo_active`: Whether combo is actively increasing (triggers animations)
#[component]
pub fn ComboStreak(
    combo: ReadSignal<u32>,
    max_combo: ReadSignal<u32>,
    #[prop(default = false)] is_combo_active: bool,
) -> impl IntoView {
    let combo_text = move || {
        let c = combo.get();
        if c > 0 {
            format!("{} COMBO", c)
        } else {
            String::from("NO COMBO")
        }
    };

    let combo_style = move || {
        let c = combo.get();
        let scale = calculate_combo_scale(c);
        let color = calculate_combo_color(c);
        let glow = calculate_combo_glow(c);
        
        format!(
            "transform: scale({}); color: {}; text-shadow: 0 0 {}px {}; transition: all 0.2s ease-out;",
            scale, color, glow, color
        )
    };

    let is_new_record = move || combo.get() > 0 && combo.get() >= max_combo.get();

    let streak_class = move || {
        if is_combo_active {
            "combo-streak active"
        } else {
            "combo-streak"
        }
    };

    view! {
        <div class=streak_class>
            <div class="combo-counter" style=combo_style>
                {combo_text}
            </div>
            {move || if is_new_record() {
                view! {
                    <div class="new-record-indicator">
                        "🔥 NEW RECORD! 🔥"
                    </div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
        </div>
    }
}

/// # Responsibility
/// Calculates scale factor based on combo count.
///
/// # Scale Tiers
/// - 0-9: 1.0x (base)
/// - 10-24: 1.2x (warming up)
/// - 25-49: 1.4x (hot)
/// - 50-99: 1.6x (intense)
/// - 100+: 1.8x (legendary)
fn calculate_combo_scale(combo: u32) -> f32 {
    match combo {
        0..=9 => 1.0,
        10..=24 => 1.2,
        25..=49 => 1.4,
        50..=99 => 1.6,
        _ => 1.8,
    }
}

/// # Responsibility
/// Calculates color based on combo tier.
///
/// # Color Progression
/// - 0-9: Gray (neutral)
/// - 10-24: White (active)
/// - 25-49: Yellow (hot)
/// - 50-99: Orange (intense)
/// - 100+: Red (legendary)
fn calculate_combo_color(combo: u32) -> &'static str {
    match combo {
        0 => "rgb(100, 100, 100)",
        1..=9 => "rgb(200, 200, 200)",
        10..=24 => "rgb(255, 255, 255)",
        25..=49 => "rgb(255, 255, 0)",
        50..=99 => "rgb(255, 165, 0)",
        _ => "rgb(255, 0, 0)",
    }
}

/// # Responsibility
/// Calculates glow intensity (text-shadow blur radius) based on combo.
fn calculate_combo_glow(combo: u32) -> u32 {
    match combo {
        0 => 0,
        1..=9 => 5,
        10..=24 => 10,
        25..=49 => 15,
        50..=99 => 20,
        _ => 30,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combo_scale_base() {
        assert_eq!(calculate_combo_scale(0), 1.0);
        assert_eq!(calculate_combo_scale(9), 1.0);
    }

    #[test]
    fn test_combo_scale_warming() {
        assert_eq!(calculate_combo_scale(10), 1.2);
        assert_eq!(calculate_combo_scale(24), 1.2);
    }

    #[test]
    fn test_combo_scale_hot() {
        assert_eq!(calculate_combo_scale(25), 1.4);
        assert_eq!(calculate_combo_scale(49), 1.4);
    }

    #[test]
    fn test_combo_scale_intense() {
        assert_eq!(calculate_combo_scale(50), 1.6);
        assert_eq!(calculate_combo_scale(99), 1.6);
    }

    #[test]
    fn test_combo_scale_legendary() {
        assert_eq!(calculate_combo_scale(100), 1.8);
        assert_eq!(calculate_combo_scale(500), 1.8);
    }

    #[test]
    fn test_combo_color_inactive() {
        assert_eq!(calculate_combo_color(0), "rgb(100, 100, 100)");
    }

    #[test]
    fn test_combo_color_active() {
        assert_eq!(calculate_combo_color(5), "rgb(200, 200, 200)");
        assert_eq!(calculate_combo_color(15), "rgb(255, 255, 255)");
    }

    #[test]
    fn test_combo_color_hot() {
        assert_eq!(calculate_combo_color(30), "rgb(255, 255, 0)");
    }

    #[test]
    fn test_combo_color_intense() {
        assert_eq!(calculate_combo_color(75), "rgb(255, 165, 0)");
    }

    #[test]
    fn test_combo_color_legendary() {
        assert_eq!(calculate_combo_color(150), "rgb(255, 0, 0)");
    }

    #[test]
    fn test_combo_glow_progression() {
        assert_eq!(calculate_combo_glow(0), 0);
        assert_eq!(calculate_combo_glow(5), 5);
        assert_eq!(calculate_combo_glow(15), 10);
        assert_eq!(calculate_combo_glow(35), 15);
        assert_eq!(calculate_combo_glow(75), 20);
        assert_eq!(calculate_combo_glow(200), 30);
    }
}

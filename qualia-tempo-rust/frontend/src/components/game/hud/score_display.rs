//! # Responsibility
//! Real-time score display with combo multiplier animation.
//!
//! ---
//!
//! Leptos component that displays the current score with animated
//! combo multiplier effects. Updates reactively from GameState signals.

use leptos::*;

/// # Responsibility
/// Displays the player's current score with combo multiplier.
///
/// # Props
/// - `score`: Reactive signal containing current score value
/// - `combo`: Reactive signal containing current combo count
/// - `multiplier`: Reactive signal containing combo multiplier (1.0 - 5.0)
#[component]
pub fn ScoreDisplay(
    score: ReadSignal<u64>,
    combo: ReadSignal<u32>,
    multiplier: ReadSignal<f32>,
    #[prop(default = false)] show_combo: bool,
) -> impl IntoView {
    let score_text = move || format_score(score.get());
    
    let multiplier_style = move || {
        let mult = multiplier.get();
        let scale = 1.0 + (mult - 1.0) * 0.2; // Scale up to 1.8x at max multiplier
        let color = calculate_multiplier_color(mult);
        format!(
            "transform: scale({}); color: {}; transition: all 0.3s ease-out;",
            scale, color
        )
    };

    let combo_text = move || {
        let c = combo.get();
        if c > 1 {
            format!("{}x", c)
        } else {
            String::new()
        }
    };

    view! {
        <div class="score-display-container">
            <div class="score-value">{score_text}</div>
            {move || if show_combo && combo.get() > 1 {
                view! {
                    <div class="combo-multiplier" style=multiplier_style>
                        {combo_text}
                    </div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
        </div>
    }
}

/// # Responsibility
/// Formats score with thousands separators (e.g., 1,234,567).
fn format_score(score: u64) -> String {
    let s = score.to_string();
    let mut result = String::new();
    let chars: Vec<char> = s.chars().collect();
    
    for (i, c) in chars.iter().enumerate() {
        if i > 0 && (chars.len() - i) % 3 == 0 {
            result.push(',');
        }
        result.push(*c);
    }
    
    result
}

/// # Responsibility
/// Calculates color gradient for multiplier display based on value.
///
/// # Color Scale
/// - 1.0x: White (neutral)
/// - 2.0x: Yellow (warming up)
/// - 3.0x: Orange (hot)
/// - 4.0x: Red (intense)
/// - 5.0x: Purple (transcendent)
fn calculate_multiplier_color(multiplier: f32) -> String {
    let mult = multiplier.clamp(1.0, 5.0);
    
    let (r, g, b) = if mult < 2.0 {
        // White -> Yellow
        let t = mult - 1.0; // 0.0 - 1.0
        (255, 255, (255.0 * (1.0 - t * 0.5)) as u8)
    } else if mult < 3.0 {
        // Yellow -> Orange
        let t = mult - 2.0; // 0.0 - 1.0
        (255, (255.0 * (1.0 - t * 0.35)) as u8, 0)
    } else if mult < 4.0 {
        // Orange -> Red
        let t = mult - 3.0; // 0.0 - 1.0
        (255, (165.0 * (1.0 - t)) as u8, 0)
    } else {
        // Red -> Purple
        let t = mult - 4.0; // 0.0 - 1.0
        (255, 0, (128.0 * t) as u8)
    };
    
    format!("rgb({}, {}, {})", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_score_single_digit() {
        assert_eq!(format_score(7), "7");
    }

    #[test]
    fn test_format_score_thousands() {
        assert_eq!(format_score(1_234), "1,234");
    }

    #[test]
    fn test_format_score_millions() {
        assert_eq!(format_score(1_234_567), "1,234,567");
    }

    #[test]
    fn test_format_score_zero() {
        assert_eq!(format_score(0), "0");
    }

    #[test]
    fn test_multiplier_color_neutral() {
        let color = calculate_multiplier_color(1.0);
        assert_eq!(color, "rgb(255, 255, 255)");
    }

    #[test]
    fn test_multiplier_color_yellow() {
        let color = calculate_multiplier_color(2.0);
        assert!(color.starts_with("rgb(255, 255,"));
    }

    #[test]
    fn test_multiplier_color_orange() {
        let color = calculate_multiplier_color(2.5);
        assert!(color.starts_with("rgb(255,"));
        assert!(color.contains(", 0)"));
    }

    #[test]
    fn test_multiplier_color_red() {
        let color = calculate_multiplier_color(4.0);
        assert_eq!(color, "rgb(255, 0, 0)");
    }

    #[test]
    fn test_multiplier_color_purple() {
        let color = calculate_multiplier_color(5.0);
        assert_eq!(color, "rgb(255, 0, 128)");
    }

    #[test]
    fn test_multiplier_color_clamps_below_range() {
        let color = calculate_multiplier_color(0.5);
        assert_eq!(color, "rgb(255, 255, 255)"); // Clamps to 1.0
    }

    #[test]
    fn test_multiplier_color_clamps_above_range() {
        let color = calculate_multiplier_color(10.0);
        assert_eq!(color, "rgb(255, 0, 128)"); // Clamps to 5.0
    }
}

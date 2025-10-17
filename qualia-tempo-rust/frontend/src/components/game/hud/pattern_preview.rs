//! # Responsibility
//! Upcoming boss attack pattern preview system.
//!
//! ---
//!
//! Leptos component that shows a hint of the next boss attack pattern.
//! Displays pattern type, timing window, and telegraph visual.

use leptos::*;

/// # Responsibility
/// Displays preview of upcoming boss attack pattern.
///
/// # Props
/// - `pattern_type`: Type of upcoming pattern
/// - `time_until_pattern`: Seconds until pattern activates
/// - `pattern_name`: Optional custom pattern name
/// - `difficulty`: Pattern difficulty (0.0-1.0)
#[component]
pub fn PatternPreview(
    pattern_type: ReadSignal<PatternType>,
    time_until_pattern: ReadSignal<f32>,
    #[prop(optional)] pattern_name: Option<ReadSignal<String>>,
    difficulty: ReadSignal<f32>,
) -> impl IntoView {
    let time_text = move || {
        let time = time_until_pattern.get();
        if time < 1.0 {
            "NOW!".to_string()
        } else {
            format!("{:.1}s", time)
        }
    };

    let pattern_name_display = move || {
        if let Some(name_signal) = pattern_name {
            name_signal.get()
        } else {
            get_default_pattern_name(pattern_type.get())
        }
    };

    let difficulty_color = move || {
        calculate_difficulty_color(difficulty.get())
    };

    let pattern_icon = move || {
        get_pattern_icon(pattern_type.get())
    };

    let is_imminent = move || time_until_pattern.get() < 2.0;

    let preview_class = move || {
        if is_imminent() {
            "pattern-preview imminent"
        } else {
            "pattern-preview"
        }
    };

    let difficulty_stars = move || {
        let diff = difficulty.get().clamp(0.0, 1.0);
        let star_count = (diff * 5.0).ceil() as usize;
        (0..5).map(move |i| {
            if i < star_count {
                "★"
            } else {
                "☆"
            }
        }).collect::<String>()
    };

    view! {
        <div class=preview_class>
            <div class="pattern-header">
                <div class="pattern-icon">{pattern_icon}</div>
                <div class="pattern-info">
                    <div class="pattern-name">{pattern_name_display}</div>
                    <div class="pattern-difficulty" style=move || format!("color: {}", difficulty_color())>
                        {difficulty_stars}
                    </div>
                </div>
            </div>
            <div class="pattern-timing">
                {"IN "} {time_text}
            </div>
            {move || if is_imminent() {
                view! {
                    <div class="pattern-warning">
                        "⚠ INCOMING ⚠"
                    </div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
        </div>
    }
}

/// # Responsibility
/// Enumerates boss attack pattern types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PatternType {
    /// Linear projectile wave
    Wave,
    /// Spiral projectiles
    Spiral,
    /// Area denial zones
    Cage,
    /// Fast dash attack
    Dash,
    /// Screen-wide pulse
    Pulse,
    /// Homing projectiles
    Homing,
    /// Rhythmic beat-synced attack
    Rhythm,
    /// Chaotic random pattern
    Chaos,
}

/// # Responsibility
/// Returns default pattern name for a given pattern type.
fn get_default_pattern_name(pattern: PatternType) -> String {
    match pattern {
        PatternType::Wave => String::from("WAVE ASSAULT"),
        PatternType::Spiral => String::from("SPIRAL VORTEX"),
        PatternType::Cage => String::from("CAGE TRAP"),
        PatternType::Dash => String::from("SHADOW DASH"),
        PatternType::Pulse => String::from("SONIC PULSE"),
        PatternType::Homing => String::from("SEEKING MISSILES"),
        PatternType::Rhythm => String::from("RHYTHM BARRAGE"),
        PatternType::Chaos => String::from("CHAOS STORM"),
    }
}

/// # Responsibility
/// Returns icon/emoji for pattern type.
fn get_pattern_icon(pattern: PatternType) -> &'static str {
    match pattern {
        PatternType::Wave => "〜",
        PatternType::Spiral => "🌀",
        PatternType::Cage => "⬚",
        PatternType::Dash => "→",
        PatternType::Pulse => "◉",
        PatternType::Homing => "🎯",
        PatternType::Rhythm => "♫",
        PatternType::Chaos => "✦",
    }
}

/// # Responsibility
/// Calculates color based on pattern difficulty.
///
/// # Color Scale
/// - 0.0-0.2: Green (easy)
/// - 0.2-0.4: Yellow (moderate)
/// - 0.4-0.6: Orange (hard)
/// - 0.6-0.8: Red (very hard)
/// - 0.8-1.0: Purple (extreme)
fn calculate_difficulty_color(difficulty: f32) -> String {
    let d = difficulty.clamp(0.0, 1.0);

    let (r, g, b) = if d < 0.2 {
        // Green (easy)
        (0, 255, 0)
    } else if d < 0.4 {
        // Yellow (moderate)
        (255, 255, 0)
    } else if d < 0.6 {
        // Orange (hard)
        (255, 165, 0)
    } else if d < 0.8 {
        // Red (very hard)
        (255, 50, 50)
    } else {
        // Purple (extreme)
        (200, 0, 255)
    };

    format!("rgb({}, {}, {})", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_names() {
        assert_eq!(get_default_pattern_name(PatternType::Wave), "WAVE ASSAULT");
        assert_eq!(get_default_pattern_name(PatternType::Spiral), "SPIRAL VORTEX");
        assert_eq!(get_default_pattern_name(PatternType::Cage), "CAGE TRAP");
        assert_eq!(get_default_pattern_name(PatternType::Dash), "SHADOW DASH");
        assert_eq!(get_default_pattern_name(PatternType::Pulse), "SONIC PULSE");
        assert_eq!(get_default_pattern_name(PatternType::Homing), "SEEKING MISSILES");
        assert_eq!(get_default_pattern_name(PatternType::Rhythm), "RHYTHM BARRAGE");
        assert_eq!(get_default_pattern_name(PatternType::Chaos), "CHAOS STORM");
    }

    #[test]
    fn test_pattern_icons() {
        assert_eq!(get_pattern_icon(PatternType::Wave), "〜");
        assert_eq!(get_pattern_icon(PatternType::Spiral), "🌀");
        assert_eq!(get_pattern_icon(PatternType::Cage), "⬚");
        assert_eq!(get_pattern_icon(PatternType::Dash), "→");
        assert_eq!(get_pattern_icon(PatternType::Pulse), "◉");
        assert_eq!(get_pattern_icon(PatternType::Homing), "🎯");
        assert_eq!(get_pattern_icon(PatternType::Rhythm), "♫");
        assert_eq!(get_pattern_icon(PatternType::Chaos), "✦");
    }

    #[test]
    fn test_difficulty_color_easy() {
        let color = calculate_difficulty_color(0.1);
        assert_eq!(color, "rgb(0, 255, 0)");
    }

    #[test]
    fn test_difficulty_color_moderate() {
        let color = calculate_difficulty_color(0.3);
        assert_eq!(color, "rgb(255, 255, 0)");
    }

    #[test]
    fn test_difficulty_color_hard() {
        let color = calculate_difficulty_color(0.5);
        assert_eq!(color, "rgb(255, 165, 0)");
    }

    #[test]
    fn test_difficulty_color_very_hard() {
        let color = calculate_difficulty_color(0.7);
        assert_eq!(color, "rgb(255, 50, 50)");
    }

    #[test]
    fn test_difficulty_color_extreme() {
        let color = calculate_difficulty_color(0.9);
        assert_eq!(color, "rgb(200, 0, 255)");
    }

    #[test]
    fn test_difficulty_color_clamps_below() {
        let color = calculate_difficulty_color(-0.5);
        assert_eq!(color, "rgb(0, 255, 0)");
    }

    #[test]
    fn test_difficulty_color_clamps_above() {
        let color = calculate_difficulty_color(1.5);
        assert_eq!(color, "rgb(200, 0, 255)");
    }

    #[test]
    fn test_difficulty_color_boundaries() {
        let c1 = calculate_difficulty_color(0.2);
        let c2 = calculate_difficulty_color(0.4);
        let c3 = calculate_difficulty_color(0.6);
        let c4 = calculate_difficulty_color(0.8);
        
        // Each tier should have different color
        assert_ne!(c1, c2);
        assert_ne!(c2, c3);
        assert_ne!(c3, c4);
    }
}

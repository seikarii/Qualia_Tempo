//! # Responsibility
//! Boss phase indicator with visual phase progression.
//!
//! ---
//!
//! Leptos component that displays the current boss phase and visual
//! indicators for phase transitions. Shows phase names and difficulty scaling.

use leptos::*;

/// # Responsibility
/// Displays current boss phase with progression indicators.
///
/// # Props
/// - `current_phase`: Current phase number (0-based)
/// - `total_phases`: Total number of phases
/// - `phase_name`: Optional custom name for current phase
/// - `show_next_phase`: Whether to show next phase preview
#[component]
pub fn BossPhaseIndicator(
    current_phase: ReadSignal<u8>,
    total_phases: ReadSignal<u8>,
    #[prop(optional)] phase_name: Option<ReadSignal<String>>,
    #[prop(default = false)] show_next_phase: bool,
) -> impl IntoView {
    let phase_display = move || {
        let current = current_phase.get();
        let total = total_phases.get();
        format!("PHASE {}/{}", current + 1, total)
    };

    let phase_name_display = move || {
        if let Some(name_signal) = phase_name {
            name_signal.get()
        } else {
            get_default_phase_name(current_phase.get())
        }
    };

    let phase_dots = move || {
        let current = current_phase.get();
        let total = total_phases.get();
        (0..total).map(move |i| {
            let is_active = i <= current;
            let is_current = i == current;
            let dot_class = if is_current {
                "phase-dot active current"
            } else if is_active {
                "phase-dot active"
            } else {
                "phase-dot inactive"
            };
            
            view! {
                <div class=dot_class></div>
            }
        }).collect_view()
    };

    let phase_color = move || {
        calculate_phase_color(current_phase.get(), total_phases.get())
    };

    let indicator_style = move || {
        let color = phase_color();
        format!("border-color: {}; box-shadow: 0 0 15px {};", color, color)
    };

    view! {
        <div class="boss-phase-indicator" style=indicator_style>
            <div class="phase-header">
                <div class="phase-number">{phase_display}</div>
                <div class="phase-name">{phase_name_display}</div>
            </div>
            <div class="phase-dots-container">
                {phase_dots}
            </div>
            {move || if show_next_phase && current_phase.get() + 1 < total_phases.get() {
                let next_name = get_default_phase_name(current_phase.get() + 1);
                view! {
                    <div class="next-phase-preview">
                        {"NEXT: "} {next_name}
                    </div>
                }.into_view()
            } else {
                view! { <></> }.into_view()
            }}
        </div>
    }
}

/// # Responsibility
/// Returns default phase name based on phase number.
fn get_default_phase_name(phase: u8) -> String {
    match phase {
        0 => String::from("AWAKENING"),
        1 => String::from("ESCALATION"),
        2 => String::from("CHAOS"),
        3 => String::from("FINALE"),
        _ => format!("PHASE {}", phase + 1),
    }
}

/// # Responsibility
/// Calculates color based on phase progression.
///
/// # Color Progression
/// - Phase 0: Blue (calm)
/// - Phase 1: Cyan (building)
/// - Phase 2: Yellow (intense)
/// - Phase 3+: Red (critical)
fn calculate_phase_color(current_phase: u8, total_phases: u8) -> String {
    if total_phases == 0 {
        return String::from("rgb(255, 255, 255)");
    }

    let ratio = (current_phase as f32) / ((total_phases - 1).max(1) as f32);

    let (r, g, b) = if ratio < 0.33 {
        // Blue -> Cyan
        let t = ratio / 0.33;
        (0, (150.0 + t * 105.0) as u8, 255)
    } else if ratio < 0.66 {
        // Cyan -> Yellow
        let t = (ratio - 0.33) / 0.33;
        ((255.0 * t) as u8, 255, (255.0 * (1.0 - t)) as u8)
    } else {
        // Yellow -> Red
        let t = (ratio - 0.66) / 0.34;
        (255, (255.0 * (1.0 - t)) as u8, 0)
    };

    format!("rgb({}, {}, {})", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_phase_names() {
        assert_eq!(get_default_phase_name(0), "AWAKENING");
        assert_eq!(get_default_phase_name(1), "ESCALATION");
        assert_eq!(get_default_phase_name(2), "CHAOS");
        assert_eq!(get_default_phase_name(3), "FINALE");
        assert_eq!(get_default_phase_name(4), "PHASE 5");
    }

    #[test]
    fn test_phase_color_first_phase() {
        let color = calculate_phase_color(0, 4);
        assert!(color.starts_with("rgb(0,"));
        assert!(color.contains("255)"));
    }

    #[test]
    fn test_phase_color_middle_phase() {
        let color = calculate_phase_color(1, 4);
        assert!(color.contains("255"));
    }

    #[test]
    fn test_phase_color_late_phase() {
        let color = calculate_phase_color(2, 4);
        assert!(color.contains("255,"));
    }

    #[test]
    fn test_phase_color_final_phase() {
        let color = calculate_phase_color(3, 4);
        assert!(color.starts_with("rgb(255,"));
        assert!(color.contains(", 0)"));
    }

    #[test]
    fn test_phase_color_single_phase() {
        let color = calculate_phase_color(0, 1);
        assert!(color.starts_with("rgb("));
    }

    #[test]
    fn test_phase_color_zero_total_phases() {
        let color = calculate_phase_color(0, 0);
        assert_eq!(color, "rgb(255, 255, 255)");
    }

    #[test]
    fn test_phase_color_progression() {
        let c0 = calculate_phase_color(0, 4);
        let c1 = calculate_phase_color(1, 4);
        let c2 = calculate_phase_color(2, 4);
        let c3 = calculate_phase_color(3, 4);
        
        // Each phase should have different color
        assert_ne!(c0, c1);
        assert_ne!(c1, c2);
        assert_ne!(c2, c3);
    }

    #[test]
    fn test_phase_color_two_phases() {
        let color_first = calculate_phase_color(0, 2);
        let color_last = calculate_phase_color(1, 2);
        assert_ne!(color_first, color_last);
    }
}

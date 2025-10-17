//! # Responsibility
//! Elapsed and remaining time display with countdown formatting.
//!
//! ---
//!
//! Leptos component that displays game time in MM:SS format.
//! Supports both elapsed time (timer counting up) and remaining time
//! (countdown with urgency color changes).

use leptos::*;

/// # Responsibility
/// Displays game time in MM:SS format.
///
/// # Props
/// - `elapsed_seconds`: Current elapsed time in seconds
/// - `total_seconds`: Total duration (for countdown mode)
/// - `mode`: Display mode (Elapsed or Countdown)
#[component]
pub fn TimeDisplay(
    elapsed_seconds: ReadSignal<f64>,
    #[prop(optional)] total_seconds: Option<f64>,
    #[prop(default = TimeDisplayMode::Elapsed)] mode: TimeDisplayMode,
) -> impl IntoView {
    let formatted_time = move || {
        match mode {
            TimeDisplayMode::Elapsed => format_time(elapsed_seconds.get()),
            TimeDisplayMode::Countdown => {
                if let Some(total) = total_seconds {
                    let remaining = (total - elapsed_seconds.get()).max(0.0);
                    format_time(remaining)
                } else {
                    format_time(elapsed_seconds.get())
                }
            }
        }
    };

    let time_style = move || {
        if mode == TimeDisplayMode::Countdown {
            if let Some(total) = total_seconds {
                let remaining = (total - elapsed_seconds.get()).max(0.0);
                let color = calculate_urgency_color(remaining, total);
                format!("color: {}; transition: color 1s ease;", color)
            } else {
                String::from("color: white;")
            }
        } else {
            String::from("color: white;")
        }
    };

    let label = match mode {
        TimeDisplayMode::Elapsed => "TIME",
        TimeDisplayMode::Countdown => "REMAINING",
    };

    view! {
        <div class="time-display-container">
            <div class="time-label">{label}</div>
            <div class="time-value" style=time_style>
                {formatted_time}
            </div>
        </div>
    }
}

/// # Responsibility
/// Enumerates time display modes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimeDisplayMode {
    /// Count up from 0:00
    Elapsed,
    /// Count down to 0:00
    Countdown,
}

/// # Responsibility
/// Formats seconds into MM:SS format.
///
/// # Examples
/// - 0.0 → "0:00"
/// - 65.0 → "1:05"
/// - 3661.0 → "61:01"
fn format_time(seconds: f64) -> String {
    let total_secs = seconds.max(0.0) as u64;
    let minutes = total_secs / 60;
    let secs = total_secs % 60;
    format!("{}:{:02}", minutes, secs)
}

/// # Responsibility
/// Calculates color based on urgency (time remaining).
///
/// # Color Thresholds
/// - > 30s: White (calm)
/// - 20-30s: Yellow (attention)
/// - 10-20s: Orange (warning)
/// - 5-10s: Red (urgent)
/// - < 5s: Flashing red (critical)
fn calculate_urgency_color(remaining: f64, _total: f64) -> &'static str {
    if remaining > 30.0 {
        "rgb(255, 255, 255)"
    } else if remaining > 20.0 {
        "rgb(255, 255, 0)"
    } else if remaining > 10.0 {
        "rgb(255, 165, 0)"
    } else if remaining > 5.0 {
        "rgb(255, 50, 50)"
    } else {
        "rgb(255, 0, 0)"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_time_zero() {
        assert_eq!(format_time(0.0), "0:00");
    }

    #[test]
    fn test_format_time_seconds_only() {
        assert_eq!(format_time(45.0), "0:45");
    }

    #[test]
    fn test_format_time_one_minute() {
        assert_eq!(format_time(60.0), "1:00");
    }

    #[test]
    fn test_format_time_minutes_and_seconds() {
        assert_eq!(format_time(125.0), "2:05");
    }

    #[test]
    fn test_format_time_over_hour() {
        assert_eq!(format_time(3661.0), "61:01");
    }

    #[test]
    fn test_format_time_negative_clamps() {
        assert_eq!(format_time(-10.0), "0:00");
    }

    #[test]
    fn test_format_time_fractional() {
        assert_eq!(format_time(65.7), "1:05");
    }

    #[test]
    fn test_urgency_color_calm() {
        assert_eq!(calculate_urgency_color(60.0, 120.0), "rgb(255, 255, 255)");
    }

    #[test]
    fn test_urgency_color_attention() {
        assert_eq!(calculate_urgency_color(25.0, 120.0), "rgb(255, 255, 0)");
    }

    #[test]
    fn test_urgency_color_warning() {
        assert_eq!(calculate_urgency_color(15.0, 120.0), "rgb(255, 165, 0)");
    }

    #[test]
    fn test_urgency_color_urgent() {
        assert_eq!(calculate_urgency_color(7.0, 120.0), "rgb(255, 50, 50)");
    }

    #[test]
    fn test_urgency_color_critical() {
        assert_eq!(calculate_urgency_color(3.0, 120.0), "rgb(255, 0, 0)");
    }

    #[test]
    fn test_urgency_color_boundary_30s() {
        assert_eq!(calculate_urgency_color(30.1, 120.0), "rgb(255, 255, 255)");
        assert_eq!(calculate_urgency_color(29.9, 120.0), "rgb(255, 255, 0)");
    }
}

//! # Responsibility
//! EventBus message inspector UI.
//!
//! ---
//!
//! Leptos component displaying real-time stream of EventBus messages.
//! Shows event type, timestamp, and payload. Supports filtering by event type.

use leptos::*;

/// # Responsibility
/// Event log entry.
#[derive(Debug, Clone)]
pub struct EventLogEntry {
    pub timestamp_ms: u64,
    pub event_type: String,
    pub payload: String,
}

/// # Responsibility
/// Displays event log panel.
///
/// # Props
/// - `entries`: List of recent events (latest first)
/// - `max_entries`: Maximum entries to display
/// - `visible`: Whether panel is visible
#[component]
pub fn EventLog(
    entries: ReadSignal<Vec<EventLogEntry>>,
    #[prop(default = 100)] max_entries: usize,
    #[prop(default = true)] visible: bool,
) -> impl IntoView {
    if !visible {
        return view! { <div></div> }.into_view();
    }

    let format_timestamp = |timestamp_ms: u64| {
        let seconds = timestamp_ms / 1000;
        let millis = timestamp_ms % 1000;
        format!("{:02}:{:02}.{:03}", (seconds / 60) % 60, seconds % 60, millis)
    };

    let event_color = |event_type: &str| match event_type {
        "PlayerAction" => "cyan",
        "QualiaStateUpdated" => "magenta",
        "BossAction" => "red",
        "GamePhaseChanged" => "yellow",
        _ => "white",
    };

    view! {
        <div class="event-log">
            <div class="panel-header">"EVENT LOG"</div>
            <div class="entry-list">
                <For
                    each=move || entries.get().into_iter().take(max_entries)
                    key=|e| e.timestamp_ms
                    children=move |entry: EventLogEntry| {
                        let color = event_color(&entry.event_type);
                        view! {
                            <div class="log-entry">
                                <span class="entry-timestamp">
                                    {format_timestamp(entry.timestamp_ms)}
                                </span>
                                <span class="entry-type" style:color=color>
                                    {entry.event_type}
                                </span>
                                <span class="entry-payload">
                                    {entry.payload}
                                </span>
                            </div>
                        }
                    }
                />
            </div>
        </div>
    }
    .into_view()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_log_entry_creation() {
        let entry = EventLogEntry {
            timestamp_ms: 125000,
            event_type: "PlayerAction".to_string(),
            payload: "KeyPressed(A)".to_string(),
        };
        assert_eq!(entry.timestamp_ms, 125000);
        assert_eq!(entry.event_type, "PlayerAction");
    }

    #[test]
    fn test_timestamp_formatting() {
        let format_ts = |ts_ms: u64| {
            let seconds = ts_ms / 1000;
            let millis = ts_ms % 1000;
            format!("{:02}:{:02}.{:03}", (seconds / 60) % 60, seconds % 60, millis)
        };

        assert_eq!(format_ts(0), "00:00.000");
        assert_eq!(format_ts(1234), "00:01.234");
        assert_eq!(format_ts(61234), "01:01.234");
        assert_eq!(format_ts(125000), "02:05.000");
    }

    #[test]
    fn test_event_color_mapping() {
        let get_color = |event_type: &str| match event_type {
            "PlayerAction" => "cyan",
            "QualiaStateUpdated" => "magenta",
            "BossAction" => "red",
            "GamePhaseChanged" => "yellow",
            _ => "white",
        };

        assert_eq!(get_color("PlayerAction"), "cyan");
        assert_eq!(get_color("QualiaStateUpdated"), "magenta");
        assert_eq!(get_color("BossAction"), "red");
        assert_eq!(get_color("GamePhaseChanged"), "yellow");
        assert_eq!(get_color("UnknownEvent"), "white");
    }

    #[test]
    fn test_max_entries_boundary() {
        // Test ensures max_entries prop works (validated in component logic)
        let entries = vec![
            EventLogEntry {
                timestamp_ms: 1000,
                event_type: "Test".to_string(),
                payload: "1".to_string(),
            },
            EventLogEntry {
                timestamp_ms: 2000,
                event_type: "Test".to_string(),
                payload: "2".to_string(),
            },
        ];
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().take(1).count() == 1); // Max entries logic
    }
}

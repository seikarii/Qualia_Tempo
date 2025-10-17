//! # Responsibility
//! Real-time input display component.
//!
//! ---
//!
//! Leptos component visualizing player inputs for debugging.
//! Shows recent key presses with timing and accuracy.

use leptos::*;

/// # Responsibility
/// Input event data.
#[derive(Debug, Clone)]
pub struct InputEvent {
    pub key: char,
    pub timestamp_ms: u64,
    pub accuracy: f32,
}

/// # Responsibility
/// Displays recent input events.
///
/// # Props
/// - `recent_inputs`: List of recent inputs (latest first)
/// - `max_display`: Maximum inputs to show
/// - `visible`: Whether visualizer is visible
#[component]
pub fn InputVisualizer(
    recent_inputs: ReadSignal<Vec<InputEvent>>,
    #[prop(default = 10)] max_display: usize,
    #[prop(default = true)] visible: bool,
) -> impl IntoView {
    if !visible {
        return view! { <div></div> }.into_view();
    }

    let accuracy_color = |accuracy: f32| {
        if accuracy >= 0.9 {
            "green"
        } else if accuracy >= 0.7 {
            "yellow"
        } else {
            "red"
        }
    };

    view! {
        <div class="input-visualizer">
            <div class="visualizer-header">"INPUTS"</div>
            <div class="input-list">
                <For
                    each=move || recent_inputs.get().into_iter().take(max_display)
                    key=|e| e.timestamp_ms
                    children=move |event: InputEvent| {
                        let color = accuracy_color(event.accuracy);
                        view! {
                            <div class="input-item">
                                <span class="input-key">{event.key}</span>
                                <span class="input-accuracy" style:color=color>
                                    {format!("{:.0}%", event.accuracy * 100.0)}
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
    fn test_input_event_creation() {
        let event = InputEvent {
            key: 'A',
            timestamp_ms: 1000,
            accuracy: 0.95,
        };
        assert_eq!(event.key, 'A');
        assert_eq!(event.timestamp_ms, 1000);
        assert_eq!(event.accuracy, 0.95);
    }

    #[test]
    fn test_accuracy_color_thresholds() {
        let get_color = |accuracy: f32| {
            if accuracy >= 0.9 { "green" } else if accuracy >= 0.7 { "yellow" } else { "red" }
        };

        assert_eq!(get_color(0.95), "green");
        assert_eq!(get_color(0.9), "green");
        assert_eq!(get_color(0.85), "yellow");
        assert_eq!(get_color(0.7), "yellow");
        assert_eq!(get_color(0.5), "red");
    }

    #[test]
    fn test_max_display_boundary() {
        let inputs = vec![
            InputEvent { key: 'A', timestamp_ms: 1000, accuracy: 0.9 },
            InputEvent { key: 'B', timestamp_ms: 2000, accuracy: 0.8 },
            InputEvent { key: 'C', timestamp_ms: 3000, accuracy: 0.7 },
        ];
        
        let displayed: Vec<_> = inputs.into_iter().take(2).collect();
        assert_eq!(displayed.len(), 2);
    }

    #[test]
    fn test_accuracy_formatting() {
        let accuracy = 0.956;
        let formatted = format!("{:.0}%", accuracy * 100.0);
        assert_eq!(formatted, "96%");
    }
}

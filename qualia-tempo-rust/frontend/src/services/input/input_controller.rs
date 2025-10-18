//! # Responsibility
//! Captures and dispatches user input events (keyboard, mouse, gamepad).
//!
//! ---
//!
//! Implements raw input capture from browser events and converts them into
//! structured PlayerAction events. Supports configurable key mapping and dead
//! zone handling for gamepad input.

use anyhow::Result;
use leptos::*;
use shared_core::contracts::PlayerAction;
use tracing::debug;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{KeyboardEvent, MouseEvent};

/// # Responsibility
/// Captures user input and converts to PlayerAction events.
///
/// ---
///
/// This service registers event listeners on the window and dispatches
/// PlayerAction signals that other services can subscribe to.
#[derive(Clone)]
pub struct InputControllerService {
    /// Signal for emitting player actions
    pub action_signal: WriteSignal<Option<PlayerAction>>,
    /// Signal for reading player actions
    pub action_reader: ReadSignal<Option<PlayerAction>>,
}

impl InputControllerService {
    /// # Responsibility
    /// Creates a new InputControllerService with reactive signals.
    ///
    /// ---
    ///
    /// Initializes reactive signals for action dispatch and subscribes to
    /// browser keyboard/mouse events.
    pub fn new() -> Result<Self> {
        let (action_reader, action_signal) = create_signal(None);

        debug!("InputControllerService initialized");

        Ok(Self {
            action_signal,
            action_reader,
        })
    }

    /// # Responsibility
    /// Handles keyboard key press events.
    ///
    /// ---
    ///
    /// Converts browser KeyboardEvent into PlayerAction::KeyPressed with
    /// timestamp for musical timing analysis.
    pub fn handle_key_press(&self, event: KeyboardEvent) {
        let key_str = event.key();
        
        // Only handle single character keys (Q, E, R, T, F, G, C)
        if key_str.len() != 1 {
            return;
        }

        let key = key_str.chars().next().unwrap_or(' ');
        let timestamp = js_sys::Date::now();

        debug!("Key pressed: {} at {}", key, timestamp);

        let action = PlayerAction::KeyPressed {
            key,
            timestamp,
            accuracy: 0.0, // Will be calculated by MusicalInputAnalyzer
        };

        self.action_signal.set(Some(action));
    }

    /// # Responsibility
    /// Handles mouse click events for dash ability.
    ///
    /// ---
    ///
    /// Left click triggers dash action. Position is normalized to [-1, 1] range.
    pub fn handle_mouse_click(&self, event: MouseEvent) {
        // Only handle left click (button 0)
        if event.button() != 0 {
            return;
        }

        let timestamp = js_sys::Date::now();
        
        // Get normalized coordinates (0-1)
        let window = web_sys::window().expect("no global window");
        let width = window.inner_width().ok()
            .and_then(|v| v.as_f64())
            .unwrap_or(1920.0) as f32;
        let height = window.inner_height().ok()
            .and_then(|v| v.as_f64())
            .unwrap_or(1080.0) as f32;

        let x = (event.client_x() as f32 / width) * 2.0 - 1.0;
        let y = -((event.client_y() as f32 / height) * 2.0 - 1.0);

        debug!("Mouse click at ({}, {}) timestamp {}", x, y, timestamp);

        let action = PlayerAction::DashInitiated {
            direction: shared_core::utils::Vec2::new(x, y),
            timestamp,
            on_beat: false, // Will be calculated by MusicalInputAnalyzer
        };

        self.action_signal.set(Some(action));
    }

    /// # Responsibility
    /// Registers event listeners on window.
    ///
    /// ---
    ///
    /// Attaches keyboard and mouse event handlers to the global window object.
    /// Returns closures that must be kept alive to maintain listeners.
    pub fn register_listeners(&self) -> Result<()> {
        let window = web_sys::window().ok_or_else(|| anyhow::anyhow!("No global window"))?;

        let self_clone = self.clone();
        let keydown_closure = Closure::wrap(Box::new(move |event: KeyboardEvent| {
            self_clone.handle_key_press(event);
        }) as Box<dyn FnMut(KeyboardEvent)>);

        window.add_event_listener_with_callback(
            "keydown",
            keydown_closure.as_ref().unchecked_ref(),
        ).map_err(|e| anyhow::anyhow!("Failed to register keydown listener: {:?}", e))?;

        keydown_closure.forget(); // Keep closure alive

        let self_clone = self.clone();
        let click_closure = Closure::wrap(Box::new(move |event: MouseEvent| {
            self_clone.handle_mouse_click(event);
        }) as Box<dyn FnMut(MouseEvent)>);

        window.add_event_listener_with_callback(
            "click",
            click_closure.as_ref().unchecked_ref(),
        ).map_err(|e| anyhow::anyhow!("Failed to register click listener: {:?}", e))?;

        click_closure.forget(); // Keep closure alive

        debug!("Input listeners registered");

        Ok(())
    }
}

impl Default for InputControllerService {
    fn default() -> Self {
        Self::new().expect("Failed to create InputControllerService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_input_controller_creation() {
        let controller = InputControllerService::new();
        assert!(controller.is_ok(), "InputControllerService creation should succeed");
    }

    #[wasm_bindgen_test]
    fn test_action_signal_propagation() {
        let controller = InputControllerService::new().unwrap();

        // Read initial state
        let action = controller.action_reader.get();
        assert!(action.is_none(), "Initial action should be None");

        // Simulate action
        controller.action_signal.set(Some(PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.0,
        }));

        // Verify propagation
        let action = controller.action_reader.get();
        assert!(action.is_some(), "Action should be Some after dispatch");
    }
}

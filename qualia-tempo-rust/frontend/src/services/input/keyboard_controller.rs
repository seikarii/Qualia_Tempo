//! # Responsibility
//! Captures raw keyboard events and converts them to game actions.
//!
//! ---
//!
//! Listens to browser keyboard events, prevents default behaviors,
//! and emits PlayerAction events through the EventBus.

use web_sys::{window, KeyboardEvent, EventTarget};
use wasm_bindgen::{JsCast, closure::Closure};
use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use shared_core::PlayerAction;
use crate::services::core::{ILogger, IEventBus};

/// # Responsibility
/// Configuration for keyboard input handling.
#[derive(Debug, Clone)]
pub struct KeyboardConfig {
    /// Whether to prevent default browser behavior for game keys
    pub prevent_defaults: bool,
    
    /// Whether to block key repeat events
    pub block_repeats: bool,
}

impl Default for KeyboardConfig {
    fn default() -> Self {
        Self {
            prevent_defaults: true,
            block_repeats: true,
        }
    }
}

/// # Responsibility
/// Maps keyboard keys to game actions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GameKey {
    /// Q - Musical note 1
    Q,
    /// E - Musical note 2
    E,
    /// R - Musical note 3
    R,
    /// T - Musical note 4
    T,
    /// F - Musical note 5
    F,
    /// G - Musical note 6
    G,
    /// C - Musical note 7
    C,
    /// Space - Dash ability
    Space,
}

impl GameKey {
    /// # Responsibility
    /// Converts a browser KeyboardEvent.code to a GameKey.
    pub fn from_code(code: &str) -> Option<Self> {
        match code {
            "KeyQ" => Some(Self::Q),
            "KeyE" => Some(Self::E),
            "KeyR" => Some(Self::R),
            "KeyT" => Some(Self::T),
            "KeyF" => Some(Self::F),
            "KeyG" => Some(Self::G),
            "KeyC" => Some(Self::C),
            "Space" => Some(Self::Space),
            _ => None,
        }
    }
    
    /// # Responsibility
    /// Gets the musical note index (0-6) for note keys.
    pub fn note_index(&self) -> Option<u8> {
        match self {
            Self::Q => Some(0),
            Self::E => Some(1),
            Self::R => Some(2),
            Self::T => Some(3),
            Self::F => Some(4),
            Self::G => Some(5),
            Self::C => Some(6),
            Self::Space => None,
        }
    }
    
    /// # Responsibility
    /// Checks if this key is a dash key (spacebar).
    pub fn is_dash(&self) -> bool {
        matches!(self, Self::Space)
    }
}

/// # Responsibility
/// Manages keyboard input capture and conversion to game actions.
pub struct KeyboardControllerService {
    config: KeyboardConfig,
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
    pressed_keys: Arc<Mutex<HashSet<GameKey>>>,
    _keydown_closure: Option<Closure<dyn FnMut(KeyboardEvent)>>,
    _keyup_closure: Option<Closure<dyn FnMut(KeyboardEvent)>>,
}

impl KeyboardControllerService {
    /// # Responsibility
    /// Creates new keyboard controller with configuration.
    pub fn new(
        config: KeyboardConfig,
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        Self {
            config,
            logger,
            event_bus,
            pressed_keys: Arc::new(Mutex::new(HashSet::new())),
            _keydown_closure: None,
            _keyup_closure: None,
        }
    }
    
    /// # Responsibility
    /// Starts listening to keyboard events.
    ///
    /// ---
    ///
    /// Attaches event listeners to window. Must be called after user interaction.
    pub fn start(&mut self) -> Result<(), String> {
        let window = window().ok_or_else(|| "No window found".to_string())?;
        let document = window.document().ok_or_else(|| "No document found".to_string())?;
        
        let target: EventTarget = document.into();
        
        // Create keydown handler
        let pressed_keys = self.pressed_keys.clone();
        let event_bus = self.event_bus.clone();
        let logger = self.logger.clone();
        let prevent_defaults = self.config.prevent_defaults;
        let block_repeats = self.config.block_repeats;
        
        let keydown_closure = Closure::wrap(Box::new(move |event: KeyboardEvent| {
            // Block repeat events if configured
            if block_repeats && event.repeat() {
                return;
            }
            
            // Parse game key
            let code = event.code();
            if let Some(game_key) = GameKey::from_code(&code) {
                // Prevent default browser behavior
                if prevent_defaults {
                    event.prevent_default();
                }
                
                // Check if already pressed (browser-level debouncing)
                let mut keys = pressed_keys.lock().unwrap();
                if keys.insert(game_key) {
                    // Key was not pressed before - this is a new press
                    drop(keys); // Release lock before emitting event
                    
                    let timestamp = js_sys::Date::now(); // milliseconds as f64
                    
                    // Emit appropriate action
                    let action = if game_key.is_dash() {
                        // Default dash direction (forward in 2D, normalized)
                        use shared_core::Vector3;
                        PlayerAction::Dash {
                            direction: Vector3::new(0.0, 0.0, 1.0), // Forward direction
                            timestamp,
                        }
                    } else {
                        // Musical key press (note_index is for internal use, accuracy filled later)
                        PlayerAction::KeyPressed {
                            key: code.chars().last().unwrap_or('?'),
                            timestamp,
                            accuracy: 0.0, // Will be calculated by RhythmValidator
                        }
                    };
                    
                    // Emit to EventBus
                    use shared_core::GameEvent;
                    let event = GameEvent::PlayerAction(Box::new(action));
                    if let Err(e) = event_bus.emit(event) {
                        logger.warn(&format!("Failed to emit PlayerAction: {:?}", e));
                    }
                }
            }
        }) as Box<dyn FnMut(KeyboardEvent)>);
        
        // Create keyup handler
        let pressed_keys = self.pressed_keys.clone();
        
        let keyup_closure = Closure::wrap(Box::new(move |event: KeyboardEvent| {
            let code = event.code();
            if let Some(game_key) = GameKey::from_code(&code) {
                // Mark key as released
                let mut keys = pressed_keys.lock().unwrap();
                keys.remove(&game_key);
            }
        }) as Box<dyn FnMut(KeyboardEvent)>);
        
        // Attach event listeners
        target.add_event_listener_with_callback(
            "keydown",
            keydown_closure.as_ref().unchecked_ref(),
        ).map_err(|e| format!("Failed to add keydown listener: {:?}", e))?;
        
        target.add_event_listener_with_callback(
            "keyup",
            keyup_closure.as_ref().unchecked_ref(),
        ).map_err(|e| format!("Failed to add keyup listener: {:?}", e))?;
        
        // Store closures to keep them alive
        self._keydown_closure = Some(keydown_closure);
        self._keyup_closure = Some(keyup_closure);
        
        self.logger.info("Keyboard controller started");
        Ok(())
    }
    
    /// # Responsibility
    /// Checks if a key is currently pressed.
    pub fn is_key_pressed(&self, key: GameKey) -> bool {
        self.pressed_keys.lock().unwrap().contains(&key)
    }
    
    /// # Responsibility
    /// Gets all currently pressed keys.
    pub fn get_pressed_keys(&self) -> Vec<GameKey> {
        self.pressed_keys.lock().unwrap().iter().copied().collect()
    }
}

impl Drop for KeyboardControllerService {
    fn drop(&mut self) {
        // Closures are automatically removed when dropped
        self.logger.info("Keyboard controller stopped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_game_key_from_code() {
        assert_eq!(GameKey::from_code("KeyQ"), Some(GameKey::Q));
        assert_eq!(GameKey::from_code("KeyE"), Some(GameKey::E));
        assert_eq!(GameKey::from_code("Space"), Some(GameKey::Space));
        assert_eq!(GameKey::from_code("KeyZ"), None);
    }
    
    #[test]
    fn test_game_key_note_index() {
        assert_eq!(GameKey::Q.note_index(), Some(0));
        assert_eq!(GameKey::E.note_index(), Some(1));
        assert_eq!(GameKey::C.note_index(), Some(6));
        assert_eq!(GameKey::Space.note_index(), None);
    }
    
    #[test]
    fn test_game_key_is_dash() {
        assert!(!GameKey::Q.is_dash());
        assert!(!GameKey::E.is_dash());
        assert!(GameKey::Space.is_dash());
    }
    
    #[test]
    fn test_keyboard_config_defaults() {
        let config = KeyboardConfig::default();
        assert!(config.prevent_defaults);
        assert!(config.block_repeats);
    }
}

//! # Responsibility
//! Web Worker for real-time QualiaState calculation (ARCHITECTURE.RUST §3.1, BLUEPRINT.RUST #45).
//!
//! ---
//!
//! CRITICAL: This is where QualiaState is CALCULATED in real-time for instant visual feedback.
//! The backend VALIDATES this calculation, but the frontend must not wait for network latency.
//! This worker runs in a separate thread, keeping the main thread responsive for 60+ FPS rendering.

use shared_core::contracts::*;
use wasm_bindgen::prelude::*;
use serde_wasm_bindgen;

/// # Responsibility
/// Calculates QualiaState from PlayerAction in a Web Worker (non-blocking).
///
/// ---
///
/// This struct is exposed to JavaScript via wasm_bindgen and runs in a dedicated
/// Web Worker thread. It receives PlayerAction via postMessage and returns calculated
/// QualiaState without blocking the main rendering thread.
#[wasm_bindgen]
pub struct QualiaCalculatorWorker {
    config: QualiaConfig,
}

impl Default for QualiaCalculatorWorker {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl QualiaCalculatorWorker {
    /// Create a new worker instance
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        
        Self {
            config: QualiaConfig::default(),
        }
    }
    
    /// Calculate QualiaState from player action (called from main thread via postMessage)
    ///
    /// # Arguments
    /// * `action` - JsValue containing serialized PlayerAction
    ///
    /// # Returns
    /// * `Result<JsValue, JsValue>` - Serialized QualiaState or error
    pub fn calculate(&self, action: JsValue) -> Result<JsValue, JsValue> {
        let action: PlayerAction = serde_wasm_bindgen::from_value(action)
            .map_err(|e| JsValue::from_str(&format!("Failed to deserialize action: {}", e)))?;
        
        let state = match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                self.calculate_from_accuracy(accuracy)
            }
            PlayerAction::DashInitiated { on_beat, .. } => {
                self.apply_dash_bonus(on_beat)
            }
            PlayerAction::ParryAttempted { .. } => {
                self.apply_parry_action()
            }
            PlayerAction::UltimateActivated { .. } => {
                self.apply_ultimate_activation()
            }
            PlayerAction::MouseMoved { .. } => {
                // Movement doesn't affect qualia, return neutral state
                self.apply_neutral_state()
            }
        };
        
        serde_wasm_bindgen::to_value(&state)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize state: {}", e)))
    }
    
    /// Calculate state from key press accuracy
    fn calculate_from_accuracy(&self, accuracy: f32) -> QualiaState {
        let intensity = accuracy * self.config.base_multiplier;
        
        QualiaState {
            intensity: intensity.clamp(0.0, 1.0),
            precision: accuracy.clamp(0.0, 1.0),
            aggression: 0.0,
            flow: (accuracy * 0.8).clamp(0.0, 1.0),
            chaos: ((1.0 - accuracy) * 0.5).clamp(0.0, 1.0),
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: Self::get_current_time() + 1000.0,
        }
    }
    
    /// Apply dash action bonus
    fn apply_dash_bonus(&self, on_beat: bool) -> QualiaState {
        let bonus: f32 = if on_beat { 0.2 } else { 0.0 };
        
        QualiaState {
            intensity: (0.8_f32 + bonus).clamp(0.0, 1.0),
            precision: 0.6,
            aggression: 0.9,
            flow: (0.7_f32 + bonus).clamp(0.0, 1.0),
            chaos: 0.2,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: Self::get_current_time() + 1000.0,
        }
    }
    
    /// Apply parry action
    fn apply_parry_action(&self) -> QualiaState {
        QualiaState {
            intensity: 0.7,
            precision: 0.9,
            aggression: 0.5,
            flow: 0.6,
            chaos: 0.1,
            recovery: 0.8,
            transcendence: 0.0,
            collection_window_end: Self::get_current_time() + 1000.0,
        }
    }
    
    /// Apply ultimate activation
    fn apply_ultimate_activation(&self) -> QualiaState {
        QualiaState {
            intensity: 1.0,
            precision: 0.8,
            aggression: 1.0,
            flow: 0.9,
            chaos: 0.0,
            recovery: 0.0,
            transcendence: 1.0,
            collection_window_end: Self::get_current_time() + 1000.0,
        }
    }
    
    /// Apply neutral state (no action)
    fn apply_neutral_state(&self) -> QualiaState {
        QualiaState {
            intensity: 0.3,
            precision: 0.5,
            aggression: 0.0,
            flow: 0.5,
            chaos: 0.3,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: Self::get_current_time() + 1000.0,
        }
    }
    
    /// Get current time - uses js_sys in WASM, mock in tests
    #[cfg(not(test))]
    fn get_current_time() -> f64 {
        js_sys::Date::now()
    }
    
    #[cfg(test)]
    fn get_current_time() -> f64 {
        1000.0 // Mock time for tests
    }
}

/// # Responsibility
/// Configuration for qualia calculation parameters.
#[derive(Clone)]
struct QualiaConfig {
    base_multiplier: f32,
}

impl Default for QualiaConfig {
    fn default() -> Self {
        Self {
            base_multiplier: 1.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_qualia_calculator_creation() {
        let worker = QualiaCalculatorWorker::new();
        assert_eq!(worker.config.base_multiplier, 1.0);
    }

    #[test]
    fn test_calculate_from_accuracy_high() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.calculate_from_accuracy(0.95);
        
        assert!(state.intensity > 0.9);
        assert_eq!(state.precision, 0.95);
        assert!(state.flow > 0.7);
        assert!(state.chaos < 0.1);
    }

    #[test]
    fn test_calculate_from_accuracy_low() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.calculate_from_accuracy(0.2);
        
        assert!(state.intensity < 0.3);
        assert_eq!(state.precision, 0.2);
        assert!(state.chaos > 0.3);
    }

    #[test]
    fn test_dash_bonus_on_beat() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.apply_dash_bonus(true);
        
        assert_eq!(state.aggression, 0.9);
        assert_eq!(state.intensity, 1.0); // 0.8 + 0.2 bonus
    }

    #[test]
    fn test_dash_bonus_off_beat() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.apply_dash_bonus(false);
        
        assert_eq!(state.aggression, 0.9);
        assert_eq!(state.intensity, 0.8); // No bonus
    }

    #[test]
    fn test_parry_action() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.apply_parry_action();
        
        assert_eq!(state.recovery, 0.8);
        assert_eq!(state.chaos, 0.1);
    }

    #[test]
    fn test_ultimate_activation() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.apply_ultimate_activation();
        
        assert_eq!(state.transcendence, 1.0);
        assert_eq!(state.intensity, 1.0);
    }

    #[test]
    fn test_values_clamped_to_range() {
        let worker = QualiaCalculatorWorker::new();
        let state = worker.calculate_from_accuracy(1.5); // Invalid input
        
        // All values must be in [0.0, 1.0]
        assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
        assert!(state.precision >= 0.0 && state.precision <= 1.0);
        assert!(state.aggression >= 0.0 && state.aggression <= 1.0);
        assert!(state.flow >= 0.0 && state.flow <= 1.0);
        assert!(state.chaos >= 0.0 && state.chaos <= 1.0);
        assert!(state.recovery >= 0.0 && state.recovery <= 1.0);
        assert!(state.transcendence >= 0.0 && state.transcendence <= 1.0);
    }
}
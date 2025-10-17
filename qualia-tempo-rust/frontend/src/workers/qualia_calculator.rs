//! # Responsibility
//! Web Worker for offloading CPU-intensive QualiaState calculations.
//!
//! ---
//!
//! Runs in a dedicated Web Worker thread to prevent main thread blocking.
//! Receives PlayerAction messages via postMessage, computes new QualiaState, and sends back results.
//! Uses wasm-bindgen for JavaScript interop and bincode for efficient serialization.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use shared_core::contracts::{QualiaState, PlayerAction};
use wasm_bindgen::prelude::*;
use web_sys::{DedicatedWorkerGlobalScope, MessageEvent};

/// # Responsibility
/// Configuration for QualiaState calculation algorithm.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QualiaCalculatorConfig {
    /// Decay rate per second for time-based attenuation
    pub decay_rate: f32,
    /// Multiplier for intensity calculation from accuracy
    pub intensity_multiplier: f32,
    /// Multiplier for harmony calculation
    pub harmony_multiplier: f32,
    /// Multiplier for chaos calculation
    pub chaos_multiplier: f32,
    /// Multiplier for kairos calculation
    pub kairos_multiplier: f32,
}

impl Default for QualiaCalculatorConfig {
    fn default() -> Self {
        Self {
            decay_rate: 0.1,          // 10% decay per second
            intensity_multiplier: 1.2,
            harmony_multiplier: 1.0,
            chaos_multiplier: 0.8,
            kairos_multiplier: 1.5,
        }
    }
}

/// # Responsibility
/// Worker message types (postMessage protocol).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkerMessage {
    /// Initialize worker with configuration
    Init { config: QualiaCalculatorConfig },
    /// Process player action
    ProcessAction { action: PlayerAction },
    /// Apply time-based decay
    ApplyDecay { delta_time: f32 },
    /// Get current state
    GetState,
    /// Reset state to initial
    Reset,
}

/// # Responsibility
/// Worker response types (postMessage back to main thread).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkerResponse {
    /// Initialization complete
    Ready,
    /// Updated QualiaState
    StateUpdated { state: QualiaState },
    /// Error occurred
    Error { message: String },
}

/// # Responsibility
/// Core calculation logic for QualiaState (stateful, pure functions).
///
/// ---
///
/// Design Philosophy:
/// - Stateful but pure (no side effects except internal state)
/// - All inputs/outputs are plain structs
/// - No async operations
/// - Deterministic calculations
pub struct QualiaCalculatorCore {
    config: QualiaCalculatorConfig,
    current_state: QualiaState,
    calculations_performed: u32,
    total_calculation_time_ms: f32,
}

impl QualiaCalculatorCore {
    /// Creates a new calculator core with the given configuration.
    pub fn new(config: QualiaCalculatorConfig) -> Self {
        Self {
            config,
            current_state: Self::create_initial_state(),
            calculations_performed: 0,
            total_calculation_time_ms: 0.0,
        }
    }

    /// Returns a copy of the current QualiaState.
    pub fn get_current_state(&self) -> QualiaState {
        self.current_state.clone()
    }

    /// Processes a player action and updates state.
    pub fn process_player_action(&mut self, action: PlayerAction) -> QualiaState {
        let start = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);

        // Update state based on action type
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                self.on_note_hit(accuracy);
            }
            PlayerAction::DashActivated { .. } => {
                self.on_dash();
            }
            PlayerAction::FastForward { .. } => {
                self.on_fast_forward();
            }
            PlayerAction::Rewind { .. } => {
                self.on_rewind();
            }
            PlayerAction::NoteMissed => {
                self.on_note_miss();
            }
        }

        // Track performance
        if let Some(end) = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
        {
            self.calculations_performed += 1;
            self.total_calculation_time_ms += (end - start) as f32;
        }

        self.current_state.clone()
    }

    /// Applies time-based decay to the state.
    pub fn apply_time_decay(&mut self, delta_time: f32) -> QualiaState {
        // Decay all values toward 0.5 (neutral state)
        self.current_state.intensity = self.lerp_toward_neutral(
            self.current_state.intensity,
            self.config.decay_rate * delta_time,
        );
        self.current_state.harmony = self.lerp_toward_neutral(
            self.current_state.harmony,
            self.config.decay_rate * delta_time,
        );
        self.current_state.chaos = self.lerp_toward_neutral(
            self.current_state.chaos,
            self.config.decay_rate * delta_time,
        );
        self.current_state.kairos = self.lerp_toward_neutral(
            self.current_state.kairos,
            self.config.decay_rate * delta_time,
        );

        self.current_state.clone()
    }

    /// Resets state to initial values.
    pub fn reset(&mut self) -> QualiaState {
        self.current_state = Self::create_initial_state();
        self.calculations_performed = 0;
        self.total_calculation_time_ms = 0.0;
        self.current_state.clone()
    }

    /// Returns calculation statistics.
    pub fn get_stats(&self) -> (u32, f32) {
        let avg_time = if self.calculations_performed > 0 {
            self.total_calculation_time_ms / self.calculations_performed as f32
        } else {
            0.0
        };
        (self.calculations_performed, avg_time)
    }

    // ==================== PRIVATE CALCULATION METHODS ====================

    fn create_initial_state() -> QualiaState {
        QualiaState {
            intensity: 0.5,
            harmony: 0.5,
            chaos: 0.5,
            kairos: 0.5,
        }
    }

    fn on_note_hit(&mut self, accuracy: f32) {
        // Accuracy in [0, 1] range
        self.current_state.intensity = self.clamp(
            self.current_state.intensity + accuracy * self.config.intensity_multiplier * 0.1,
        );
        self.current_state.harmony = self.clamp(
            self.current_state.harmony + accuracy * self.config.harmony_multiplier * 0.05,
        );
        self.current_state.chaos = self.clamp(
            self.current_state.chaos - accuracy * self.config.chaos_multiplier * 0.02,
        );
    }

    fn on_note_miss(&mut self) {
        self.current_state.harmony = self.clamp(self.current_state.harmony - 0.1);
        self.current_state.chaos = self.clamp(self.current_state.chaos + 0.15);
    }

    fn on_dash(&mut self) {
        self.current_state.intensity = self.clamp(self.current_state.intensity + 0.2);
        self.current_state.chaos = self.clamp(self.current_state.chaos + 0.1);
    }

    fn on_fast_forward(&mut self) {
        self.current_state.kairos = self.clamp(
            self.current_state.kairos + self.config.kairos_multiplier * 0.1,
        );
    }

    fn on_rewind(&mut self) {
        self.current_state.kairos = self.clamp(
            self.current_state.kairos - self.config.kairos_multiplier * 0.1,
        );
    }

    fn clamp(&self, value: f32) -> f32 {
        value.clamp(0.0, 1.0)
    }

    fn lerp_toward_neutral(&self, value: f32, decay_factor: f32) -> f32 {
        let neutral = 0.5;
        let new_value = value + (neutral - value) * decay_factor;
        self.clamp(new_value)
    }
}

/// # Responsibility
/// Web Worker entry point (WASM export).
///
/// ---
///
/// This function is called when the worker is instantiated.
/// Sets up message listener for postMessage communication.
#[wasm_bindgen]
pub fn start_qualia_worker() -> Result<(), JsValue> {
    // Set up panic hook for better error messages in console
    console_error_panic_hook::set_once();

    // Get worker global scope
    let global = js_sys::global().dyn_into::<DedicatedWorkerGlobalScope>()?;

    // Create calculator core (will be initialized via Init message)
    let mut core: Option<QualiaCalculatorCore> = None;

    // Set up message listener
    let onmessage = Closure::wrap(Box::new(move |event: MessageEvent| {
        // Parse message
        let data = event.data();
        let message: WorkerMessage = match serde_wasm_bindgen::from_value(data) {
            Ok(msg) => msg,
            Err(e) => {
                let response = WorkerResponse::Error {
                    message: format!("Failed to parse message: {:?}", e),
                };
                let _ = post_response(&global, &response);
                return;
            }
        };

        // Handle message
        let response = match message {
            WorkerMessage::Init { config } => {
                core = Some(QualiaCalculatorCore::new(config));
                WorkerResponse::Ready
            }
            WorkerMessage::ProcessAction { action } => {
                if let Some(ref mut c) = core {
                    let state = c.process_player_action(action);
                    WorkerResponse::StateUpdated { state }
                } else {
                    WorkerResponse::Error {
                        message: "Core not initialized".to_string(),
                    }
                }
            }
            WorkerMessage::ApplyDecay { delta_time } => {
                if let Some(ref mut c) = core {
                    let state = c.apply_time_decay(delta_time);
                    WorkerResponse::StateUpdated { state }
                } else {
                    WorkerResponse::Error {
                        message: "Core not initialized".to_string(),
                    }
                }
            }
            WorkerMessage::GetState => {
                if let Some(ref c) = core {
                    let state = c.get_current_state();
                    WorkerResponse::StateUpdated { state }
                } else {
                    WorkerResponse::Error {
                        message: "Core not initialized".to_string(),
                    }
                }
            }
            WorkerMessage::Reset => {
                if let Some(ref mut c) = core {
                    let state = c.reset();
                    WorkerResponse::StateUpdated { state }
                } else {
                    WorkerResponse::Error {
                        message: "Core not initialized".to_string(),
                    }
                }
            }
        };

        // Post response back to main thread
        let _ = post_response(&global, &response);
    }) as Box<dyn FnMut(MessageEvent)>);

    global.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
    onmessage.forget(); // Keep closure alive

    Ok(())
}

/// Helper to post response back to main thread.
fn post_response(global: &DedicatedWorkerGlobalScope, response: &WorkerResponse) -> Result<(), JsValue> {
    let value = serde_wasm_bindgen::to_value(response)?;
    global.post_message(&value)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let config = QualiaCalculatorConfig::default();
        let core = QualiaCalculatorCore::new(config);

        let state = core.get_current_state();

        assert_eq!(state.intensity, 0.5);
        assert_eq!(state.harmony, 0.5);
        assert_eq!(state.chaos, 0.5);
        assert_eq!(state.kairos, 0.5);
    }

    #[test]
    fn test_note_hit_increases_intensity() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 1.0, // Perfect accuracy
        };

        let state = core.process_player_action(action);

        assert!(state.intensity > 0.5, "Perfect hit should increase intensity");
        assert!(state.harmony > 0.5, "Perfect hit should increase harmony");
        assert!(state.chaos < 0.5, "Perfect hit should decrease chaos");
    }

    #[test]
    fn test_note_miss_decreases_harmony() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        let action = PlayerAction::NoteMissed;

        let state = core.process_player_action(action);

        assert!(state.harmony < 0.5, "Miss should decrease harmony");
        assert!(state.chaos > 0.5, "Miss should increase chaos");
    }

    #[test]
    fn test_dash_increases_intensity_and_chaos() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        let action = PlayerAction::DashActivated { timestamp: 0 };

        let state = core.process_player_action(action);

        assert!(state.intensity > 0.5, "Dash should increase intensity");
        assert!(state.chaos > 0.5, "Dash should increase chaos");
    }

    #[test]
    fn test_time_decay_toward_neutral() {
        let config = QualiaCalculatorConfig {
            decay_rate: 0.5, // 50% decay toward neutral
            ..Default::default()
        };
        let mut core = QualiaCalculatorCore::new(config);

        // Set extreme values
        core.current_state.intensity = 1.0;
        core.current_state.harmony = 0.0;

        let state = core.apply_time_decay(1.0); // 1 second decay

        // Should move toward 0.5 (neutral)
        assert!(state.intensity < 1.0, "Intensity should decay toward neutral");
        assert!(state.harmony > 0.0, "Harmony should decay toward neutral");
    }

    #[test]
    fn test_clamp_to_valid_range() {
        let config = QualiaCalculatorConfig::default();
        let core = QualiaCalculatorCore::new(config);

        assert_eq!(core.clamp(-0.5), 0.0);
        assert_eq!(core.clamp(0.5), 0.5);
        assert_eq!(core.clamp(1.5), 1.0);
    }

    #[test]
    fn test_reset_to_initial_state() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        // Modify state
        core.current_state.intensity = 1.0;
        core.current_state.chaos = 0.0;

        // Reset
        let state = core.reset();

        assert_eq!(state.intensity, 0.5);
        assert_eq!(state.harmony, 0.5);
        assert_eq!(state.chaos, 0.5);
        assert_eq!(state.kairos, 0.5);
    }

    #[test]
    fn test_calculation_statistics() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        // Perform calculations (NOTE: in tests, performance.now() may not be available)
        core.process_player_action(PlayerAction::NoteMissed);
        core.process_player_action(PlayerAction::NoteMissed);
        core.process_player_action(PlayerAction::NoteMissed);

        let (count, _avg_time) = core.get_stats();

        assert_eq!(count, 3, "Should track 3 calculations");
    }

    #[test]
    fn test_lerp_toward_neutral_calculation() {
        let config = QualiaCalculatorConfig::default();
        let core = QualiaCalculatorCore::new(config);

        // lerp_toward_neutral(1.0, 0.5) → 1.0 + (0.5 - 1.0) * 0.5 = 1.0 - 0.25 = 0.75
        let result = core.lerp_toward_neutral(1.0, 0.5);
        assert!((result - 0.75).abs() < 0.01);

        // lerp_toward_neutral(0.0, 0.5) → 0.0 + (0.5 - 0.0) * 0.5 = 0.25
        let result = core.lerp_toward_neutral(0.0, 0.5);
        assert!((result - 0.25).abs() < 0.01);
    }

    #[test]
    fn test_fast_forward_increases_kairos() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        let action = PlayerAction::FastForward { timestamp: 0 };

        let state = core.process_player_action(action);

        assert!(state.kairos > 0.5, "Fast forward should increase kairos");
    }

    #[test]
    fn test_rewind_decreases_kairos() {
        let config = QualiaCalculatorConfig::default();
        let mut core = QualiaCalculatorCore::new(config);

        let action = PlayerAction::Rewind { timestamp: 0 };

        let state = core.process_player_action(action);

        assert!(state.kairos < 0.5, "Rewind should decrease kairos");
    }
}

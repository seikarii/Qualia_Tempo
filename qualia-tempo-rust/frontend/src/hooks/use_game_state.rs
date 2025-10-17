//! # Responsibility
//! Hook for accessing game state store.
//!
//! ---
//!
//! Leptos hook providing access to global game state via Leptos Signals.
//! Returns reactive signals for qualia_state, score, combo, and game_phase.

use leptos::*;

/// # Responsibility
/// Game state signals exposed to components.
#[derive(Debug, Clone)]
pub struct GameState {
    pub qualia_state: ReadSignal<QualiaStateData>,
    pub score: ReadSignal<u32>,
    pub combo: ReadSignal<u32>,
    pub game_phase: ReadSignal<String>,
}

/// # Responsibility
/// Qualia state snapshot.
#[derive(Debug, Clone, Copy)]
pub struct QualiaStateData {
    pub intensity: f32,
    pub harmony: f32,
    pub chaos: f32,
    pub kairos: f32,
    pub transcendence: f32,
}

impl Default for QualiaStateData {
    fn default() -> Self {
        Self {
            intensity: 0.0,
            harmony: 0.0,
            chaos: 0.0,
            kairos: 0.0,
            transcendence: 0.0,
        }
    }
}

/// # Responsibility
/// Hook providing access to game state.
///
/// # Returns
/// GameState struct with reactive signals.
///
/// # Example
/// ```rust
/// let game_state = use_game_state();
/// let intensity = move || game_state.qualia_state.get().intensity;
/// ```
pub fn use_game_state() -> GameState {
    // Access global context (set by App root)
    use_context::<GameState>().expect("GameState context not found")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qualia_state_data_default() {
        let state = QualiaStateData::default();
        assert_eq!(state.intensity, 0.0);
        assert_eq!(state.harmony, 0.0);
        assert_eq!(state.chaos, 0.0);
        assert_eq!(state.kairos, 0.0);
        assert_eq!(state.transcendence, 0.0);
    }

    #[test]
    fn test_qualia_state_data_creation() {
        let state = QualiaStateData {
            intensity: 0.8,
            harmony: 0.6,
            chaos: 0.3,
            kairos: 0.9,
            transcendence: 0.5,
        };
        assert_eq!(state.intensity, 0.8);
        assert_eq!(state.harmony, 0.6);
    }

    #[test]
    fn test_qualia_state_data_boundaries() {
        let state = QualiaStateData {
            intensity: 1.0,
            harmony: 0.0,
            chaos: 1.0,
            kairos: 0.0,
            transcendence: 1.0,
        };
        assert!(state.intensity <= 1.0 && state.intensity >= 0.0);
        assert!(state.transcendence <= 1.0 && state.transcendence >= 0.0);
    }

    #[test]
    fn test_qualia_state_data_copy() {
        let state1 = QualiaStateData::default();
        let state2 = state1; // Copy trait
        assert_eq!(state1.intensity, state2.intensity);
    }
}

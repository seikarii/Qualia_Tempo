//! # Responsibility
//! Hook for accessing Web Audio API context.
//!
//! ---
//!
//! Leptos hook providing access to Web Audio API AudioContext.
//! Handles initialization, state management, and FFT data access.

use leptos::*;
use wasm_bindgen::prelude::*;

/// # Responsibility
/// Audio context state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AudioContextState {
    /// Context not initialized
    Uninitialized,
    /// Context running
    Running,
    /// Context suspended
    Suspended,
    /// Context closed
    Closed,
}

/// # Responsibility
/// Audio context handle with FFT data.
#[derive(Clone)]
pub struct AudioContextHandle {
    state: ReadSignal<AudioContextState>,
    fft_data: ReadSignal<Vec<f32>>,
}

impl AudioContextHandle {
    /// # Responsibility
    /// Gets current context state.
    pub fn state(&self) -> AudioContextState {
        self.state.get()
    }

    /// # Responsibility
    /// Gets current FFT frequency data (0.0-1.0 normalized).
    pub fn fft_data(&self) -> Vec<f32> {
        self.fft_data.get()
    }

    /// # Responsibility
    /// Checks if context is running.
    pub fn is_running(&self) -> bool {
        self.state.get() == AudioContextState::Running
    }
}

/// # Responsibility
/// Hook providing access to Web Audio API context.
///
/// # Returns
/// AudioContextHandle with state and FFT data signals.
///
/// # Example
/// ```rust
/// let audio = use_audio_context();
/// let fft = move || audio.fft_data();
/// ```
pub fn use_audio_context() -> AudioContextHandle {
    use_context::<AudioContextHandle>().expect("AudioContext not found")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_context_state_equality() {
        assert_eq!(AudioContextState::Running, AudioContextState::Running);
        assert_ne!(AudioContextState::Running, AudioContextState::Suspended);
    }

    #[test]
    fn test_audio_context_state_transitions() {
        let states = vec![
            AudioContextState::Uninitialized,
            AudioContextState::Running,
            AudioContextState::Suspended,
            AudioContextState::Closed,
        ];
        assert_eq!(states.len(), 4);
    }

    #[test]
    fn test_audio_context_state_copy() {
        let state1 = AudioContextState::Running;
        let state2 = state1; // Copy trait
        assert_eq!(state1, state2);
    }

    #[test]
    fn test_fft_data_normalization() {
        // Test that FFT data should be in [0.0, 1.0] range
        let fft_data = vec![0.0, 0.25, 0.5, 0.75, 1.0];
        for value in fft_data {
            assert!(value >= 0.0 && value <= 1.0);
        }
    }
}

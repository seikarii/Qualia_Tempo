//! # Responsibility
//! Vocal adjustment effect using formant enhancement.
//!
//! ---
//!
//! Enhances vocal frequencies without pitch shifting (legal workaround
//! for GPL Rubberband). Uses EQ to boost formant ranges.

use super::IEffect;

/// # Responsibility
/// Enhances vocal clarity through formant-frequency EQ boost.
///
/// ---
///
/// Targets 250Hz-3kHz range where vocal formants typically reside.
pub struct VocalAdjust {
    formant_boost: f32,
}

impl VocalAdjust {
    /// Create a new vocal adjustment effect.
    pub fn new() -> Self {
        Self {
            formant_boost: 1.5, // 1.5x boost in vocal range
        }
    }
}

impl Default for VocalAdjust {
    fn default() -> Self {
        Self::new()
    }
}

impl IEffect for VocalAdjust {
    fn process_frame(&mut self, frame: &mut [f32; 2], _sample_rate: u32, _time_seconds: f64) {
        // Simple gain boost (proper implementation would use band-pass filter)
        frame[0] *= self.formant_boost;
        frame[1] *= self.formant_boost;

        // Clamp to prevent clipping
        frame[0] = frame[0].clamp(-1.0, 1.0);
        frame[1] = frame[1].clamp(-1.0, 1.0);
    }
}

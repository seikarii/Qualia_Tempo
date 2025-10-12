//! # Responsibility
//! Vocal adjustment effect using formant enhancement.
//!
//! ---
//!
//! Enhances vocal frequencies without pitch shifting (legal workaround
//! for GPL Rubberband). Uses peaking EQ to boost vocal formant ranges.

use super::biquad::BiquadFilter;
use super::IEffect;

/// # Responsibility
/// Enhances vocal clarity through formant-frequency EQ boost.
///
/// ---
///
/// Targets 1200Hz center frequency with Q=1.0 to cover 250Hz-3kHz vocal range.
pub struct VocalAdjust {
    filter: BiquadFilter,
}

impl VocalAdjust {
    /// Create a new vocal adjustment effect.
    ///
    /// # Arguments
    /// * `sample_rate` - Sample rate for filter design
    pub fn new(sample_rate: u32) -> Self {
        // Peaking EQ centered at 1200 Hz with moderate bandwidth
        let filter = BiquadFilter::peaking_eq(
            sample_rate,
            1200.0, // Center of vocal formant range
            6.0,    // +6 dB boost (2x amplitude)
            1.0,    // Q factor for moderate bandwidth (covers ~250-3000 Hz)
        );

        Self { filter }
    }
}

impl Default for VocalAdjust {
    fn default() -> Self {
        Self::new(48000) // Default to 48kHz sample rate
    }
}

impl IEffect for VocalAdjust {
    fn process_frame(&mut self, frame: &mut [f32; 2], _sample_rate: u32, _time_seconds: f64) {
        // Apply peaking EQ filter to boost vocal frequencies
        self.filter.process_frame(frame);

        // Soft clip to prevent clipping
        frame[0] = frame[0].clamp(-1.0, 1.0);
        frame[1] = frame[1].clamp(-1.0, 1.0);
    }

    fn reset(&mut self) {
        self.filter.reset();
    }
}

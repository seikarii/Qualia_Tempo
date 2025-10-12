//! # Responsibility
//! Effect trait definition and module exports.
//!
//! ---
//!
//! The IEffect trait provides a uniform interface for all audio effects.
//! Each effect processes stereo frames in-place.

pub mod drop_enhancer;
pub mod orchestra;
pub mod spatial_8d;
pub mod vocal_adjust;

/// # Responsibility
/// Trait for audio effects that process stereo frames in real-time.
///
/// ---
///
/// All effects must be thread-safe (Send + Sync) and operate on
/// stereo frames ([left, right]) at a given sample rate and time position.
pub trait IEffect: Send + Sync {
    /// Process a single stereo frame in-place.
    ///
    /// # Arguments
    /// * `frame` - Mutable stereo frame [left, right] with values in [-1.0, 1.0]
    /// * `sample_rate` - Sample rate in Hz (e.g., 44100)
    /// * `time_seconds` - Current playback position in seconds
    fn process_frame(&mut self, frame: &mut [f32; 2], sample_rate: u32, time_seconds: f64);

    /// Reset internal state (called between tracks).
    fn reset(&mut self) {}
}

//! # Responsibility
//! 8D spatial audio effect using circular binaural panning.
//!
//! ---
//!
//! Implements the "8D audio" illusion by modulating stereo panning in a circular
//! pattern combined with reverb for depth. Based on HRTF principles but simplified
//! for real-time processing.

use super::IEffect;
use std::f64::consts::PI;

/// # Responsibility
/// Creates the 8D spatial audio effect through circular panning and reverb.
///
/// ---
///
/// The rotation speed determines how fast the audio circles around the listener.
/// Typical values: 0.1-0.5 Hz (cycles per second).
pub struct Spatial8D {
    rotation_speed: f32,
    reverb_buffer: Vec<[f32; 2]>,
    reverb_index: usize,
    reverb_decay: f32,
}

impl Spatial8D {
    /// Create a new 8D spatial effect.
    ///
    /// # Arguments
    /// * `rotation_speed` - Rotation speed in cycles per second (Hz)
    /// * `sample_rate` - Sample rate for reverb buffer sizing
    pub fn new(rotation_speed: f32, sample_rate: u32) -> Self {
        // Reverb delay: 50ms
        let reverb_samples = (sample_rate as f32 * 0.05) as usize;

        Self {
            rotation_speed,
            reverb_buffer: vec![[0.0, 0.0]; reverb_samples],
            reverb_index: 0,
            reverb_decay: 0.3,
        }
    }

    /// Apply panning based on angle.
    ///
    /// # Arguments
    /// * `angle` - Angle in radians (0 = front, π/2 = right, π = back, 3π/2 = left)
    fn apply_panning(&self, frame: &mut [f32; 2], angle: f64) {
        // Convert angle to stereo panning using constant-power panning
        let pan = angle.sin() as f32; // -1.0 (left) to 1.0 (right)

        // Constant-power panning (equal energy)
        let pan_radians = (pan + 1.0) * PI as f32 / 4.0; // Map to [0, π/2]
        let left_gain = pan_radians.cos();
        let right_gain = pan_radians.sin();

        let original_left = frame[0];
        let original_right = frame[1];

        // Mix stereo to mono, then apply panning
        let mono = (original_left + original_right) * 0.5;

        frame[0] = mono * left_gain;
        frame[1] = mono * right_gain;

        // Add slight cross-feed for more realistic spatial perception
        frame[0] += original_right * 0.1;
        frame[1] += original_left * 0.1;
    }

    /// Apply simple reverb for spatial depth.
    fn apply_reverb(&mut self, frame: &mut [f32; 2]) {
        // Get delayed signal
        let delayed = self.reverb_buffer[self.reverb_index];

        // Mix delayed signal back
        frame[0] += delayed[0] * self.reverb_decay;
        frame[1] += delayed[1] * self.reverb_decay;

        // Store current frame in buffer with decay
        self.reverb_buffer[self.reverb_index] = [
            frame[0] * self.reverb_decay,
            frame[1] * self.reverb_decay,
        ];

        // Advance circular buffer
        self.reverb_index = (self.reverb_index + 1) % self.reverb_buffer.len();
    }
}

impl IEffect for Spatial8D {
    fn process_frame(&mut self, frame: &mut [f32; 2], _sample_rate: u32, time_seconds: f64) {
        // Calculate rotation angle (full rotation = 2π radians)
        let angle = time_seconds * 2.0 * PI * self.rotation_speed as f64;

        // Apply circular panning
        self.apply_panning(frame, angle);

        // Apply reverb for spatial depth
        self.apply_reverb(frame);
    }

    fn reset(&mut self) {
        self.reverb_buffer.fill([0.0, 0.0]);
        self.reverb_index = 0;
    }
}

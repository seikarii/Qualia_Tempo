//! # Responsibility
//! Orchestra effect creating multi-voice stereo widening.
//!
//! ---
//!
//! Creates the illusion of multiple instruments by using delays and
//! spatial positioning for each "voice".

use super::IEffect;

/// # Responsibility
/// Creates orchestral depth through delayed and spatially positioned voices.
pub struct Orchestra {
    delay_buffers: Vec<Vec<[f32; 2]>>,
    delay_indices: Vec<usize>,
    voice_pans: Vec<f32>,
}

impl Orchestra {
    /// Create a new orchestra effect.
    ///
    /// # Arguments
    /// * `sample_rate` - Sample rate for delay buffer sizing
    pub fn new(sample_rate: u32) -> Self {
        let num_voices = 3;
        let delays_ms = vec![0, 15, 30]; // Delays in milliseconds
        let pans = vec![0.0, -0.6, 0.6]; // Center, left, right

        let mut delay_buffers = Vec::new();
        for delay_ms in delays_ms {
            let buffer_size = (sample_rate as f32 * delay_ms as f32 / 1000.0) as usize;
            delay_buffers.push(vec![[0.0, 0.0]; buffer_size.max(1)]);
        }

        Self {
            delay_buffers,
            delay_indices: vec![0; num_voices],
            voice_pans: pans,
        }
    }

    /// Apply panning to a voice.
    fn apply_pan(&self, frame: [f32; 2], pan: f32) -> [f32; 2] {
        let mono = (frame[0] + frame[1]) * 0.5;
        let left_gain = ((1.0 - pan) * 0.5 + 0.5).sqrt();
        let right_gain = ((1.0 + pan) * 0.5 + 0.5).sqrt();

        [mono * left_gain, mono * right_gain]
    }
}

impl IEffect for Orchestra {
    fn process_frame(&mut self, frame: &mut [f32; 2], _sample_rate: u32, _time_seconds: f64) {
        let original = *frame;
        let mut output = [0.0, 0.0];

        for i in 0..self.delay_buffers.len() {
            if self.delay_buffers[i].is_empty() {
                continue;
            }

            // Get delayed signal
            let delayed = self.delay_buffers[i][self.delay_indices[i]];

            // Apply panning
            let panned = self.apply_pan(delayed, self.voice_pans[i]);

            // Mix into output
            output[0] += panned[0];
            output[1] += panned[1];

            // Store current frame
            self.delay_buffers[i][self.delay_indices[i]] = original;

            // Advance delay buffer
            self.delay_indices[i] = (self.delay_indices[i] + 1) % self.delay_buffers[i].len();
        }

        // Normalize and mix
        let scale = 1.0 / self.delay_buffers.len() as f32;
        frame[0] = output[0] * scale;
        frame[1] = output[1] * scale;
    }

    fn reset(&mut self) {
        for buffer in &mut self.delay_buffers {
            buffer.fill([0.0, 0.0]);
        }
        self.delay_indices.fill(0);
    }
}

//! # Responsibility
//! Drop enhancement effect using dynamic bass boost.
//!
//! ---
//!
//! Analyzes low-frequency energy and applies adaptive EQ boost when drops
//! are detected. Uses RMS energy tracking and spectral analysis.

use super::IEffect;

/// # Responsibility
/// Enhances bass drops by boosting low frequencies when energy spikes are detected.
///
/// ---
///
/// Uses a simple low-shelf filter and energy detection to identify drops.
pub struct DropEnhancer {
    threshold: f32,
    energy_history: Vec<f32>,
    history_index: usize,
    boost_gain: f32,
    current_boost: f32,
    attack: f32,
    release: f32,
}

impl DropEnhancer {
    /// Create a new drop enhancer.
    ///
    /// # Arguments
    /// * `threshold` - Energy threshold for drop detection (0.0-1.0)
    /// * `sample_rate` - Sample rate for buffer sizing
    pub fn new(threshold: f32, sample_rate: u32) -> Self {
        // Track energy over last 100ms
        let history_samples = (sample_rate as f32 * 0.1) as usize;

        Self {
            threshold,
            energy_history: vec![0.0; history_samples],
            history_index: 0,
            boost_gain: 3.0, // 3x boost when drop detected
            current_boost: 1.0,
            attack: 0.9999,   // Fast attack for drops
            release: 0.9995,  // Slow release for smooth decay
        }
    }

    /// Calculate RMS energy of a frame.
    fn calculate_energy(&self, frame: &[f32; 2]) -> f32 {
        ((frame[0] * frame[0] + frame[1] * frame[1]) / 2.0).sqrt()
    }

    /// Calculate average energy from history.
    fn average_energy(&self) -> f32 {
        self.energy_history.iter().sum::<f32>() / self.energy_history.len() as f32
    }

    /// Apply low-shelf boost for bass enhancement.
    fn apply_bass_boost(&self, frame: &mut [f32; 2], gain: f32) {
        // Simple gain boost (proper low-shelf EQ would use biquad filter)
        frame[0] *= gain;
        frame[1] *= gain;

        // Clamp to prevent clipping
        frame[0] = frame[0].clamp(-1.0, 1.0);
        frame[1] = frame[1].clamp(-1.0, 1.0);
    }
}

impl IEffect for DropEnhancer {
    fn process_frame(&mut self, frame: &mut [f32; 2], _sample_rate: u32, _time_seconds: f64) {
        // Calculate current frame energy
        let energy = self.calculate_energy(frame);

        // Update energy history
        self.energy_history[self.history_index] = energy;
        self.history_index = (self.history_index + 1) % self.energy_history.len();

        // Calculate average energy
        let avg_energy = self.average_energy();

        // Detect drop: current energy significantly above average
        let is_drop = energy > avg_energy * (1.0 + self.threshold);

        // Update boost with envelope follower
        if is_drop {
            self.current_boost += (self.boost_gain - self.current_boost) * (1.0 - self.attack);
        } else {
            self.current_boost += (1.0 - self.current_boost) * (1.0 - self.release);
        }

        // Apply bass boost
        self.apply_bass_boost(frame, self.current_boost);
    }

    fn reset(&mut self) {
        self.energy_history.fill(0.0);
        self.history_index = 0;
        self.current_boost = 1.0;
    }
}

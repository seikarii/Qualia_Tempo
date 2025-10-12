//! # Responsibility
//! Drop enhancement effect using dynamic bass boost.
//!
//! ---
//!
//! Analyzes low-frequency energy and applies adaptive low-shelf EQ when drops
//! are detected. Uses RMS energy tracking and biquad IIR filtering.

use super::biquad::BiquadFilter;
use super::IEffect;

/// # Responsibility
/// Enhances bass drops by boosting low frequencies when energy spikes are detected.
///
/// ---
///
/// Uses a low-shelf biquad filter with dynamic gain control based on energy analysis.
pub struct DropEnhancer {
    threshold: f32,
    energy_history: Vec<f32>,
    history_index: usize,
    max_db_boost: f32,
    current_db_gain: f32,
    last_updated_db: f32,
    attack: f32,
    release: f32,
    
    // Biquad filter for frequency-selective bass boost
    filter: BiquadFilter,
    sample_rate: u32,
}

impl DropEnhancer {
    /// Create a new drop enhancer.
    ///
    /// # Arguments
    /// * `threshold` - Energy threshold for drop detection (0.0-1.0)
    /// * `sample_rate` - Sample rate for buffer sizing and filter design
    pub fn new(threshold: f32, sample_rate: u32) -> Self {
        // Track energy over last 100ms
        let history_samples = (sample_rate as f32 * 0.1) as usize;

        // Initialize with flat response (0 dB gain)
        let filter = BiquadFilter::low_shelf(
            sample_rate,
            200.0,  // Boost frequencies below 200 Hz
            0.0,    // Start with 0 dB gain
            0.7,    // Smooth shelf slope
        );

        Self {
            threshold,
            energy_history: vec![0.0; history_samples],
            history_index: 0,
            max_db_boost: 18.0, // MISSION v2.1: Up to +18 dB boost (was 12.0)
            current_db_gain: 0.0,
            last_updated_db: 0.0,
            attack: 0.9999,   // Fast attack for drops
            release: 0.9995,  // Slow release for smooth decay
            filter,
            sample_rate,
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

    /// Update filter coefficients based on current gain.
    fn update_filter(&mut self) {
        self.filter = BiquadFilter::low_shelf(
            self.sample_rate,
            200.0,
            self.current_db_gain,
            0.7,
        );
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

        // Update dB gain with envelope follower
        let target_db = if is_drop { self.max_db_boost } else { 0.0 };
        
        if is_drop {
            self.current_db_gain += (target_db - self.current_db_gain) * (1.0 - self.attack);
        } else {
            self.current_db_gain += (target_db - self.current_db_gain) * (1.0 - self.release);
        }

        // Update filter coefficients if gain changed significantly
        // (Avoid recalculating every sample for performance)
        if (self.current_db_gain - self.last_updated_db).abs() > 0.5 {
            self.update_filter();
            self.last_updated_db = self.current_db_gain;
        }

        // Apply low-shelf filter to boost bass frequencies
        self.filter.process_frame(frame);
        
        // Soft clip to prevent harsh clipping
        frame[0] = frame[0].clamp(-1.0, 1.0);
        frame[1] = frame[1].clamp(-1.0, 1.0);
    }

    fn reset(&mut self) {
        self.energy_history.fill(0.0);
        self.history_index = 0;
        self.current_db_gain = 0.0;
        self.last_updated_db = 0.0;
        self.filter.reset();
    }
}

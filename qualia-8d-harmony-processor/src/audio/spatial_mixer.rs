//! # Responsibility
//! Mixes multiple audio stems with musical lookahead limiting to prevent clipping.
//!
//! Sums binaural signals from multiple sources and applies soft-knee lookahead
//! limiting for transparent dynamics control without harsh distortion.

use crate::audio::BinauralSignal;

/// Configuration for spatial mixer
#[derive(Debug, Clone)]
pub struct SpatialMixerConfig {
    pub limiter_threshold: f32,  // Maximum absolute amplitude (typically 0.95)
    pub num_stems: usize,        // Expected number of input stems
    pub lookahead_ms: f32,       // Lookahead time in milliseconds (default: 5.0ms)
    pub release_ms: f32,         // Release time in milliseconds (default: 50.0ms)
    pub knee_db: f32,            // Soft knee width in dB (default: 3.0dB)
    pub sample_rate: u32,        // Sample rate for time calculations
}

impl SpatialMixerConfig {
    pub fn new(
        limiter_threshold: f32,
        num_stems: usize,
        lookahead_ms: f32,
        release_ms: f32,
        knee_db: f32,
        sample_rate: u32,
    ) -> Self {
        Self {
            limiter_threshold: limiter_threshold.abs().min(1.0), // Clamp to [0, 1]
            num_stems,
            lookahead_ms: lookahead_ms.max(0.0),
            release_ms: release_ms.max(1.0),
            knee_db: knee_db.abs(),
            sample_rate,
        }
    }

    /// Create default configuration for 8D audio with musical limiting
    /// 
    /// - Threshold: 0.95 (-0.44 dBFS) for headroom
    /// - Lookahead: 5ms for transient detection
    /// - Release: 50ms for smooth recovery
    /// - Knee: 3dB soft-knee for transparent compression
    pub fn default_8d(sample_rate: u32) -> Self {
        Self {
            limiter_threshold: 0.95,
            num_stems: 4,
            lookahead_ms: 5.0,
            release_ms: 50.0,
            knee_db: 3.0,
            sample_rate,
        }
    }
}

/// Spatial mixer for summing and limiting binaural stems
pub struct SpatialMixer {
    config: SpatialMixerConfig,
    lookahead_buffer_size: usize,
    release_coefficient: f32,
}

impl SpatialMixer {
    pub fn new(config: SpatialMixerConfig) -> Self {
        // Calculate lookahead buffer size in samples
        let lookahead_buffer_size = 
            ((config.lookahead_ms / 1000.0) * config.sample_rate as f32).ceil() as usize;
        
        // Calculate release coefficient for exponential smoothing
        // release_coeff = exp(-1 / (release_time_sec * sample_rate))
        let release_time_sec = config.release_ms / 1000.0;
        let release_coefficient = (-1.0 / (release_time_sec * config.sample_rate as f32)).exp();
        
        Self {
            config,
            lookahead_buffer_size,
            release_coefficient,
        }
    }

    /// Mix multiple binaural signals and apply musical lookahead limiting
    ///
    /// # Arguments
    /// * `stems` - Array of binaural input signals to sum
    ///
    /// # Returns
    /// Mixed and limited binaural output
    pub fn mix(&self, stems: &[BinauralSignal]) -> BinauralSignal {
        if stems.is_empty() {
            return BinauralSignal::new(0);
        }

        // Find maximum length across all stems
        let max_len = stems.iter().map(|s| s.len()).max().unwrap_or(0);

        if max_len == 0 {
            return BinauralSignal::new(0);
        }

        let mut mixed = BinauralSignal::new(max_len);

        // Sum all stems
        for stem in stems {
            for (i, &sample) in stem.left.iter().enumerate() {
                if i < mixed.left.len() {
                    mixed.left[i] += sample;
                }
            }

            for (i, &sample) in stem.right.iter().enumerate() {
                if i < mixed.right.len() {
                    mixed.right[i] += sample;
                }
            }
        }

        // Apply musical lookahead limiting
        self.apply_lookahead_limiter(&mut mixed);

        mixed
    }

    /// # Responsibility
    /// Apply musical lookahead limiter with soft-knee compression.
    /// 
    /// Algorithm:
    /// 1. Scan ahead to detect peaks before they occur
    /// 2. Calculate gain reduction using soft-knee curve
    /// 3. Apply smooth gain envelope with release time
    /// 4. Preserve transient attack characteristics
    fn apply_lookahead_limiter(&self, signal: &mut BinauralSignal) {
        if signal.is_empty() {
            return;
        }
        
        let threshold = self.config.limiter_threshold;
        let knee_db = self.config.knee_db;
        let lookahead = self.lookahead_buffer_size;
        
        // Convert threshold to dB for soft-knee calculation
        let threshold_db = 20.0 * threshold.log10();
        let knee_start_db = threshold_db - (knee_db / 2.0);
        let knee_end_db = threshold_db + (knee_db / 2.0);
        
        // Process left channel
        let mut gain_envelope = vec![1.0; signal.left.len()];
        
        for i in 0..signal.left.len() {
            // Lookahead: find peak in next N samples
            let scan_end = (i + lookahead).min(signal.left.len());
            let mut peak = 0.0_f32;
            
            for j in i..scan_end {
                let left_abs = signal.left[j].abs();
                let right_abs = signal.right[j].abs();
                peak = peak.max(left_abs).max(right_abs);
            }
            
            // Calculate gain reduction with soft-knee
            let gain_reduction = if peak <= threshold {
                1.0 // No reduction needed
            } else {
                // Convert peak to dB
                let peak_db = 20.0 * peak.log10();
                
                let reduction_db = if peak_db < knee_start_db {
                    // Below knee: no reduction
                    0.0
                } else if peak_db > knee_end_db {
                    // Above knee: full limiting
                    peak_db - threshold_db
                } else {
                    // In knee: smooth transition using quadratic curve
                    let knee_input = peak_db - knee_start_db;
                    let knee_factor = knee_input / knee_db;
                    (knee_factor * knee_factor) * knee_db / 2.0
                };
                
                // Convert dB reduction back to linear gain
                10.0_f32.powf(-reduction_db / 20.0)
            };
            
            // Apply gain reduction with smooth release
            if i == 0 {
                gain_envelope[i] = gain_reduction;
            } else {
                // Exponential smoothing for release
                let previous_gain = gain_envelope[i - 1];
                if gain_reduction < previous_gain {
                    // Attack: instant (preserve transients)
                    gain_envelope[i] = gain_reduction;
                } else {
                    // Release: smooth exponential recovery
                    gain_envelope[i] = previous_gain + 
                        (1.0 - self.release_coefficient) * (gain_reduction - previous_gain);
                }
            }
        }
        
        // Apply gain envelope to both channels
        for i in 0..signal.left.len() {
            signal.left[i] *= gain_envelope[i];
            signal.right[i] *= gain_envelope[i];
        }
        
        // Final safety clipper (should rarely trigger with lookahead)
        for sample in &mut signal.left {
            *sample = sample.clamp(-threshold, threshold);
        }
        for sample in &mut signal.right {
            *sample = sample.clamp(-threshold, threshold);
        }
    }

    pub fn config(&self) -> &SpatialMixerConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_spatial_mixer_config_creation() {
        let config = SpatialMixerConfig::new(1.0, 4, 5.0, 50.0, 3.0, 48000);
        assert_relative_eq!(config.limiter_threshold, 1.0);
        assert_eq!(config.num_stems, 4);
        assert_relative_eq!(config.lookahead_ms, 5.0);
        assert_relative_eq!(config.release_ms, 50.0);
        assert_relative_eq!(config.knee_db, 3.0);
    }

    #[test]
    fn test_spatial_mixer_config_negative_threshold() {
        let config = SpatialMixerConfig::new(-0.8, 4, 5.0, 50.0, 3.0, 48000);
        assert_relative_eq!(config.limiter_threshold, 0.8); // Should be abs value
    }

    #[test]
    fn test_spatial_mixer_creation() {
        let config = SpatialMixerConfig::default_8d(48000);
        let mixer = SpatialMixer::new(config);
        assert_relative_eq!(mixer.config().limiter_threshold, 0.95);
        assert!(mixer.lookahead_buffer_size > 0);
    }

    #[test]
    fn test_mix_empty_stems() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d(48000));
        let result = mixer.mix(&[]);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_mix_single_stem() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d(48000));
        
        let mut stem = BinauralSignal::new(10);
        stem.left.fill(0.5);
        stem.right.fill(0.3);

        let result = mixer.mix(&[stem]);

        assert_eq!(result.len(), 10);
        assert_relative_eq!(result.left[0], 0.5, epsilon = 0.01);
        assert_relative_eq!(result.right[0], 0.3, epsilon = 0.01);
    }

    #[test]
    fn test_mix_multiple_stems() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d(48000));
        
        let mut stem1 = BinauralSignal::new(5);
        stem1.left.fill(0.3);
        stem1.right.fill(0.2);

        let mut stem2 = BinauralSignal::new(5);
        stem2.left.fill(0.4);
        stem2.right.fill(0.5);

        let result = mixer.mix(&[stem1, stem2]);

        assert_eq!(result.len(), 5);
        assert_relative_eq!(result.left[0], 0.7, epsilon = 0.01); // 0.3 + 0.4
        assert_relative_eq!(result.right[0], 0.7, epsilon = 0.01); // 0.2 + 0.5
    }

    #[test]
    fn test_lookahead_limiter_prevents_clipping() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(0.95, 3, 5.0, 50.0, 3.0, 48000));
        
        // Create stems that would sum to > 0.95
        let mut stem1 = BinauralSignal::new(100);
        stem1.left.fill(0.8);
        stem1.right.fill(0.7);

        let mut stem2 = BinauralSignal::new(100);
        stem2.left.fill(0.8);  // Sum would be 1.6 without limiting
        stem2.right.fill(0.9); // Sum would be 1.6 without limiting

        let result = mixer.mix(&[stem1, stem2]);

        // All samples should be within threshold
        for &sample in &result.left {
            assert!(sample.abs() <= 0.95, "Left sample {} exceeds threshold", sample);
        }

        for &sample in &result.right {
            assert!(sample.abs() <= 0.95, "Right sample {} exceeds threshold", sample);
        }

        // Verify limiting occurred (should be close to threshold, not hard clipped)
        assert!(result.left[50] < 0.96); // Soft limiting, not brick-wall
        assert!(result.right[50] < 0.96);
    }

    #[test]
    fn test_limiter_custom_threshold() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(0.5, 2, 5.0, 50.0, 3.0, 48000));
        
        let mut stem1 = BinauralSignal::new(100);
        stem1.left.fill(0.4);
        stem1.right.fill(0.4);

        let mut stem2 = BinauralSignal::new(100);
        stem2.left.fill(0.3);  // Sum = 0.7
        stem2.right.fill(0.3); // Sum = 0.7

        let result = mixer.mix(&[stem1, stem2]);

        // Should be limited to ~0.5 threshold
        assert!(result.left[50] <= 0.51, "Expected limiting to ~0.5, got {}", result.left[50]);
        assert!(result.right[50] <= 0.51);
    }

    #[test]
    fn test_mix_different_length_stems() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d(48000));
        
        let mut stem1 = BinauralSignal::new(10);
        stem1.left.fill(0.2);
        stem1.right.fill(0.1);

        let mut stem2 = BinauralSignal::new(5); // Shorter stem
        stem2.left.fill(0.3);
        stem2.right.fill(0.4);

        let result = mixer.mix(&[stem1, stem2]);

        // Output should match longest stem
        assert_eq!(result.len(), 10);

        // First 5 samples should have both stems
        assert_relative_eq!(result.left[0], 0.5, epsilon = 0.01); // 0.2 + 0.3
        assert_relative_eq!(result.right[0], 0.5, epsilon = 0.01); // 0.1 + 0.4

        // Last 5 samples should only have stem1
        assert_relative_eq!(result.left[9], 0.2, epsilon = 0.01);
        assert_relative_eq!(result.right[9], 0.1, epsilon = 0.01);
    }

    #[test]
    fn test_limiter_handles_negative_values() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(0.95, 2, 5.0, 50.0, 3.0, 48000));
        
        let mut stem1 = BinauralSignal::new(100);
        stem1.left.fill(-0.7);
        stem1.right.fill(-0.8);

        let mut stem2 = BinauralSignal::new(100);
        stem2.left.fill(-0.6);  // Sum = -1.3
        stem2.right.fill(-0.5); // Sum = -1.3

        let result = mixer.mix(&[stem1, stem2]);

        // Should be limited to -0.95
        assert!(result.left[50] >= -0.96);
        assert!(result.right[50] >= -0.96);
    }
    
    #[test]
    fn test_soft_knee_compression() {
        // Test that soft-knee provides smoother limiting than hard clipping
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(0.8, 2, 5.0, 50.0, 6.0, 48000));
        
        let mut stem = BinauralSignal::new(100);
        // Create gradual crescendo from 0.6 to 1.0
        for i in 0..100 {
            let level = 0.6 + (0.4 * i as f32 / 99.0);
            stem.left[i] = level;
            stem.right[i] = level;
        }
        
        let result = mixer.mix(&[stem]);
        
        // Verify smooth transition through knee region
        // (No sudden jumps, which would indicate hard clipping)
        for i in 1..result.len() {
            let delta = (result.left[i] - result.left[i-1]).abs();
            assert!(delta < 0.05, "Large discontinuity detected at sample {}: delta = {}", i, delta);
        }
    }
}

//! # Responsibility
//! Mixes multiple audio stems with brick-wall limiting to prevent clipping.
//!
//! Sums binaural signals from multiple sources and applies hard limiting
//! at 0dBFS to ensure output never exceeds ±1.0 range.

use crate::audio::BinauralSignal;

/// Configuration for spatial mixer
#[derive(Debug, Clone)]
pub struct SpatialMixerConfig {
    pub limiter_threshold: f32,  // Maximum absolute amplitude (typically 1.0)
    pub num_stems: usize,        // Expected number of input stems
}

impl SpatialMixerConfig {
    pub fn new(limiter_threshold: f32, num_stems: usize) -> Self {
        Self {
            limiter_threshold: limiter_threshold.abs(), // Ensure positive
            num_stems,
        }
    }

    /// Create default configuration for 8D audio (4 stems, 1.0 threshold)
    pub fn default_8d() -> Self {
        Self {
            limiter_threshold: 1.0,
            num_stems: 4,
        }
    }
}

/// Spatial mixer for summing and limiting binaural stems
pub struct SpatialMixer {
    config: SpatialMixerConfig,
}

impl SpatialMixer {
    pub fn new(config: SpatialMixerConfig) -> Self {
        Self { config }
    }

    /// Mix multiple binaural signals and apply brick-wall limiting
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

        // Apply brick-wall limiting
        self.apply_limiter(&mut mixed);

        mixed
    }

    /// Apply hard clipping limiter to prevent exceeding threshold
    fn apply_limiter(&self, signal: &mut BinauralSignal) {
        let threshold = self.config.limiter_threshold;

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
        let config = SpatialMixerConfig::new(1.0, 4);
        assert_relative_eq!(config.limiter_threshold, 1.0);
        assert_eq!(config.num_stems, 4);
    }

    #[test]
    fn test_spatial_mixer_config_negative_threshold() {
        let config = SpatialMixerConfig::new(-0.8, 4);
        assert_relative_eq!(config.limiter_threshold, 0.8); // Should be abs value
    }

    #[test]
    fn test_spatial_mixer_creation() {
        let config = SpatialMixerConfig::default_8d();
        let mixer = SpatialMixer::new(config);
        assert_relative_eq!(mixer.config().limiter_threshold, 1.0);
    }

    #[test]
    fn test_mix_empty_stems() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d());
        let result = mixer.mix(&[]);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_mix_single_stem() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d());
        
        let mut stem = BinauralSignal::new(10);
        stem.left.fill(0.5);
        stem.right.fill(0.3);

        let result = mixer.mix(&[stem]);

        assert_eq!(result.len(), 10);
        assert_relative_eq!(result.left[0], 0.5, epsilon = 0.001);
        assert_relative_eq!(result.right[0], 0.3, epsilon = 0.001);
    }

    #[test]
    fn test_mix_multiple_stems() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d());
        
        let mut stem1 = BinauralSignal::new(5);
        stem1.left.fill(0.3);
        stem1.right.fill(0.2);

        let mut stem2 = BinauralSignal::new(5);
        stem2.left.fill(0.4);
        stem2.right.fill(0.5);

        let result = mixer.mix(&[stem1, stem2]);

        assert_eq!(result.len(), 5);
        assert_relative_eq!(result.left[0], 0.7, epsilon = 0.001); // 0.3 + 0.4
        assert_relative_eq!(result.right[0], 0.7, epsilon = 0.001); // 0.2 + 0.5
    }

    #[test]
    fn test_limiter_prevents_clipping() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(1.0, 3));
        
        // Create stems that would sum to > 1.0
        let mut stem1 = BinauralSignal::new(5);
        stem1.left.fill(0.8);
        stem1.right.fill(0.7);

        let mut stem2 = BinauralSignal::new(5);
        stem2.left.fill(0.8);  // Sum would be 1.6 without limiting
        stem2.right.fill(0.9); // Sum would be 1.6 without limiting

        let result = mixer.mix(&[stem1, stem2]);

        // All samples should be clamped to ±1.0
        for &sample in &result.left {
            assert!(sample >= -1.0 && sample <= 1.0);
        }

        for &sample in &result.right {
            assert!(sample >= -1.0 && sample <= 1.0);
        }

        // Check actual limiting occurred
        assert_relative_eq!(result.left[0], 1.0, epsilon = 0.001); // Clamped from 1.6
        assert_relative_eq!(result.right[0], 1.0, epsilon = 0.001); // Clamped from 1.6
    }

    #[test]
    fn test_limiter_custom_threshold() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(0.5, 2));
        
        let mut stem1 = BinauralSignal::new(3);
        stem1.left.fill(0.4);
        stem1.right.fill(0.4);

        let mut stem2 = BinauralSignal::new(3);
        stem2.left.fill(0.3);  // Sum = 0.7
        stem2.right.fill(0.3); // Sum = 0.7

        let result = mixer.mix(&[stem1, stem2]);

        // Should be clamped to 0.5 threshold
        assert_relative_eq!(result.left[0], 0.5, epsilon = 0.001);
        assert_relative_eq!(result.right[0], 0.5, epsilon = 0.001);
    }

    #[test]
    fn test_mix_different_length_stems() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::default_8d());
        
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
        assert_relative_eq!(result.left[0], 0.5, epsilon = 0.001); // 0.2 + 0.3
        assert_relative_eq!(result.right[0], 0.5, epsilon = 0.001); // 0.1 + 0.4

        // Last 5 samples should only have stem1
        assert_relative_eq!(result.left[9], 0.2, epsilon = 0.001);
        assert_relative_eq!(result.right[9], 0.1, epsilon = 0.001);
    }

    #[test]
    fn test_limiter_handles_negative_values() {
        let mixer = SpatialMixer::new(SpatialMixerConfig::new(1.0, 2));
        
        let mut stem1 = BinauralSignal::new(3);
        stem1.left.fill(-0.7);
        stem1.right.fill(-0.8);

        let mut stem2 = BinauralSignal::new(3);
        stem2.left.fill(-0.6);  // Sum = -1.3
        stem2.right.fill(-0.5); // Sum = -1.3

        let result = mixer.mix(&[stem1, stem2]);

        // Should be clamped to -1.0
        assert_relative_eq!(result.left[0], -1.0, epsilon = 0.001);
        assert_relative_eq!(result.right[0], -1.0, epsilon = 0.001);
    }
}

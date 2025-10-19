//! # Responsibility
//! Mixes multiple binaural signals with limiting to prevent clipping.

use super::BinauralSignal;
use anyhow::Result;

/// # Responsibility
/// Combines multiple binaural signals into final stereo output.
pub struct SpatialMixer {
    limiter_threshold_db: f32,
}

impl SpatialMixer {
    pub fn new(limiter_threshold_db: f32) -> Self {
        Self {
            limiter_threshold_db,
        }
    }

    /// Mix multiple binaural signals
    pub fn mix(&self, stems: &[BinauralSignal]) -> Result<BinauralSignal> {
        if stems.is_empty() {
            return Err(anyhow::anyhow!("No stems to mix"));
        }

        // Use the length of the shortest stem to avoid index out of bounds
        let len = stems.iter().map(|s| s.left.len()).min().unwrap();
        let mut left_sum = vec![0.0f32; len];
        let mut right_sum = vec![0.0f32; len];

        // Sum all stems (only up to shortest length)
        for stem in stems {
            for i in 0..len {
                left_sum[i] += stem.left[i];
                right_sum[i] += stem.right[i];
            }
        }

        // Apply limiter
        self.apply_limiter(&mut left_sum)?;
        self.apply_limiter(&mut right_sum)?;

        Ok(BinauralSignal::new(left_sum, right_sum))
    }

    /// Apply soft limiter to prevent clipping
    fn apply_limiter(&self, samples: &mut [f32]) -> Result<()> {
        let threshold = Self::db_to_linear(self.limiter_threshold_db);

        for sample in samples.iter_mut() {
            if sample.abs() > threshold {
                // Soft clipping with tanh
                *sample = sample.signum() * threshold * (*sample / threshold).abs().tanh();
            }
        }

        Ok(())
    }

    /// Convert dB to linear amplitude
    fn db_to_linear(db: f32) -> f32 {
        10.0_f32.powf(db / 20.0)
    }

    /// Convert linear amplitude to dB (used in tests)
    #[allow(dead_code)]
    fn linear_to_db(linear: f32) -> f32 {
        20.0 * linear.log10()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_spatial_mixer_creation() {
        let mixer = SpatialMixer::new(-0.3);
        assert_relative_eq!(mixer.limiter_threshold_db, -0.3, epsilon = 0.01);
    }

    #[test]
    fn test_db_conversion() {
        let db = -6.0;
        let linear = SpatialMixer::db_to_linear(db);
        let back_to_db = SpatialMixer::linear_to_db(linear);
        
        assert_relative_eq!(db, back_to_db, epsilon = 0.01);
    }

    #[test]
    fn test_mix_empty_stems_returns_error() {
        let mixer = SpatialMixer::new(-0.3);
        let result = mixer.mix(&[]);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_mix_single_stem() {
        let mixer = SpatialMixer::new(-0.3);
        let stem = BinauralSignal::new(vec![0.5; 100], vec![0.5; 100]);
        
        let result = mixer.mix(&[stem]);
        assert!(result.is_ok());
        
        let mixed = result.unwrap();
        assert_eq!(mixed.len(), 100);
    }

    #[test]
    fn test_mix_multiple_stems_sums() {
        let mixer = SpatialMixer::new(-0.3);
        
        let stem1 = BinauralSignal::new(vec![0.1; 100], vec![0.1; 100]);
        let stem2 = BinauralSignal::new(vec![0.2; 100], vec![0.2; 100]);
        let stem3 = BinauralSignal::new(vec![0.3; 100], vec![0.3; 100]);
        
        let mixed = mixer.mix(&[stem1, stem2, stem3]).unwrap();
        
        // Sum should be 0.1 + 0.2 + 0.3 = 0.6
        assert_relative_eq!(mixed.left[0], 0.6, epsilon = 0.01);
        assert_relative_eq!(mixed.right[0], 0.6, epsilon = 0.01);
    }

    #[test]
    fn test_limiter_prevents_clipping() {
        let mixer = SpatialMixer::new(-0.3);
        
        // Create stems that would clip when summed
        let stem1 = BinauralSignal::new(vec![0.8; 100], vec![0.8; 100]);
        let stem2 = BinauralSignal::new(vec![0.8; 100], vec![0.8; 100]);
        
        let mixed = mixer.mix(&[stem1, stem2]).unwrap();
        
        // Check no sample exceeds threshold
        let threshold = SpatialMixer::db_to_linear(-0.3);
        for &sample in &mixed.left {
            assert!(sample.abs() <= threshold + 0.01); // Small epsilon for float precision
        }
        for &sample in &mixed.right {
            assert!(sample.abs() <= threshold + 0.01);
        }
    }

    #[test]
    fn test_limiter_preserves_small_signals() {
        let mixer = SpatialMixer::new(-0.3);
        let mut samples = vec![0.1, 0.2, 0.3];
        
        mixer.apply_limiter(&mut samples).unwrap();
        
        // Small signals should pass through unchanged
        assert_relative_eq!(samples[0], 0.1, epsilon = 0.01);
        assert_relative_eq!(samples[1], 0.2, epsilon = 0.01);
        assert_relative_eq!(samples[2], 0.3, epsilon = 0.01);
    }

    #[test]
    fn test_limiter_applies_soft_clipping() {
        let mixer = SpatialMixer::new(-0.3);
        let mut samples = vec![1.5]; // Way above threshold
        
        mixer.apply_limiter(&mut samples).unwrap();
        
        // Should be limited but not hard clipped
        let threshold = SpatialMixer::db_to_linear(-0.3);
        assert!(samples[0] < 1.5); // Reduced
        assert!(samples[0] > threshold * 0.9); // But not hard clipped exactly at threshold
    }

    #[test]
    fn test_mix_preserves_length() {
        let mixer = SpatialMixer::new(-0.3);
        
        let stem1 = BinauralSignal::new(vec![0.1; 2000], vec![0.1; 2000]);
        let stem2 = BinauralSignal::new(vec![0.2; 2000], vec![0.2; 2000]);
        
        let mixed = mixer.mix(&[stem1, stem2]).unwrap();
        
        assert_eq!(mixed.len(), 2000);
    }

    #[test]
    fn test_mix_with_mismatched_lengths_uses_shortest() {
        let mixer = SpatialMixer::new(-0.3);
        
        // This test documents current behavior - uses first stem's length
        let stem1 = BinauralSignal::new(vec![0.1; 100], vec![0.1; 100]);
        let stem2 = BinauralSignal::new(vec![0.2; 200], vec![0.2; 200]);
        
        let mixed = mixer.mix(&[stem1, stem2]).unwrap();
        
        // Mixed length matches first stem
        assert_eq!(mixed.len(), 100);
    }

    #[test]
    fn test_limiter_with_alternating_signal() {
        let mixer = SpatialMixer::new(-0.3);
        let mut samples = vec![1.5, -1.5, 1.5, -1.5];
        
        mixer.apply_limiter(&mut samples).unwrap();
        
        let threshold = SpatialMixer::db_to_linear(-0.3);
        for &sample in &samples {
            assert!(sample.abs() <= threshold + 0.01);
        }
    }

    #[test]
    fn test_zero_threshold_limiter() {
        // Edge case: 0 dB threshold (linear = 1.0)
        let mixer = SpatialMixer::new(0.0);
        let mut samples = vec![1.5, 0.5];
        
        mixer.apply_limiter(&mut samples).unwrap();
        
        // Should limit to ~1.0
        assert!(samples[0] <= 1.01);
        assert_relative_eq!(samples[1], 0.5, epsilon = 0.01); // Under threshold, unchanged
    }
}

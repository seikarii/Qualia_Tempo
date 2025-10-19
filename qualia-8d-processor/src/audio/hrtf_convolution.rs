//! # Responsibility
//! Applies HRTF spatial audio processing via convolution.

use anyhow::Result;
use super::SphericalPosition;

/// # Responsibility
/// Stereo output from HRTF processing.
#[derive(Debug, Clone)]
pub struct BinauralSignal {
    pub left: Vec<f32>,
    pub right: Vec<f32>,
}

impl BinauralSignal {
    /// Create a new binaural signal
    pub fn new(left: Vec<f32>, right: Vec<f32>) -> Self {
        Self { left, right }
    }

    /// Get signal length in samples
    pub fn len(&self) -> usize {
        self.left.len()
    }

    /// Check if signal is empty
    pub fn is_empty(&self) -> bool {
        self.left.is_empty()
    }
}

/// # Responsibility
/// Convolves audio with HRTF impulse responses for spatial audio.
/// 
/// MVP implementation uses simplified panning model.
/// Production will use real SOFA datasets.
pub struct HRTFConvolver {
    sample_rate: u32,
}

impl HRTFConvolver {
    pub fn new(sample_rate: u32) -> Result<Self> {
        Ok(Self { sample_rate })
    }

    /// Convolve mono input with HRTF for given position
    /// MVP: Uses intensity panning + ITD for simplicity
    pub fn convolve(&self, input: &[f32], position: &SphericalPosition) -> Result<BinauralSignal> {
        // Calculate panning based on azimuth
        let (left_gain, right_gain) = self.calculate_panning(position.azimuth_deg);
        
        // Calculate interaural time difference (ITD)
        let itd_samples = self.calculate_itd(position.azimuth_deg);
        
        // Apply gains and delays
        let left = self.apply_gain_and_delay(input, left_gain, itd_samples.max(0));
        let right = self.apply_gain_and_delay(input, right_gain, itd_samples.min(0).abs());
        
        Ok(BinauralSignal::new(left, right))
    }

    /// Calculate stereo panning gains from azimuth
    fn calculate_panning(&self, azimuth_deg: f32) -> (f32, f32) {
        // Normalize azimuth to -180 to 180
        let az = ((azimuth_deg + 180.0) % 360.0) - 180.0;
        
        // Constant power panning
        // Negate to match standard audio coordinates (90=right, 270=left)
        let angle_rad = -(az / 180.0) * std::f32::consts::PI / 2.0;
        let left_gain = (std::f32::consts::PI / 4.0 - angle_rad).cos();
        let right_gain = (std::f32::consts::PI / 4.0 + angle_rad).cos();
        
        (left_gain, right_gain)
    }

    /// Calculate ITD in samples (simplified model)
    fn calculate_itd(&self, azimuth_deg: f32) -> i32 {
        // Max ITD ~700 microseconds for human head
        let max_itd_sec = 0.0007;
        let max_itd_samples = (max_itd_sec * self.sample_rate as f32) as i32;
        
        // Sin of azimuth gives direction
        let az_rad = azimuth_deg.to_radians();
        (az_rad.sin() * max_itd_samples as f32) as i32
    }

    /// Apply gain and delay to signal
    fn apply_gain_and_delay(&self, input: &[f32], gain: f32, delay_samples: i32) -> Vec<f32> {
        let delay = delay_samples.max(0) as usize;
        let mut output = vec![0.0; input.len() + delay];
        
        for (i, &sample) in input.iter().enumerate() {
            output[i + delay] = sample * gain;
        }
        
        output.truncate(input.len());
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_binaural_signal_creation() {
        let signal = BinauralSignal::new(vec![1.0, 2.0], vec![3.0, 4.0]);
        assert_eq!(signal.len(), 2);
        assert!(!signal.is_empty());
    }

    #[test]
    fn test_hrtf_convolver_creation() {
        let convolver = HRTFConvolver::new(48000);
        assert!(convolver.is_ok());
    }

    #[test]
    fn test_panning_center() {
        let convolver = HRTFConvolver::new(48000).unwrap();
        let (left, right) = convolver.calculate_panning(0.0);
        
        // Center should have equal gains
        assert_relative_eq!(left, right, epsilon = 0.01);
    }

    #[test]
    fn test_panning_hard_left() {
        let convolver = HRTFConvolver::new(48000).unwrap();
        let (left, right) = convolver.calculate_panning(270.0); // Left
        
        // Left should be stronger
        assert!(left > right);
    }

    #[test]
    fn test_panning_hard_right() {
        let convolver = HRTFConvolver::new(48000).unwrap();
        let (left, right) = convolver.calculate_panning(90.0); // Right
        
        // Right should be stronger
        assert!(right > left);
    }

    #[test]
    fn test_itd_calculation() {
        let convolver = HRTFConvolver::new(48000).unwrap();
        
        // Center should have zero ITD
        let itd_center = convolver.calculate_itd(0.0);
        assert_eq!(itd_center, 0);
        
        // Right should have positive ITD
        let itd_right = convolver.calculate_itd(90.0);
        assert!(itd_right > 0);
        
        // Left should have negative ITD
        let itd_left = convolver.calculate_itd(270.0);
        assert!(itd_left < 0);
    }

    #[test]
    fn test_convolve_preserves_length() {
        let convolver = HRTFConvolver::new(48000).unwrap();
        let input = vec![0.5; 1000];
        let position = SphericalPosition {
            azimuth_deg: 45.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let result = convolver.convolve(&input, &position).unwrap();
        assert_eq!(result.left.len(), input.len());
        assert_eq!(result.right.len(), input.len());
    }

    #[test]
    fn test_convolve_not_silent() {
        let convolver = HRTFConvolver::new(48000).unwrap();
        let input = vec![1.0; 100];
        let position = SphericalPosition {
            azimuth_deg: 0.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let result = convolver.convolve(&input, &position).unwrap();
        
        // Check that output is not all zeros
        let left_sum: f32 = result.left.iter().sum();
        let right_sum: f32 = result.right.iter().sum();
        
        assert!(left_sum > 0.0);
        assert!(right_sum > 0.0);
    }
}

//! # Responsibility
//! Applies parametric EQ frequency boosting based on presets.

use crate::config::EQBand;
use anyhow::Result;
use std::collections::HashMap;

/// # Responsibility
/// Applies frequency-selective boosts using biquad filters.
pub struct FrequencyBooster {
    presets: HashMap<String, Vec<EQBand>>,
    sample_rate: u32,
}

impl FrequencyBooster {
    pub fn new(presets: HashMap<String, Vec<EQBand>>, sample_rate: u32) -> Self {
        Self {
            presets,
            sample_rate,
        }
    }

    /// Apply EQ preset to input signal
    pub fn apply(&self, input: &[f32], preset_name: &str) -> Result<Vec<f32>> {
        let bands = self.presets.get(preset_name)
            .ok_or_else(|| anyhow::anyhow!("Preset not found: {}", preset_name))?;
        
        let mut output = input.to_vec();
        
        for band in bands {
            output = self.apply_biquad_peaking(&output, band.freq, band.gain_db, band.q)?;
        }
        
        Ok(output)
    }

    /// Apply biquad peaking EQ filter
    fn apply_biquad_peaking(&self, input: &[f32], freq_hz: f32, gain_db: f32, q: f32) -> Result<Vec<f32>> {
        // Biquad coefficients for peaking EQ (Audio EQ Cookbook)
        let a = 10_f32.powf(gain_db / 40.0);
        let omega = 2.0 * std::f32::consts::PI * freq_hz / self.sample_rate as f32;
        let sin_omega = omega.sin();
        let cos_omega = omega.cos();
        let alpha = sin_omega / (2.0 * q);

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_omega;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha / a;

        // Normalize coefficients
        let b0_norm = b0 / a0;
        let b1_norm = b1 / a0;
        let b2_norm = b2 / a0;
        let a1_norm = a1 / a0;
        let a2_norm = a2 / a0;

        // Apply filter
        let mut output = vec![0.0; input.len()];
        let mut x1 = 0.0;
        let mut x2 = 0.0;
        let mut y1 = 0.0;
        let mut y2 = 0.0;

        for (i, &x0) in input.iter().enumerate() {
            output[i] = b0_norm * x0 + b1_norm * x1 + b2_norm * x2 - a1_norm * y1 - a2_norm * y2;
            
            x2 = x1;
            x1 = x0;
            y2 = y1;
            y1 = output[i];
        }

        Ok(output)
    }

    /// Check if preset exists
    pub fn has_preset(&self, preset_name: &str) -> bool {
        self.presets.contains_key(preset_name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_booster() -> FrequencyBooster {
        let mut presets = HashMap::new();
        presets.insert("test".to_string(), vec![
            EQBand {
                freq: 1000.0,
                gain_db: 6.0,
                q: 1.0,
            },
        ]);
        FrequencyBooster::new(presets, 48000)
    }

    #[test]
    fn test_frequency_booster_creation() {
        let booster = create_test_booster();
        assert!(booster.has_preset("test"));
        assert!(!booster.has_preset("nonexistent"));
    }

    #[test]
    fn test_apply_with_valid_preset() {
        let booster = create_test_booster();
        let input = vec![0.1; 1000];
        
        let result = booster.apply(&input, "test");
        assert!(result.is_ok());
        
        let output = result.unwrap();
        assert_eq!(output.len(), input.len());
    }

    #[test]
    fn test_apply_with_invalid_preset() {
        let booster = create_test_booster();
        let input = vec![0.1; 1000];
        
        let result = booster.apply(&input, "invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_biquad_filter_preserves_length() {
        let booster = create_test_booster();
        let input = vec![0.5; 2000];
        
        let result = booster.apply_biquad_peaking(&input, 1000.0, 6.0, 1.0);
        assert!(result.is_ok());
        
        let output = result.unwrap();
        assert_eq!(output.len(), input.len());
    }

    #[test]
    fn test_biquad_filter_not_silent() {
        let booster = create_test_booster();
        let input = vec![0.5; 1000];
        
        let output = booster.apply_biquad_peaking(&input, 1000.0, 6.0, 1.0).unwrap();
        
        // Output should not be all zeros
        let sum: f32 = output.iter().map(|s| s.abs()).sum();
        assert!(sum > 0.0);
    }

    #[test]
    fn test_boost_increases_amplitude() {
        let booster = create_test_booster();
        
        // Generate sine wave at 1000 Hz (matches EQ frequency)
        let sample_rate = 48000;
        let duration = 0.1;
        let freq = 1000.0;
        let input: Vec<f32> = (0..(sample_rate as f32 * duration) as usize)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * freq * t).sin() * 0.1
            })
            .collect();
        
        let output = booster.apply(&input, "test").unwrap();
        
        // Peak should be higher after boost
        let input_peak = input.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        let output_peak = output.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        
        assert!(output_peak > input_peak);
    }

    #[test]
    fn test_multiple_bands() {
        let mut presets = HashMap::new();
        presets.insert("multi".to_string(), vec![
            EQBand { freq: 100.0, gain_db: 3.0, q: 0.7 },
            EQBand { freq: 1000.0, gain_db: 6.0, q: 1.0 },
            EQBand { freq: 5000.0, gain_db: 2.0, q: 1.5 },
        ]);
        
        let booster = FrequencyBooster::new(presets, 48000);
        let input = vec![0.1; 2000];
        
        let result = booster.apply(&input, "multi");
        assert!(result.is_ok());
    }
}

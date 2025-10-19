//! # Responsibility
//! Creates ensemble effect by duplicating audio with micro-delays and pitch shifts.
//!
//! Generates 7-13 virtual voices with randomized delays (±5ms) and pitch shifts (±3 cents)
//! to create rich, dense sound field characteristic of 8D audio.

use anyhow::{Result, bail};
use rand::Rng;

/// Configuration for ensemble effect generation
#[derive(Debug, Clone)]
pub struct EnsembleConfig {
    pub num_voices: usize,          // Number of virtual voices (7-13 recommended)
    pub max_delay_ms: f32,          // Maximum delay spread in milliseconds (typically 5ms)
    pub max_pitch_shift_cents: f32, // Maximum pitch shift in cents (typically 3 cents)
    pub sample_rate: u32,           // Audio sample rate in Hz
}

impl EnsembleConfig {
    pub fn new(num_voices: usize, max_delay_ms: f32, max_pitch_shift_cents: f32, sample_rate: u32) -> Result<Self> {
        if num_voices < 1 {
            bail!("Number of voices must be at least 1, got {}", num_voices);
        }
        
        if max_delay_ms < 0.0 {
            bail!("Max delay must be non-negative, got {}", max_delay_ms);
        }
        
        if sample_rate == 0 {
            bail!("Sample rate must be non-zero");
        }

        Ok(Self {
            num_voices,
            max_delay_ms,
            max_pitch_shift_cents,
            sample_rate,
        })
    }

    /// Convert delay in milliseconds to samples
    pub fn delay_ms_to_samples(&self, delay_ms: f32) -> usize {
        ((delay_ms / 1000.0) * self.sample_rate as f32).round() as usize
    }
}

/// Single voice in the ensemble with delay and pitch shift parameters
#[derive(Debug, Clone)]
pub struct Voice {
    pub delay_samples: usize,
    pub pitch_shift_cents: f32,
    pub gain: f32, // Amplitude scaling (typically 1.0 / num_voices for normalization)
}

/// Ensemble effect processor
pub struct EnsembleEffect {
    #[allow(dead_code)] // Reserved for future configuration queries
    config: EnsembleConfig,
    voices: Vec<Voice>,
}

impl EnsembleEffect {
    /// Create new ensemble effect with specified configuration
    pub fn new(config: EnsembleConfig) -> Self {
        let mut rng = rand::thread_rng();
        let gain = 1.0 / config.num_voices as f32;

        let voices: Vec<Voice> = (0..config.num_voices)
            .map(|_| {
                // Random delay between -max_delay_ms and +max_delay_ms
                let delay_ms = rng.gen_range(-config.max_delay_ms..=config.max_delay_ms);
                let delay_samples = if delay_ms >= 0.0 {
                    config.delay_ms_to_samples(delay_ms)
                } else {
                    0 // Negative delays not supported in simple implementation
                };

                // Random pitch shift between -max_pitch_shift and +max_pitch_shift
                let pitch_shift_cents = rng.gen_range(
                    -config.max_pitch_shift_cents..=config.max_pitch_shift_cents
                );

                Voice {
                    delay_samples,
                    pitch_shift_cents,
                    gain,
                }
            })
            .collect();

        Self { config, voices }
    }

    /// Process input samples through ensemble effect
    ///
    /// # Arguments
    /// * `input` - Mono input samples
    ///
    /// # Returns
    /// Processed output with ensemble effect applied
    pub fn process(&self, input: &[f32]) -> Vec<f32> {
        if input.is_empty() {
            return Vec::new();
        }

        // Calculate max delay to determine output buffer size
        let max_delay = self.voices.iter()
            .map(|v| v.delay_samples)
            .max()
            .unwrap_or(0);

        let output_len = input.len() + max_delay;
        let mut output = vec![0.0; output_len];

        // Sum all voices (simplified: ignores pitch shift for now)
        for voice in &self.voices {
            for (i, &sample) in input.iter().enumerate() {
                let output_idx = i + voice.delay_samples;
                if output_idx < output.len() {
                    // TODO: Apply pitch shift using resampling
                    output[output_idx] += sample * voice.gain;
                }
            }
        }

        output
    }

    pub fn num_voices(&self) -> usize {
        self.voices.len()
    }

    pub fn voices(&self) -> &[Voice] {
        &self.voices
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_ensemble_config_creation() {
        let config = EnsembleConfig::new(10, 5.0, 3.0, 48000).unwrap();
        assert_eq!(config.num_voices, 10);
        assert_relative_eq!(config.max_delay_ms, 5.0);
        assert_relative_eq!(config.max_pitch_shift_cents, 3.0);
        assert_eq!(config.sample_rate, 48000);
    }

    #[test]
    fn test_ensemble_config_zero_voices() {
        let result = EnsembleConfig::new(0, 5.0, 3.0, 48000);
        assert!(result.is_err());
    }

    #[test]
    fn test_ensemble_config_negative_delay() {
        let result = EnsembleConfig::new(10, -5.0, 3.0, 48000);
        assert!(result.is_err());
    }

    #[test]
    fn test_ensemble_config_zero_sample_rate() {
        let result = EnsembleConfig::new(10, 5.0, 3.0, 0);
        assert!(result.is_err());
    }

    #[test]
    fn test_delay_ms_to_samples_conversion() {
        let config = EnsembleConfig::new(10, 5.0, 3.0, 48000).unwrap();
        
        // 1ms at 48kHz = 48 samples
        assert_eq!(config.delay_ms_to_samples(1.0), 48);
        
        // 5ms at 48kHz = 240 samples
        assert_eq!(config.delay_ms_to_samples(5.0), 240);
    }

    #[test]
    fn test_ensemble_effect_creation() {
        let config = EnsembleConfig::new(10, 5.0, 3.0, 48000).unwrap();
        let effect = EnsembleEffect::new(config);
        
        assert_eq!(effect.num_voices(), 10);
        
        // Verify gain normalization
        for voice in effect.voices() {
            assert_relative_eq!(voice.gain, 0.1, epsilon = 0.001);
        }
    }

    #[test]
    fn test_ensemble_process_preserves_dc_offset() {
        let config = EnsembleConfig::new(5, 0.5, 0.0, 48000).unwrap(); // Smaller delay spread
        let effect = EnsembleEffect::new(config);
        
        // DC signal (constant 1.0)
        let input = vec![1.0; 500]; // Longer input
        let output = effect.process(&input);
        
        // With normalized gains, total energy should be preserved
        // Check that peak value doesn't exceed original (no gain boost)
        let max_output = output.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));
        assert!(max_output <= 1.1, "Output should not significantly exceed input peak");
        
        // Check that output contains non-zero values (effect is active)
        let sum: f32 = output.iter().sum();
        assert!(sum > 0.0, "Output should contain signal energy");
    }

    #[test]
    fn test_ensemble_process_empty_input() {
        let config = EnsembleConfig::new(5, 1.0, 0.0, 48000).unwrap();
        let effect = EnsembleEffect::new(config);
        
        let output = effect.process(&[]);
        assert!(output.is_empty());
    }

    #[test]
    fn test_ensemble_output_length() {
        let config = EnsembleConfig::new(3, 2.0, 0.0, 48000).unwrap();
        let effect = EnsembleEffect::new(config);
        
        let input = vec![1.0; 100];
        let output = effect.process(&input);
        
        // Output should be longer than input due to delays
        assert!(output.len() >= input.len());
    }

    #[test]
    fn test_voice_delays_within_bounds() {
        let config = EnsembleConfig::new(20, 5.0, 3.0, 48000).unwrap();
        let max_expected_delay = config.delay_ms_to_samples(5.0);
        let effect = EnsembleEffect::new(config);
        
        for voice in effect.voices() {
            assert!(voice.delay_samples <= max_expected_delay);
        }
    }

    #[test]
    fn test_voice_pitch_shifts_within_bounds() {
        let config = EnsembleConfig::new(20, 5.0, 3.0, 48000).unwrap();
        let effect = EnsembleEffect::new(config);
        
        for voice in effect.voices() {
            assert!(voice.pitch_shift_cents >= -3.0);
            assert!(voice.pitch_shift_cents <= 3.0);
        }
    }
}

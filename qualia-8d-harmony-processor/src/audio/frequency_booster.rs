//! # Responsibility
//! Parametric equalizer with biquad filters for frequency enhancement.
//!
//! Boosts bass (60-100Hz), mids (250-800Hz), and highs (8-12kHz) using
//! second-order IIR filters for musical frequency shaping.

use std::f32::consts::PI;
use anyhow::{Result, bail};

/// Biquad filter coefficients for second-order IIR filtering
#[derive(Debug, Clone, Copy)]
pub struct BiquadCoefficients {
    pub b0: f32,
    pub b1: f32,
    pub b2: f32,
    pub a1: f32,
    pub a2: f32,
}

impl BiquadCoefficients {
    /// Create peaking EQ filter coefficients
    ///
    /// # Arguments
    /// * `frequency` - Center frequency in Hz
    /// * `gain_db` - Gain in decibels (positive = boost, negative = cut)
    /// * `q` - Quality factor (bandwidth), typically 0.5-2.0
    /// * `sample_rate` - Sample rate in Hz
    pub fn peaking_eq(frequency: f32, gain_db: f32, q: f32, sample_rate: u32) -> Result<Self> {
        if frequency <= 0.0 || frequency >= sample_rate as f32 / 2.0 {
            bail!("Frequency {} Hz out of valid range for sample rate {}", frequency, sample_rate);
        }
        
        if q <= 0.0 {
            bail!("Q factor must be positive, got {}", q);
        }

        let w0 = 2.0 * PI * frequency / sample_rate as f32;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);
        let a = 10.0_f32.powf(gain_db / 40.0);

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;

        // Normalize by a0
        Ok(Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
        })
    }
}

/// Biquad filter state for processing audio
#[derive(Debug, Clone)]
pub struct BiquadFilter {
    coeffs: BiquadCoefficients,
    x1: f32, // Previous input 1
    x2: f32, // Previous input 2
    y1: f32, // Previous output 1
    y2: f32, // Previous output 2
}

impl BiquadFilter {
    pub fn new(coeffs: BiquadCoefficients) -> Self {
        Self {
            coeffs,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// Process single sample through biquad filter
    pub fn process_sample(&mut self, input: f32) -> f32 {
        let output = self.coeffs.b0 * input
            + self.coeffs.b1 * self.x1
            + self.coeffs.b2 * self.x2
            - self.coeffs.a1 * self.y1
            - self.coeffs.a2 * self.y2;

        // Update state
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;

        output
    }

    /// Process buffer of samples
    pub fn process(&mut self, input: &[f32]) -> Vec<f32> {
        input.iter().map(|&x| self.process_sample(x)).collect()
    }

    /// Reset filter state to zero
    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }
}

/// Three-band parametric EQ configuration
#[derive(Debug, Clone)]
pub struct FrequencyBoosterConfig {
    pub bass_freq: f32,      // Bass center frequency (typically 60-100 Hz)
    pub bass_gain_db: f32,   // Bass boost in dB
    pub mid_freq: f32,       // Mid center frequency (typically 250-800 Hz)
    pub mid_gain_db: f32,    // Mid boost in dB
    pub high_freq: f32,      // High center frequency (typically 8-12 kHz)
    pub high_gain_db: f32,   // High boost in dB
    pub q_factor: f32,       // Q factor for all bands (typically 1.0)
    pub sample_rate: u32,
}

impl FrequencyBoosterConfig {
    pub fn new(
        bass_freq: f32,
        bass_gain_db: f32,
        mid_freq: f32,
        mid_gain_db: f32,
        high_freq: f32,
        high_gain_db: f32,
        q_factor: f32,
        sample_rate: u32,
    ) -> Self {
        Self {
            bass_freq,
            bass_gain_db,
            mid_freq,
            mid_gain_db,
            high_freq,
            high_gain_db,
            q_factor,
            sample_rate,
        }
    }

    /// Create default 8D audio EQ configuration
    pub fn default_8d(sample_rate: u32) -> Self {
        Self {
            bass_freq: 80.0,      // 80 Hz bass
            bass_gain_db: 3.0,    // +3dB bass boost
            mid_freq: 500.0,      // 500 Hz mids
            mid_gain_db: 1.5,     // +1.5dB mid boost
            high_freq: 10000.0,   // 10 kHz highs
            high_gain_db: 2.5,    // +2.5dB high boost
            q_factor: 1.0,
            sample_rate,
        }
    }
}

/// Three-band parametric equalizer
pub struct FrequencyBooster {
    bass_filter: BiquadFilter,
    mid_filter: BiquadFilter,
    high_filter: BiquadFilter,
}

impl FrequencyBooster {
    /// Create new frequency booster with specified configuration
    pub fn new(config: FrequencyBoosterConfig) -> Result<Self> {
        let bass_coeffs = BiquadCoefficients::peaking_eq(
            config.bass_freq,
            config.bass_gain_db,
            config.q_factor,
            config.sample_rate,
        )?;

        let mid_coeffs = BiquadCoefficients::peaking_eq(
            config.mid_freq,
            config.mid_gain_db,
            config.q_factor,
            config.sample_rate,
        )?;

        let high_coeffs = BiquadCoefficients::peaking_eq(
            config.high_freq,
            config.high_gain_db,
            config.q_factor,
            config.sample_rate,
        )?;

        Ok(Self {
            bass_filter: BiquadFilter::new(bass_coeffs),
            mid_filter: BiquadFilter::new(mid_coeffs),
            high_filter: BiquadFilter::new(high_coeffs),
        })
    }

    /// Process audio through all three EQ bands (serial cascade)
    pub fn process(&mut self, input: &[f32]) -> Vec<f32> {
        let bass_out = self.bass_filter.process(input);
        let mid_out = self.mid_filter.process(&bass_out);
        self.high_filter.process(&mid_out)
    }

    /// Reset all filter states
    pub fn reset(&mut self) {
        self.bass_filter.reset();
        self.mid_filter.reset();
        self.high_filter.reset();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_biquad_coefficients_peaking_eq() {
        let coeffs = BiquadCoefficients::peaking_eq(1000.0, 6.0, 1.0, 48000).unwrap();
        
        // Coefficients should be finite
        assert!(coeffs.b0.is_finite());
        assert!(coeffs.b1.is_finite());
        assert!(coeffs.b2.is_finite());
        assert!(coeffs.a1.is_finite());
        assert!(coeffs.a2.is_finite());
    }

    #[test]
    fn test_biquad_invalid_frequency() {
        let result = BiquadCoefficients::peaking_eq(30000.0, 6.0, 1.0, 48000);
        assert!(result.is_err()); // Above Nyquist
    }

    #[test]
    fn test_biquad_negative_q() {
        let result = BiquadCoefficients::peaking_eq(1000.0, 6.0, -1.0, 48000);
        assert!(result.is_err());
    }

    #[test]
    fn test_biquad_filter_dc_signal() {
        let coeffs = BiquadCoefficients::peaking_eq(1000.0, 0.0, 1.0, 48000).unwrap(); // 0dB gain
        let mut filter = BiquadFilter::new(coeffs);
        
        // DC signal should pass through unchanged with 0dB gain
        let input = vec![1.0; 100];
        let output = filter.process(&input);
        
        // After settling, output should be close to input
        assert_relative_eq!(output[99], 1.0, epsilon = 0.1);
    }

    #[test]
    fn test_biquad_filter_reset() {
        let coeffs = BiquadCoefficients::peaking_eq(1000.0, 6.0, 1.0, 48000).unwrap();
        let mut filter = BiquadFilter::new(coeffs);
        
        // Process some signal
        filter.process(&[1.0, 2.0, 3.0]);
        
        // Reset state
        filter.reset();
        
        // State should be zeroed
        assert_eq!(filter.x1, 0.0);
        assert_eq!(filter.x2, 0.0);
        assert_eq!(filter.y1, 0.0);
        assert_eq!(filter.y2, 0.0);
    }

    #[test]
    fn test_frequency_booster_creation() {
        let config = FrequencyBoosterConfig::default_8d(48000);
        let booster = FrequencyBooster::new(config);
        assert!(booster.is_ok());
    }

    #[test]
    fn test_frequency_booster_process() {
        let config = FrequencyBoosterConfig::default_8d(48000);
        let mut booster = FrequencyBooster::new(config).unwrap();
        
        let input = vec![0.1; 100];
        let output = booster.process(&input);
        
        assert_eq!(output.len(), 100);
        
        // Output should contain signal (not all zeros)
        let sum: f32 = output.iter().sum();
        assert!(sum.abs() > 0.0);
    }

    #[test]
    fn test_frequency_booster_reset() {
        let config = FrequencyBoosterConfig::default_8d(48000);
        let mut booster = FrequencyBooster::new(config).unwrap();
        
        // Process signal
        booster.process(&[1.0; 50]);
        
        // Reset
        booster.reset();
        
        // Filters should be in clean state (verified via internal state, not exposed)
        // Test by processing again and expecting consistent output
        let output1 = booster.process(&[0.5; 10]);
        
        booster.reset();
        let output2 = booster.process(&[0.5; 10]);
        
        // After reset, same input should produce same output
        for (a, b) in output1.iter().zip(output2.iter()) {
            assert_relative_eq!(a, b, epsilon = 0.001);
        }
    }

    #[test]
    fn test_frequency_booster_serial_cascade() {
        let config = FrequencyBoosterConfig::new(
            100.0, 3.0,  // Bass: 100 Hz, +3dB
            500.0, 2.0,  // Mid: 500 Hz, +2dB
            5000.0, 1.0, // High: 5000 Hz, +1dB
            1.0,
            48000,
        );
        let mut booster = FrequencyBooster::new(config).unwrap();
        
        let input = vec![0.5; 200];
        let output = booster.process(&input);
        
        // Output length should match input
        assert_eq!(output.len(), input.len());
    }

    #[test]
    fn test_zero_gain_eq_preserves_signal() {
        let config = FrequencyBoosterConfig::new(
            100.0, 0.0,  // 0dB bass
            500.0, 0.0,  // 0dB mid
            5000.0, 0.0, // 0dB high
            1.0,
            48000,
        );
        let mut booster = FrequencyBooster::new(config).unwrap();
        
        let input = vec![0.5; 200];
        let output = booster.process(&input);
        
        // With 0dB gain, output should be very close to input after settling
        let settled_output = &output[100..];
        let settled_input = &input[100..];
        
        let avg_output: f32 = settled_output.iter().sum::<f32>() / settled_output.len() as f32;
        let avg_input: f32 = settled_input.iter().sum::<f32>() / settled_input.len() as f32;
        
        assert_relative_eq!(avg_output, avg_input, epsilon = 0.1);
    }
}

//! # Responsibility
//! Dynamic parametric equalizer with intensity-driven gain and instrument-specific profiles.
//!
//! Boosts bass/mids/highs using biquad filters with dynamic gain modulation based on
//! audio intensity. Supports role-based presets (Bass, Vocals, Drums, Other) for optimal enhancement.

use std::f32::consts::PI;
use anyhow::{Result, bail};

/// Instrument role for role-specific EQ profiles
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstrumentRole {
    Bass,      // Sub-bass + low-end emphasis
    Vocals,    // Mid-high clarity + presence
    Drums,     // Transient punch + sub-bass
    Other,     // Balanced enhancement
}

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

/// Three-band parametric EQ configuration with dynamic gain
#[derive(Debug, Clone)]
pub struct FrequencyBoosterConfig {
    pub bass_freq: f32,          // Bass center frequency (typically 60-100 Hz)
    pub bass_base_gain_db: f32,  // Base bass gain at intensity=0.0
    pub bass_max_gain_db: f32,   // Max bass gain at intensity=1.0
    pub mid_freq: f32,           // Mid center frequency (typically 250-800 Hz)
    pub mid_base_gain_db: f32,   // Base mid gain
    pub mid_max_gain_db: f32,    // Max mid gain
    pub high_freq: f32,          // High center frequency (typically 8-12 kHz)
    pub high_base_gain_db: f32,  // Base high gain
    pub high_max_gain_db: f32,   // Max high gain
    pub q_factor: f32,           // Q factor for all bands (typically 1.0)
    pub sample_rate: u32,
}

impl FrequencyBoosterConfig {
    /// Create configuration for specific instrument role with dynamic gain
    ///
    /// # Arguments
    /// * `role` - Instrument role (Bass, Vocals, Drums, Other)
    /// * `sample_rate` - Audio sample rate
    ///
    /// # Returns
    /// EQ config optimized for role with intensity-driven gain ranges
    pub fn for_role(role: InstrumentRole, sample_rate: u32) -> Self {
        match role {
            InstrumentRole::Bass => Self {
                bass_freq: 65.0,
                bass_base_gain_db: 2.5,   // Base: +2.5dB
                bass_max_gain_db: 7.0,    // Climax: +7.0dB (DRAMATIC)
                mid_freq: 250.0,
                mid_base_gain_db: 0.0,    // No mid boost for bass
                mid_max_gain_db: 1.0,
                high_freq: 5000.0,
                high_base_gain_db: -1.0,  // Reduce harshness
                high_max_gain_db: 0.0,
                q_factor: 0.8,            // Wider bass Q
                sample_rate,
            },
            InstrumentRole::Vocals => Self {
                bass_freq: 150.0,
                bass_base_gain_db: 0.0,   // Minimal low-end
                bass_max_gain_db: 1.0,
                mid_freq: 2500.0,         // Vocal presence peak
                mid_base_gain_db: 1.5,    // Base: +1.5dB
                mid_max_gain_db: 5.0,     // Climax: +5.0dB (CUT THROUGH MIX)
                high_freq: 10000.0,       // Air/breath
                high_base_gain_db: 2.0,
                high_max_gain_db: 4.0,
                q_factor: 1.5,            // Focused mid Q
                sample_rate,
            },
            InstrumentRole::Drums => Self {
                bass_freq: 80.0,          // Kick drum
                bass_base_gain_db: 3.0,
                bass_max_gain_db: 6.0,
                mid_freq: 3000.0,         // Snare attack
                mid_base_gain_db: 2.0,
                mid_max_gain_db: 4.0,
                high_freq: 12000.0,       // Cymbals/hi-hats
                high_base_gain_db: 2.5,
                high_max_gain_db: 5.0,
                q_factor: 1.2,
                sample_rate,
            },
            InstrumentRole::Other => Self {
                bass_freq: 70.0,
                bass_base_gain_db: 2.0,
                bass_max_gain_db: 4.0,
                mid_freq: 1200.0,
                mid_base_gain_db: 1.0,
                mid_max_gain_db: 3.0,
                high_freq: 10000.0,
                high_base_gain_db: 2.5,
                high_max_gain_db: 4.0,
                q_factor: 1.0,
                sample_rate,
            },
        }
    }

    /// Create default 8D audio EQ configuration (legacy, for backward compatibility)
    pub fn default_8d(sample_rate: u32) -> Self {
        Self::for_role(InstrumentRole::Other, sample_rate)
    }
    
    /// Calculate dynamic gains based on intensity
    ///
    /// # Arguments
    /// * `intensity` - Intensity score [0.0, 1.0]
    ///
    /// # Returns
    /// (bass_gain, mid_gain, high_gain) in dB
    pub fn calculate_dynamic_gains(&self, intensity: f32) -> (f32, f32, f32) {
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        
        let bass_gain = self.bass_base_gain_db + 
            (self.bass_max_gain_db - self.bass_base_gain_db) * intensity_clamped;
        let mid_gain = self.mid_base_gain_db + 
            (self.mid_max_gain_db - self.mid_base_gain_db) * intensity_clamped;
        let high_gain = self.high_base_gain_db + 
            (self.high_max_gain_db - self.high_base_gain_db) * intensity_clamped;
        
        (bass_gain, mid_gain, high_gain)
    }
}

/// Three-band parametric equalizer with dynamic gain
pub struct FrequencyBooster {
    config: FrequencyBoosterConfig,
}

impl FrequencyBooster {
    /// Create new frequency booster with specified configuration
    pub fn new(config: FrequencyBoosterConfig) -> Result<Self> {
        Ok(Self { config })
    }
    
    /// Get immutable reference to configuration
    pub fn config(&self) -> &FrequencyBoosterConfig {
        &self.config
    }

    /// Process audio with dynamic intensity-driven EQ
    ///
    /// # Arguments
    /// * `input` - Input audio samples
    /// * `intensity` - Intensity score [0.0, 1.0] for dynamic gain
    ///
    /// # Returns
    /// EQ-processed samples with intensity-modulated gain
    pub fn process(&mut self, input: &[f32], intensity: f32) -> Result<Vec<f32>> {
        // Calculate dynamic gains
        let (bass_gain, mid_gain, high_gain) = self.config.calculate_dynamic_gains(intensity);
        
        // Create filters with dynamic gains
        let bass_coeffs = BiquadCoefficients::peaking_eq(
            self.config.bass_freq,
            bass_gain,
            self.config.q_factor,
            self.config.sample_rate,
        )?;

        let mid_coeffs = BiquadCoefficients::peaking_eq(
            self.config.mid_freq,
            mid_gain,
            self.config.q_factor,
            self.config.sample_rate,
        )?;

        let high_coeffs = BiquadCoefficients::peaking_eq(
            self.config.high_freq,
            high_gain,
            self.config.q_factor,
            self.config.sample_rate,
        )?;
        
        let mut bass_filter = BiquadFilter::new(bass_coeffs);
        let mut mid_filter = BiquadFilter::new(mid_coeffs);
        let mut high_filter = BiquadFilter::new(high_coeffs);
        
        tracing::debug!(
            intensity = intensity,
            bass_gain_db = bass_gain,
            mid_gain_db = mid_gain,
            high_gain_db = high_gain,
            "Dynamic EQ: intensity={:.2} → bass={:.1}dB, mid={:.1}dB, high={:.1}dB",
            intensity, bass_gain, mid_gain, high_gain
        );
        
        // Serial cascade processing
        let bass_out = bass_filter.process(input);
        let mid_out = mid_filter.process(&bass_out);
        Ok(high_filter.process(&mid_out))
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
        let config = FrequencyBoosterConfig::for_role(InstrumentRole::Vocals, 48000);
        let booster = FrequencyBooster::new(config);
        assert!(booster.is_ok());
    }
    
    #[test]
    fn test_dynamic_gain_calculation() {
        let config = FrequencyBoosterConfig::for_role(InstrumentRole::Bass, 48000);
        
        let (bass_low, _, _) = config.calculate_dynamic_gains(0.0);
        let (bass_high, _, _) = config.calculate_dynamic_gains(1.0);
        
        assert_relative_eq!(bass_low, 2.5);  // Base gain
        assert_relative_eq!(bass_high, 7.0); // Max gain
        assert!(bass_high > bass_low);
    }

    #[test]
    fn test_frequency_booster_process() {
        let config = FrequencyBoosterConfig::default_8d(48000);
        let mut booster = FrequencyBooster::new(config).unwrap();
        
        let input = vec![0.1; 100];
        let output = booster.process(&input, 0.5).unwrap();
        
        assert_eq!(output.len(), 100);
        
        // Output should contain signal (not all zeros)
        let sum: f32 = output.iter().sum();
        assert!(sum.abs() > 0.0);
    }

    #[test]
    fn test_role_specific_configs() {
        let bass_config = FrequencyBoosterConfig::for_role(InstrumentRole::Bass, 48000);
        let vocal_config = FrequencyBoosterConfig::for_role(InstrumentRole::Vocals, 48000);
        
        // Bass should emphasize low-end
        assert!(bass_config.bass_max_gain_db > vocal_config.bass_max_gain_db);
        
        // Vocals should emphasize mids
        assert!(vocal_config.mid_max_gain_db > bass_config.mid_max_gain_db);
    }
}

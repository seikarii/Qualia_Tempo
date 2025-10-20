//! # Responsibility
//! Psychoacoustic bass enhancement via harmonic generation (Missing Fundamental illusion).
//!
//! Extracts low-frequency fundamentals (20-150Hz), generates 2x and 3x harmonics,
//! and blends them back to create perceived bass depth without increasing low-end energy.

use anyhow::{Result, bail};
use std::f32::consts::PI;

/// # Responsibility
/// Configuration for psychoacoustic bass enhancement.
#[derive(Debug, Clone)]
pub struct PsychoacousticBassConfig {
    /// Cutoff frequency for bass extraction (typically 150Hz)
    pub bass_cutoff_hz: f32,
    
    /// Gain for 2x harmonic (octave above fundamental)
    pub harmonic_2x_gain: f32,
    
    /// Gain for 3x harmonic (perfect fifth above octave)
    pub harmonic_3x_gain: f32,
    
    pub sample_rate: u32,
}

impl PsychoacousticBassConfig {
    pub fn new(sample_rate: u32) -> Result<Self> {
        if sample_rate == 0 {
            bail!("Sample rate must be non-zero");
        }
        
        Ok(Self {
            bass_cutoff_hz: 150.0,
            harmonic_2x_gain: 0.4,  // Subtle 2x harmonic
            harmonic_3x_gain: 0.2,  // Even more subtle 3x harmonic
            sample_rate,
        })
    }
    
    pub fn validate(&self) -> Result<()> {
        if self.bass_cutoff_hz <= 0.0 || self.bass_cutoff_hz > 500.0 {
            bail!("bass_cutoff_hz must be in (0, 500], got {}", self.bass_cutoff_hz);
        }
        
        if self.harmonic_2x_gain < 0.0 || self.harmonic_2x_gain > 1.0 {
            bail!("harmonic_2x_gain must be in [0, 1], got {}", self.harmonic_2x_gain);
        }
        
        if self.harmonic_3x_gain < 0.0 || self.harmonic_3x_gain > 1.0 {
            bail!("harmonic_3x_gain must be in [0, 1], got {}", self.harmonic_3x_gain);
        }
        
        Ok(())
    }
}

/// # Responsibility
/// Simple biquad filter for lowpass/highpass operations.
///
/// Uses Direct Form I implementation for stability.
#[derive(Debug, Clone)]
struct BiquadFilter {
    // Coefficients
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    
    // State (Direct Form I)
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadFilter {
    /// Create lowpass Butterworth filter
    fn lowpass(cutoff_hz: f32, sample_rate: u32, q: f32) -> Self {
        let omega = 2.0 * PI * cutoff_hz / sample_rate as f32;
        let sin_omega = omega.sin();
        let cos_omega = omega.cos();
        let alpha = sin_omega / (2.0 * q);
        
        let b0 = (1.0 - cos_omega) / 2.0;
        let b1 = 1.0 - cos_omega;
        let b2 = (1.0 - cos_omega) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;
        
        // Normalize by a0
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }
    
    /// Create highpass Butterworth filter
    fn highpass(cutoff_hz: f32, sample_rate: u32, q: f32) -> Self {
        let omega = 2.0 * PI * cutoff_hz / sample_rate as f32;
        let sin_omega = omega.sin();
        let cos_omega = omega.cos();
        let alpha = sin_omega / (2.0 * q);
        
        let b0 = (1.0 + cos_omega) / 2.0;
        let b1 = -(1.0 + cos_omega);
        let b2 = (1.0 + cos_omega) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;
        
        // Normalize by a0
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }
    
    /// Process single sample (Direct Form I)
    fn process_sample(&mut self, input: f32) -> f32 {
        let output = self.b0 * input + self.b1 * self.x1 + self.b2 * self.x2
                     - self.a1 * self.y1 - self.a2 * self.y2;
        
        // Update state
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;
        
        output
    }
    
    /// Process buffer (convenience method)
    fn process(&mut self, input: &[f32]) -> Vec<f32> {
        input.iter().map(|&sample| self.process_sample(sample)).collect()
    }
}

/// # Responsibility
/// Psychoacoustic bass enhancer using harmonic generation.
pub struct PsychoacousticBass {
    config: PsychoacousticBassConfig,
    lowpass: BiquadFilter,
    highpass: BiquadFilter,
}

impl PsychoacousticBass {
    pub fn new(config: PsychoacousticBassConfig) -> Result<Self> {
        config.validate()?;
        
        let q = 0.707; // Butterworth Q factor
        
        // Lowpass at 150Hz to extract bass fundamentals (20-150Hz)
        let lowpass = BiquadFilter::lowpass(
            config.bass_cutoff_hz,
            config.sample_rate,
            q,
        );
        
        // Highpass at 80Hz to remove fundamentals while preserving harmonics
        // 50Hz fundamental → 100Hz/150Hz harmonics (pass through)
        // 80Hz fundamental → 160Hz/240Hz harmonics (pass through)
        let highpass = BiquadFilter::highpass(
            80.0, // Lower cutoff to preserve 2x/3x harmonics
            config.sample_rate,
            q,
        );
        
        Ok(Self {
            config,
            lowpass,
            highpass,
        })
    }
    
    /// # Responsibility
    /// Process audio with intensity-driven harmonic enhancement.
    ///
    /// # Algorithm:
    /// 1. Extract bass fundamentals via lowpass filter
    /// 2. Generate 2x and 3x harmonics via waveshaping
    /// 3. Remove fundamentals from harmonics via highpass filter
    /// 4. Blend harmonics back with original signal, scaled by intensity
    ///
    /// # Arguments
    /// * `input` - Input audio samples
    /// * `intensity` - Enhancement strength [0.0, 1.0]
    ///
    /// # Returns
    /// Enhanced audio with psychoacoustic bass boost
    pub fn process(&mut self, input: &[f32], intensity: f32) -> Result<Vec<f32>> {
        if input.is_empty() {
            return Ok(Vec::new());
        }
        
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        
        if intensity_clamped < 0.01 {
            // Skip processing if intensity negligible
            return Ok(input.to_vec());
        }
        
        // Step 1: Extract bass fundamentals (20-150Hz)
        let bass_signal = self.lowpass.process(input);
        
        // Step 2: Generate harmonics via waveshaping (soft saturation)
        let harmonic_2x: Vec<f32> = bass_signal
            .iter()
            .map(|&x| {
                let doubled = x * 2.0;
                // Soft clipping to prevent harsh distortion
                (doubled * 1.5).tanh() * self.config.harmonic_2x_gain
            })
            .collect();
        
        let harmonic_3x: Vec<f32> = bass_signal
            .iter()
            .map(|&x| {
                let tripled = x * 3.0;
                // Soft clipping
                (tripled * 1.5).tanh() * self.config.harmonic_3x_gain
            })
            .collect();
        
        // Step 3: Highpass filter harmonics to remove fundamental contamination
        let harmonic_2x_clean = self.highpass.process(&harmonic_2x);
        let harmonic_3x_clean = self.highpass.process(&harmonic_3x);
        
        // Step 4: Blend harmonics with original signal, intensity-modulated
        let output: Vec<f32> = input
            .iter()
            .enumerate()
            .map(|(i, &orig)| {
                let h2 = harmonic_2x_clean.get(i).copied().unwrap_or(0.0);
                let h3 = harmonic_3x_clean.get(i).copied().unwrap_or(0.0);
                
                // Mix: original + intensity * (harmonics)
                orig + intensity_clamped * (h2 + h3)
            })
            .collect();
        
        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    
    #[test]
    fn test_config_creation() {
        let config = PsychoacousticBassConfig::new(48000).unwrap();
        assert_relative_eq!(config.bass_cutoff_hz, 150.0);
        assert_relative_eq!(config.harmonic_2x_gain, 0.4);
        assert_relative_eq!(config.harmonic_3x_gain, 0.2);
    }
    
    #[test]
    fn test_config_validation_invalid_cutoff() {
        let mut config = PsychoacousticBassConfig::new(48000).unwrap();
        config.bass_cutoff_hz = 0.0;
        assert!(config.validate().is_err());
        
        config.bass_cutoff_hz = 600.0;
        assert!(config.validate().is_err());
    }
    
    #[test]
    fn test_config_validation_invalid_gains() {
        let mut config = PsychoacousticBassConfig::new(48000).unwrap();
        config.harmonic_2x_gain = -0.1;
        assert!(config.validate().is_err());
        
        config.harmonic_2x_gain = 0.4;
        config.harmonic_3x_gain = 1.5;
        assert!(config.validate().is_err());
    }
    
    #[test]
    fn test_bass_enhancer_creation() {
        let config = PsychoacousticBassConfig::new(48000).unwrap();
        let enhancer = PsychoacousticBass::new(config);
        assert!(enhancer.is_ok());
    }
    
    #[test]
    fn test_process_empty_input() {
        let config = PsychoacousticBassConfig::new(48000).unwrap();
        let mut enhancer = PsychoacousticBass::new(config).unwrap();
        
        let output = enhancer.process(&[], 0.5).unwrap();
        assert!(output.is_empty());
    }
    
    #[test]
    fn test_process_zero_intensity_passthrough() {
        let config = PsychoacousticBassConfig::new(48000).unwrap();
        let mut enhancer = PsychoacousticBass::new(config).unwrap();
        
        let input = vec![0.1, 0.2, -0.1, -0.2];
        let output = enhancer.process(&input, 0.0).unwrap();
        
        // Should pass through unmodified
        for (i, &sample) in output.iter().enumerate() {
            assert_relative_eq!(sample, input[i], epsilon = 0.001);
        }
    }
    
    #[test]
    fn test_process_adds_energy_at_high_intensity() {
        let config = PsychoacousticBassConfig::new(48000).unwrap();
        let mut enhancer = PsychoacousticBass::new(config).unwrap();
        
        // Generate 50Hz bass tone (within 20-150Hz range)
        let input: Vec<f32> = (0..1000)
            .map(|i| (2.0 * PI * 50.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        let output = enhancer.process(&input, 1.0).unwrap();
        
        // Calculate RMS of input and output
        let rms_input: f32 = input.iter().map(|&x| x * x).sum::<f32>() / input.len() as f32;
        let rms_output: f32 = output.iter().map(|&x| x * x).sum::<f32>() / output.len() as f32;
        
        // Output should have more energy due to harmonics
        assert!(
            rms_output > rms_input,
            "Enhanced signal should have higher RMS: input={}, output={}",
            rms_input.sqrt(),
            rms_output.sqrt()
        );
    }
    
    #[test]
    fn test_biquad_lowpass_attenuates_high_frequencies() {
        let mut filter = BiquadFilter::lowpass(150.0, 48000, 0.707);
        
        // 50Hz tone (should pass through)
        let low_freq: Vec<f32> = (0..1000)
            .map(|i| (2.0 * PI * 50.0 * i as f32 / 48000.0).sin())
            .collect();
        
        let filtered_low = filter.process(&low_freq);
        let rms_low: f32 = filtered_low.iter().map(|&x| x * x).sum::<f32>() / filtered_low.len() as f32;
        
        // Reset filter state
        filter.x1 = 0.0;
        filter.x2 = 0.0;
        filter.y1 = 0.0;
        filter.y2 = 0.0;
        
        // 1000Hz tone (should be attenuated)
        let high_freq: Vec<f32> = (0..1000)
            .map(|i| (2.0 * PI * 1000.0 * i as f32 / 48000.0).sin())
            .collect();
        
        let filtered_high = filter.process(&high_freq);
        let rms_high: f32 = filtered_high.iter().map(|&x| x * x).sum::<f32>() / filtered_high.len() as f32;
        
        // High frequency should be significantly attenuated
        assert!(
            rms_low.sqrt() > rms_high.sqrt() * 5.0,
            "Lowpass should attenuate high frequencies: low_rms={}, high_rms={}",
            rms_low.sqrt(),
            rms_high.sqrt()
        );
    }
    
    #[test]
    fn test_intensity_modulation() {
        let config = PsychoacousticBassConfig::new(48000).unwrap();
        let mut enhancer = PsychoacousticBass::new(config).unwrap();
        
        let input: Vec<f32> = (0..1000)
            .map(|i| (2.0 * PI * 60.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        let output_low = enhancer.process(&input, 0.2).unwrap();
        
        // Reset filter state
        enhancer = PsychoacousticBass::new(PsychoacousticBassConfig::new(48000).unwrap()).unwrap();
        
        let output_high = enhancer.process(&input, 0.8).unwrap();
        
        // Calculate RMS difference from input
        let delta_low: f32 = output_low.iter().zip(input.iter())
            .map(|(&out, &inp)| (out - inp).powi(2))
            .sum::<f32>() / output_low.len() as f32;
        
        let delta_high: f32 = output_high.iter().zip(input.iter())
            .map(|(&out, &inp)| (out - inp).powi(2))
            .sum::<f32>() / output_high.len() as f32;
        
        // High intensity should produce larger deviation
        assert!(
            delta_high > delta_low * 2.0,
            "High intensity should add more harmonics: low_delta={}, high_delta={}",
            delta_low.sqrt(),
            delta_high.sqrt()
        );
    }
}

//! # Responsibility
//! Psychoacoustic harmonic exciter for "presence", "air", and perceived clarity.
//!
//! Adds subtle even-order harmonics in 8-16kHz range to create impression of
//! higher fidelity without actual high-frequency content. Based on Aphex Aural
//! Exciter principle: asymmetric waveshaping generates harmonics that enhance
//! perceived brightness and intelligibility.

use anyhow::{Result, bail};
use biquad::{Biquad, Coefficients, DirectForm2Transposed, frequency::ToHertz, Type};

/// # Responsibility
/// Configuration for harmonic exciter effect.
#[derive(Debug, Clone)]
pub struct HarmonicExciterConfig {
    /// Highpass cutoff for exciter processing (typ. 3kHz - only excite highs)
    pub exciter_highpass_hz: f32,
    
    /// Lowpass cutoff for exciter processing (typ. 16kHz - limit ultra-highs)
    pub exciter_lowpass_hz: f32,
    
    /// Drive amount for harmonic generation [0.5, 3.0]
    pub drive_base: f32,
    pub drive_max: f32,
    
    /// Mix amount range: (min_mix, max_mix) [0.0, 1.0]
    pub mix_range: (f32, f32),
    
    pub sample_rate: u32,
}

impl HarmonicExciterConfig {
    /// Create default configuration optimized for vocal presence
    pub fn new(sample_rate: u32) -> Result<Self> {
        if sample_rate == 0 {
            bail!("Sample rate must be non-zero");
        }
        
        Ok(Self {
            exciter_highpass_hz: 3000.0,  // Only affect 3kHz+
            exciter_lowpass_hz: 16000.0,   // Limit to audible range
            drive_base: 0.8,               // Subtle at low intensity
            drive_max: 2.5,                // Aggressive at high intensity
            mix_range: (0.0, 0.4),         // 0-40% wet mix
            sample_rate,
        })
    }
    
    pub fn validate(&self) -> Result<()> {
        if self.exciter_highpass_hz <= 0.0 || self.exciter_highpass_hz >= self.exciter_lowpass_hz {
            bail!("Invalid exciter frequency range");
        }
        
        if self.drive_base <= 0.0 || self.drive_max < self.drive_base {
            bail!("Invalid drive range");
        }
        
        let (min_mix, max_mix) = self.mix_range;
        if min_mix < 0.0 || max_mix > 1.0 || max_mix < min_mix {
            bail!("Invalid mix_range: ({}, {})", min_mix, max_mix);
        }
        
        Ok(())
    }
}

/// # Responsibility
/// Harmonic exciter for psychoacoustic brightness enhancement.
pub struct HarmonicExciter {
    config: HarmonicExciterConfig,
    highpass: DirectForm2Transposed<f32>,
    lowpass: DirectForm2Transposed<f32>,
}

impl HarmonicExciter {
    pub fn new(config: HarmonicExciterConfig) -> Result<Self> {
        config.validate()?;
        
        let fs = (config.sample_rate as f32).hz();
        let q = 0.707;
        
        let highpass_coeffs = Coefficients::<f32>::from_params(
            Type::HighPass,
            fs,
            config.exciter_highpass_hz.hz(),
            q,
        ).map_err(|e| anyhow::anyhow!("Exciter highpass creation failed: {:?}", e))?;
        
        let lowpass_coeffs = Coefficients::<f32>::from_params(
            Type::LowPass,
            fs,
            config.exciter_lowpass_hz.hz(),
            q,
        ).map_err(|e| anyhow::anyhow!("Exciter lowpass creation failed: {:?}", e))?;
        
        Ok(Self {
            config,
            highpass: DirectForm2Transposed::<f32>::new(highpass_coeffs),
            lowpass: DirectForm2Transposed::<f32>::new(lowpass_coeffs),
        })
    }
    
    /// # Responsibility
    /// Process audio with intensity-driven harmonic excitement.
    ///
    /// Algorithm:
    /// 1. Bandpass 3-16kHz (isolate presence range)
    /// 2. Apply asymmetric waveshaping (even harmonics)
    /// 3. Mix back with original (intensity-modulated)
    ///
    /// # Arguments
    /// * `input` - Input audio samples
    /// * `intensity` - Enhancement strength [0.0, 1.0]
    ///
    /// # Returns
    /// Enhanced audio with psychoacoustic brightness
    pub fn process(&mut self, input: &[f32], intensity: f32) -> Result<Vec<f32>> {
        if input.is_empty() {
            return Ok(Vec::new());
        }
        
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        let (min_mix, max_mix) = self.config.mix_range;
        let wet_mix = min_mix + (max_mix - min_mix) * intensity_clamped;
        
        if wet_mix < 0.01 {
            return Ok(input.to_vec());
        }
        
        // Calculate dynamic drive
        let drive = self.config.drive_base + 
            (self.config.drive_max - self.config.drive_base) * intensity_clamped;
        
        // Step 1: Bandpass 3-16kHz
        let mut bandpassed = Vec::with_capacity(input.len());
        for &sample in input {
            let highpassed = self.highpass.run(sample);
            let bandpass_sample = self.lowpass.run(highpassed);
            bandpassed.push(bandpass_sample);
        }
        
        // Step 2: Asymmetric waveshaping (even harmonics)
        let harmonics: Vec<f32> = bandpassed
            .iter()
            .map(|&x| {
                let driven = x * drive;
                
                // Asymmetric soft clipping emphasizes even harmonics
                if driven >= 0.0 {
                    (driven * 1.5).tanh()
                } else {
                    (driven * 0.7).tanh()
                }
            })
            .collect();
        
        // Step 3: Mix with original
        let output: Vec<f32> = input
            .iter()
            .zip(harmonics.iter())
            .map(|(&dry, &excited)| {
                dry * (1.0 - wet_mix) + excited * wet_mix
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
        let config = HarmonicExciterConfig::new(48000).unwrap();
        assert_relative_eq!(config.exciter_highpass_hz, 3000.0);
        assert_relative_eq!(config.exciter_lowpass_hz, 16000.0);
    }
    
    #[test]
    fn test_exciter_creation() {
        let config = HarmonicExciterConfig::new(48000).unwrap();
        let exciter = HarmonicExciter::new(config);
        assert!(exciter.is_ok());
    }
    
    #[test]
    fn test_process_empty() {
        let config = HarmonicExciterConfig::new(48000).unwrap();
        let mut exciter = HarmonicExciter::new(config).unwrap();
        
        let output = exciter.process(&[], 0.5).unwrap();
        assert!(output.is_empty());
    }
    
    #[test]
    fn test_process_zero_intensity_passthrough() {
        let config = HarmonicExciterConfig::new(48000).unwrap();
        let mut exciter = HarmonicExciter::new(config).unwrap();
        
        let input = vec![0.5, -0.3, 0.2];
        let output = exciter.process(&input, 0.0).unwrap();
        
        for (i, &sample) in output.iter().enumerate() {
            assert_relative_eq!(sample, input[i], epsilon = 0.05);
        }
    }
    
    #[test]
    fn test_intensity_modulates_effect() {
        let config = HarmonicExciterConfig::new(48000).unwrap();
        let mut exciter_low = HarmonicExciter::new(config.clone()).unwrap();
        let mut exciter_high = HarmonicExciter::new(config).unwrap();
        
        // Generate 5kHz tone (in exciter range)
        let input: Vec<f32> = (0..1000)
            .map(|i| (2.0 * std::f32::consts::PI * 5000.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        let output_low = exciter_low.process(&input, 0.2).unwrap();
        let output_high = exciter_high.process(&input, 0.8).unwrap();
        
        let diff_low: f32 = output_low.iter().zip(input.iter())
            .map(|(&out, &inp)| (out - inp).abs())
            .sum::<f32>() / output_low.len() as f32;
        
        let diff_high: f32 = output_high.iter().zip(input.iter())
            .map(|(&out, &inp)| (out - inp).abs())
            .sum::<f32>() / output_high.len() as f32;
        
        assert!(diff_high > diff_low * 1.5, 
            "High intensity should add more harmonics: low={}, high={}", diff_low, diff_high);
    }
}

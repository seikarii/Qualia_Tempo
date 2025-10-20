//! # Responsibility
//! Dynamic parametric equalizer with intensity-driven gain and instrument-specific profiles.
//!
//! Boosts bass/mids/highs using biquad filters with dynamic gain modulation based on
//! audio intensity. Supports role-based presets (Bass, Vocals, Drums, Other) for optimal enhancement.

use anyhow::Result;
use biquad::{Biquad, Coefficients, DirectForm2Transposed, frequency::ToHertz, Type};

/// Instrument role for role-specific EQ profiles
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstrumentRole {
    Bass,      // Sub-bass + low-end emphasis
    Vocals,    // Mid-high clarity + presence
    Drums,     // Transient punch + sub-bass
    Other,     // Balanced enhancement
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
        
        // Create biquad coefficients using external crate
        let fs = (self.config.sample_rate as f32).hz();
        
        let bass_coeffs = Coefficients::<f32>::from_params(
            Type::PeakingEQ(bass_gain),
            fs,
            self.config.bass_freq.hz(),
            self.config.q_factor,
        )
        .map_err(|e| anyhow::anyhow!("Bass filter creation failed: {:?}", e))?;

        let mid_coeffs = Coefficients::<f32>::from_params(
            Type::PeakingEQ(mid_gain),
            fs,
            self.config.mid_freq.hz(),
            self.config.q_factor,
        )
        .map_err(|e| anyhow::anyhow!("Mid filter creation failed: {:?}", e))?;

        let high_coeffs = Coefficients::<f32>::from_params(
            Type::PeakingEQ(high_gain),
            fs,
            self.config.high_freq.hz(),
            self.config.q_factor,
        )
        .map_err(|e| anyhow::anyhow!("High filter creation failed: {:?}", e))?;
        
        // Create DirectForm2Transposed filters (optimal for static filtering)
        let mut bass_filter = DirectForm2Transposed::<f32>::new(bass_coeffs);
        let mut mid_filter = DirectForm2Transposed::<f32>::new(mid_coeffs);
        let mut high_filter = DirectForm2Transposed::<f32>::new(high_coeffs);
        
        tracing::debug!(
            intensity = intensity,
            bass_gain_db = bass_gain,
            mid_gain_db = mid_gain,
            high_gain_db = high_gain,
            "Dynamic EQ: intensity={:.2} → bass={:.1}dB, mid={:.1}dB, high={:.1}dB",
            intensity, bass_gain, mid_gain, high_gain
        );
        
        // Serial cascade processing: bass → mid → high
        let mut output = Vec::with_capacity(input.len());
        for &sample in input {
            let bass_out = bass_filter.run(sample);
            let mid_out = mid_filter.run(bass_out);
            let high_out = high_filter.run(mid_out);
            output.push(high_out);
        }
        
        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

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

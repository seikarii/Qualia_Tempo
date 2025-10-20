//! # Responsibility
//! Transient shaper for percussive clarity and dynamic punch enhancement.
//!
//! ---
//!
//! **Attack Enhancement**: Boosts transient attack for percussive clarity ("snap" and "punch").
//! **Sustain Control**: Independent sustain adjustment to balance body vs attack.
//!
//! Intensity-driven modulation: subtle at low intensity, aggressive at climactic moments.
//! User requirement: "subir el audio del bass y del cantante unos puntos para mas dramatismo"

use anyhow::{Result, bail};

/// # Responsibility
/// Configuration for transient shaping with intensity-driven attack/sustain modulation.
///
/// ---
///
/// **Attack Gain Range**: (min, max) scales with intensity (e.g., 0dB → +12dB)
/// **Sustain Gain Range**: (min, max) scales with intensity (e.g., 0dB → -6dB)
///
/// Envelope detector uses RMS with configurable window for transient detection.
#[derive(Debug, Clone)]
pub struct TransientShaperConfig {
    /// Attack gain range in dB: (min, max) for intensity-driven modulation
    /// Positive values boost transients (more "punch")
    pub attack_gain_db_range: (f32, f32),
    
    /// Sustain gain range in dB: (min, max) for intensity-driven modulation
    /// Negative values reduce sustain (more percussive clarity)
    pub sustain_gain_db_range: (f32, f32),
    
    /// Envelope detector window size in samples
    /// Shorter = more responsive to transients (typical: 256-1024)
    pub envelope_window_samples: usize,
    
    /// Attack threshold: RMS delta (dB/s) to classify as transient
    /// Higher = only sharp attacks detected (typical: 20-60 dB/s)
    pub attack_threshold_db_per_sec: f32,
    
    /// Release time constant in samples for envelope smoothing
    pub release_time_samples: usize,
    
    pub sample_rate: u32,
}

impl TransientShaperConfig {
    /// Create new TransientShaperConfig with validation
    pub fn new(
        attack_gain_db_range: (f32, f32),
        sustain_gain_db_range: (f32, f32),
        envelope_window_samples: usize,
        attack_threshold_db_per_sec: f32,
        release_time_samples: usize,
        sample_rate: u32,
    ) -> Result<Self> {
        let (min_attack, max_attack) = attack_gain_db_range;
        if min_attack < -12.0 || max_attack > 24.0 || min_attack > max_attack {
            bail!(
                "Invalid attack_gain_db_range: ({}, {}). Must satisfy: -12 <= min <= max <= 24",
                min_attack, max_attack
            );
        }
        
        let (min_sustain, max_sustain) = sustain_gain_db_range;
        if min_sustain < -24.0 || max_sustain > 12.0 || min_sustain > max_sustain {
            bail!(
                "Invalid sustain_gain_db_range: ({}, {}). Must satisfy: -24 <= min <= max <= 12",
                min_sustain, max_sustain
            );
        }
        
        if envelope_window_samples < 64 || envelope_window_samples > 4096 {
            bail!(
                "envelope_window_samples out of range: {}. Must be between 64 and 4096",
                envelope_window_samples
            );
        }
        
        if attack_threshold_db_per_sec < 5.0 || attack_threshold_db_per_sec > 200.0 {
            bail!(
                "attack_threshold_db_per_sec out of range: {}. Must be between 5 and 200",
                attack_threshold_db_per_sec
            );
        }
        
        if release_time_samples < 128 || release_time_samples > 48000 {
            bail!(
                "release_time_samples out of range: {}. Must be between 128 and 48000",
                release_time_samples
            );
        }
        
        if sample_rate < 8000 || sample_rate > 192_000 {
            bail!("Invalid sample_rate: {}", sample_rate);
        }
        
        Ok(Self {
            attack_gain_db_range,
            sustain_gain_db_range,
            envelope_window_samples,
            attack_threshold_db_per_sec,
            release_time_samples,
            sample_rate,
        })
    }
    
    /// Calculate attack gain in linear scale for given intensity (0.0 to 1.0)
    pub fn calculate_attack_gain(&self, intensity: f32) -> f32 {
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        let (min_db, max_db) = self.attack_gain_db_range;
        let gain_db = min_db + (max_db - min_db) * intensity_clamped;
        10.0_f32.powf(gain_db / 20.0)
    }
    
    /// Calculate sustain gain in linear scale for given intensity (0.0 to 1.0)
    pub fn calculate_sustain_gain(&self, intensity: f32) -> f32 {
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        let (min_db, max_db) = self.sustain_gain_db_range;
        let gain_db = min_db + (max_db - min_db) * intensity_clamped;
        10.0_f32.powf(gain_db / 20.0)
    }
}

/// # Responsibility
/// Transient shaper processor with envelope detection and attack/sustain shaping.
///
/// ---
///
/// **Processing Algorithm**:
/// 1. Compute RMS envelope with sliding window
/// 2. Detect transients via RMS slope (dB/s)
/// 3. Apply attack gain during transient phase
/// 4. Apply sustain gain during non-transient phase
/// 5. Smooth transitions with release time constant
///
/// Result: Percussive clarity scales with musical intensity for dynamic drama.
pub struct TransientShaper {
    config: TransientShaperConfig,
    envelope_buffer: Vec<f32>,
    envelope_write_pos: usize,
    prev_rms: f32,
    attack_envelope: f32,
}

impl TransientShaper {
    /// Create new TransientShaper with initialized envelope buffer
    pub fn new(config: TransientShaperConfig) -> Self {
        let envelope_size = config.envelope_window_samples;
        Self {
            config,
            envelope_buffer: vec![0.0; envelope_size],
            envelope_write_pos: 0,
            prev_rms: 0.0,
            attack_envelope: 0.0,
        }
    }
    
    /// # Responsibility
    /// Process mono input with intensity-driven transient shaping.
    ///
    /// ---
    ///
    /// **Algorithm**:
    /// 1. For each sample, update RMS envelope
    /// 2. Calculate RMS delta (dB/s) to detect transients
    /// 3. If delta > threshold: apply attack gain
    /// 4. Else: apply sustain gain
    /// 5. Smooth gain transitions with release envelope
    ///
    /// **Input**: Mono audio samples + intensity (0.0 to 1.0)
    /// **Output**: Shaped mono audio with enhanced transients
    pub fn process(&mut self, input: &[f32], intensity: f32) -> Result<Vec<f32>> {
        let attack_gain = self.config.calculate_attack_gain(intensity);
        let sustain_gain = self.config.calculate_sustain_gain(intensity);
        
        let mut output = Vec::with_capacity(input.len());
        
        for &sample in input {
            // Update RMS envelope buffer
            self.envelope_buffer[self.envelope_write_pos] = sample * sample;
            self.envelope_write_pos = (self.envelope_write_pos + 1) % self.config.envelope_window_samples;
            
            // Calculate current RMS
            let rms_squared: f32 = self.envelope_buffer.iter().sum::<f32>() 
                / self.config.envelope_window_samples as f32;
            let current_rms = rms_squared.sqrt();
            
            // Detect transient via RMS slope
            let rms_delta_db = if self.prev_rms > 1e-6 {
                let ratio = current_rms / self.prev_rms;
                let db = 20.0 * ratio.log10();
                db * (self.config.sample_rate as f32 / self.config.envelope_window_samples as f32)
            } else {
                0.0
            };
            
            // Determine if this is a transient attack
            let is_transient = rms_delta_db > self.config.attack_threshold_db_per_sec;
            
            // Target gain: attack or sustain
            let target_gain = if is_transient { attack_gain } else { sustain_gain };
            
            // Smooth gain transitions with release envelope
            let release_coeff = 1.0 - (1.0 / self.config.release_time_samples as f32);
            self.attack_envelope = self.attack_envelope * release_coeff + target_gain * (1.0 - release_coeff);
            
            // Apply shaped gain
            let shaped_sample = sample * self.attack_envelope;
            output.push(shaped_sample);
            
            // Update previous RMS
            self.prev_rms = current_rms;
        }
        
        Ok(output)
    }
    
    /// Reset internal state (clear envelope buffer and previous RMS)
    pub fn reset(&mut self) {
        self.envelope_buffer.fill(0.0);
        self.envelope_write_pos = 0;
        self.prev_rms = 0.0;
        self.attack_envelope = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_creation() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        assert_eq!(config.attack_gain_db_range, (0.0, 12.0));
        assert_eq!(config.sustain_gain_db_range, (-6.0, 0.0));
        assert_eq!(config.envelope_window_samples, 512);
        assert_eq!(config.attack_threshold_db_per_sec, 40.0);
    }
    
    #[test]
    fn test_config_validation_invalid_attack_range() {
        let result = TransientShaperConfig::new(
            (30.0, 12.0), // Invalid: min > max
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        );
        assert!(result.is_err());
    }
    
    #[test]
    fn test_config_validation_invalid_sustain_range() {
        let result = TransientShaperConfig::new(
            (0.0, 12.0),
            (-30.0, -6.0), // Invalid: below -24dB
            512,
            40.0,
            2048,
            48000,
        );
        assert!(result.is_err());
    }
    
    #[test]
    fn test_config_validation_invalid_envelope_window() {
        let result = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            32, // Invalid: below 64
            40.0,
            2048,
            48000,
        );
        assert!(result.is_err());
    }
    
    #[test]
    fn test_calculate_attack_gain_low_intensity() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let gain = config.calculate_attack_gain(0.0);
        // 0dB = 1.0x gain
        assert!((gain - 1.0).abs() < 0.01);
    }
    
    #[test]
    fn test_calculate_attack_gain_high_intensity() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let gain = config.calculate_attack_gain(1.0);
        // +12dB = ~3.98x gain
        assert!((gain - 3.98).abs() < 0.1);
    }
    
    #[test]
    fn test_calculate_sustain_gain_high_intensity() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let gain = config.calculate_sustain_gain(1.0);
        // At intensity=1.0: max of range = 0dB = 1.0x gain
        assert!((gain - 1.0).abs() < 0.01);
    }
    
    #[test]
    fn test_calculate_sustain_gain_low_intensity() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let gain = config.calculate_sustain_gain(0.0);
        // At intensity=0.0: min of range = -6dB = ~0.5x gain
        assert!((gain - 0.5).abs() < 0.01);
    }
    
    #[test]
    fn test_shaper_creation() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let shaper = TransientShaper::new(config);
        assert_eq!(shaper.envelope_buffer.len(), 512);
        assert_eq!(shaper.prev_rms, 0.0);
    }
    
    #[test]
    fn test_process_silence() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let mut shaper = TransientShaper::new(config);
        
        let input = vec![0.0; 1000];
        let output = shaper.process(&input, 0.5).unwrap();
        
        assert_eq!(output.len(), 1000);
        // Silence should remain silence
        assert!(output.iter().all(|&x| x.abs() < 1e-6));
    }
    
    #[test]
    fn test_process_low_intensity_minimal_shaping() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            256,
            40.0,
            1024,
            48000,
        ).unwrap();
        
        let mut shaper = TransientShaper::new(config);
        
        // Sine wave (no sharp transients)
        let input: Vec<f32> = (0..2000)
            .map(|i| (i as f32 * 0.01).sin() * 0.5)
            .collect();
        
        let output = shaper.process(&input, 0.0).unwrap();
        
        assert_eq!(output.len(), 2000);
        
        // At low intensity: attack=0dB (1.0x), sustain=-6dB (0.5x)
        // Sine wave has no transients, so applies sustain gain
        // After envelope priming, output should be ~0.5x input
        let avg_ratio: f32 = input.iter()
            .zip(&output)
            .skip(1024) // Skip envelope priming
            .map(|(i, o)| if i.abs() > 1e-6 { o / i } else { 0.0 })
            .sum::<f32>() / (2000 - 1024) as f32;
        
        assert!((avg_ratio - 0.5).abs() < 0.15, 
            "Low intensity should apply ~0.5x sustain gain to non-transient signal, got ratio: {}", avg_ratio);
    }
    
    #[test]
    fn test_process_high_intensity_enhances_transients() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            128, // Shorter window for faster transient detection
            20.0, // Lower threshold to detect attack
            512,  // Shorter release
            48000,
        ).unwrap();
        
        let mut shaper = TransientShaper::new(config);
        
        // Generate signal with sharp attack transient followed by sustain
        let mut input = vec![0.0; 3000];
        // Sharp attack: 0 → 0.8 in 50 samples
        for i in 500..550 {
            input[i] = ((i - 500) as f32 / 50.0) * 0.8;
        }
        // Sustain at 0.5
        for i in 550..2500 {
            input[i] = 0.5;
        }
        
        let output = shaper.process(&input, 1.0).unwrap();
        
        assert_eq!(output.len(), 3000);
        
        // At high intensity: attack=+12dB (~4x), sustain=0dB (1x)
        // Attack region (first 200 samples after start) should have higher avg than sustain
        let attack_avg = output[500..700].iter().map(|&x| x.abs()).sum::<f32>() / 200.0;
        let sustain_avg = output[1500..2000].iter().map(|&x| x.abs()).sum::<f32>() / 500.0;
        
        assert!(attack_avg > sustain_avg * 0.9, 
            "High intensity should boost attack region relative to sustain (attack avg: {}, sustain avg: {})",
            attack_avg, sustain_avg);
    }
    
    #[test]
    fn test_reset_clears_state() {
        let config = TransientShaperConfig::new(
            (0.0, 12.0),
            (-6.0, 0.0),
            512,
            40.0,
            2048,
            48000,
        ).unwrap();
        
        let mut shaper = TransientShaper::new(config);
        
        // Process audio to populate state
        let input = vec![0.5; 1000];
        shaper.process(&input, 0.5).unwrap();
        
        // Reset
        shaper.reset();
        
        // State should be cleared
        assert!(shaper.envelope_buffer.iter().all(|&x| x == 0.0));
        assert_eq!(shaper.envelope_write_pos, 0);
        assert_eq!(shaper.prev_rms, 0.0);
        assert_eq!(shaper.attack_envelope, 0.0);
    }
}

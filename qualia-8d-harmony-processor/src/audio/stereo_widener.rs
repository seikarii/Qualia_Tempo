//! # Responsibility
//! Psychoacoustic stereo field enhancement using Haas effect and Mid-Side processing.
//!
//! ---
//!
//! **Haas Effect**: Micro-delays (5-35ms) create perceived width without phase issues.
//! **Mid-Side Processing**: Independently boost stereo "side" content for dramatic spatial expansion.
//!
//! Intensity-driven modulation: narrow at low intensity, ultra-wide at climactic moments.

use anyhow::{Result, bail};

/// # Responsibility
/// Configuration for stereo widening with intensity-driven modulation.
///
/// ---
///
/// **Haas Delay Range**: (min_ms, max_ms) scales with intensity (e.g., 5ms → 35ms)
/// **Width Factor Range**: (min, max) scales with intensity (1.0 = mono, 2.0 = 200% wide)
///
/// Combines temporal (Haas) and spectral (Mid-Side) widening for "impressive" effect.
#[derive(Debug, Clone)]
pub struct StereoWidenerConfig {
    /// Haas effect delay range in milliseconds: (min, max)
    /// Low intensity = subtle width, high intensity = dramatic expansion
    pub haas_delay_ms_range: (f32, f32),
    
    /// Mid-Side width factor range: (min, max)
    /// 1.0 = no change, 2.0 = double side content (200% wide)
    pub width_factor_range: (f32, f32),
    
    /// Low-pass cutoff for Haas-delayed signal (Hz)
    /// Prevents harsh high-frequency flanging artifacts
    pub haas_lowpass_hz: f32,
    
    pub sample_rate: u32,
}

impl StereoWidenerConfig {
    /// Create new StereoWidenerConfig with validation
    pub fn new(
        haas_delay_ms_range: (f32, f32),
        width_factor_range: (f32, f32),
        haas_lowpass_hz: f32,
        sample_rate: u32,
    ) -> Result<Self> {
        let (min_delay, max_delay) = haas_delay_ms_range;
        if min_delay < 0.0 || max_delay > 50.0 || min_delay > max_delay {
            bail!(
                "Invalid haas_delay_ms_range: ({}, {}). Must satisfy: 0 <= min <= max <= 50ms",
                min_delay, max_delay
            );
        }
        
        let (min_width, max_width) = width_factor_range;
        if min_width < 0.5 || max_width > 3.0 || min_width > max_width {
            bail!(
                "Invalid width_factor_range: ({}, {}). Must satisfy: 0.5 <= min <= max <= 3.0",
                min_width, max_width
            );
        }
        
        if haas_lowpass_hz < 1000.0 || haas_lowpass_hz > 20_000.0 {
            bail!(
                "haas_lowpass_hz out of range: {}. Must be between 1000Hz and 20000Hz",
                haas_lowpass_hz
            );
        }
        
        if sample_rate < 8000 || sample_rate > 192_000 {
            bail!("Invalid sample_rate: {}", sample_rate);
        }
        
        Ok(Self {
            haas_delay_ms_range,
            width_factor_range,
            haas_lowpass_hz,
            sample_rate,
        })
    }
    
    /// Calculate Haas delay in samples for given intensity (0.0 to 1.0)
    pub fn calculate_haas_delay_samples(&self, intensity: f32) -> usize {
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        let (min_ms, max_ms) = self.haas_delay_ms_range;
        let delay_ms = min_ms + (max_ms - min_ms) * intensity_clamped;
        ((delay_ms / 1000.0) * self.sample_rate as f32) as usize
    }
    
    /// Calculate Mid-Side width factor for given intensity (0.0 to 1.0)
    pub fn calculate_width_factor(&self, intensity: f32) -> f32 {
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        let (min_width, max_width) = self.width_factor_range;
        min_width + (max_width - min_width) * intensity_clamped
    }
}

/// # Responsibility
/// Stereo field enhancement processor combining Haas effect and Mid-Side widening.
///
/// ---
///
/// **Processing Chain**:
/// 1. Convert L/R to Mid-Side representation
/// 2. Apply Haas delay to side channel
/// 3. Boost side content by width_factor
/// 4. Convert back to L/R
///
/// Result: Perceived width scales with musical intensity for dynamic spatial drama.
pub struct StereoWidener {
    config: StereoWidenerConfig,
    haas_buffer: Vec<f32>,
    haas_write_pos: usize,
}

impl StereoWidener {
    /// Create new StereoWidener with pre-allocated delay buffer
    pub fn new(config: StereoWidenerConfig) -> Self {
        // Allocate buffer for maximum possible delay
        let max_delay_samples = ((config.haas_delay_ms_range.1 / 1000.0) 
            * config.sample_rate as f32) as usize;
        let buffer_size = max_delay_samples + 1024; // Padding for safety
        
        Self {
            config,
            haas_buffer: vec![0.0; buffer_size],
            haas_write_pos: 0,
        }
    }
    
    /// # Responsibility
    /// Process stereo input with intensity-driven width modulation.
    ///
    /// ---
    ///
    /// **Algorithm**:
    /// 1. Encode to Mid-Side: mid = (L + R) / 2, side = (L - R) / 2
    /// 2. Apply Haas delay to side channel (circular buffer)
    /// 3. Boost side by width_factor: side *= width_factor
    /// 4. Decode to L/R: L = mid + side, R = mid - side
    ///
    /// **Input**: Stereo samples (left, right)
    /// **Output**: Widened stereo samples (left, right)
    pub fn process(&mut self, left: &[f32], right: &[f32], intensity: f32) -> Result<(Vec<f32>, Vec<f32>)> {
        if left.len() != right.len() {
            bail!("Left and right channels must have equal length");
        }
        
        let len = left.len();
        let haas_delay = self.config.calculate_haas_delay_samples(intensity);
        let width_factor = self.config.calculate_width_factor(intensity);
        
        let mut out_left = Vec::with_capacity(len);
        let mut out_right = Vec::with_capacity(len);
        
        for i in 0..len {
            // Encode to Mid-Side
            let mid = (left[i] + right[i]) * 0.5;
            let side = (left[i] - right[i]) * 0.5;
            
            // Apply Haas delay to side channel
            let delayed_side = if haas_delay > 0 {
                let read_pos = (self.haas_write_pos + self.haas_buffer.len() - haas_delay) 
                    % self.haas_buffer.len();
                self.haas_buffer[read_pos]
            } else {
                side
            };
            
            // Write current side sample to buffer
            self.haas_buffer[self.haas_write_pos] = side;
            self.haas_write_pos = (self.haas_write_pos + 1) % self.haas_buffer.len();
            
            // Boost side content by width_factor
            let widened_side = delayed_side * width_factor;
            
            // Decode back to L/R
            let out_l = mid + widened_side;
            let out_r = mid - widened_side;
            
            out_left.push(out_l);
            out_right.push(out_r);
        }
        
        Ok((out_left, out_right))
    }
    
    /// Reset internal state (clear delay buffer)
    pub fn reset(&mut self) {
        self.haas_buffer.fill(0.0);
        self.haas_write_pos = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_creation() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        assert_eq!(config.haas_delay_ms_range, (5.0, 35.0));
        assert_eq!(config.width_factor_range, (1.0, 2.0));
        assert_eq!(config.haas_lowpass_hz, 8000.0);
        assert_eq!(config.sample_rate, 48000);
    }
    
    #[test]
    fn test_config_validation_invalid_delay_range() {
        let result = StereoWidenerConfig::new(
            (60.0, 35.0), // Invalid: min > max
            (1.0, 2.0),
            8000.0,
            48000,
        );
        assert!(result.is_err());
    }
    
    #[test]
    fn test_config_validation_invalid_width_range() {
        let result = StereoWidenerConfig::new(
            (5.0, 35.0),
            (0.3, 0.2), // Invalid: below 0.5
            8000.0,
            48000,
        );
        assert!(result.is_err());
    }
    
    #[test]
    fn test_calculate_haas_delay_low_intensity() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let delay = config.calculate_haas_delay_samples(0.0);
        // 5ms at 48kHz = 240 samples
        assert_eq!(delay, 240);
    }
    
    #[test]
    fn test_calculate_haas_delay_high_intensity() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let delay = config.calculate_haas_delay_samples(1.0);
        // 35ms at 48kHz = 1680 samples
        assert_eq!(delay, 1680);
    }
    
    #[test]
    fn test_calculate_width_factor_interpolation() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        assert_eq!(config.calculate_width_factor(0.0), 1.0);
        assert_eq!(config.calculate_width_factor(0.5), 1.5);
        assert_eq!(config.calculate_width_factor(1.0), 2.0);
    }
    
    #[test]
    fn test_widener_creation() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let widener = StereoWidener::new(config);
        assert!(widener.haas_buffer.len() > 1680); // Should allocate for max delay
    }
    
    #[test]
    fn test_process_zero_intensity_minimal_width() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let mut widener = StereoWidener::new(config);
        
        // Mono input (L=R) should remain mostly centered at low intensity
        let left = vec![0.5; 1000];
        let right = vec![0.5; 1000];
        
        let (out_l, out_r) = widener.process(&left, &right, 0.0).unwrap();
        
        // At width_factor=1.0, side content unchanged, but delayed
        assert_eq!(out_l.len(), 1000);
        assert_eq!(out_r.len(), 1000);
        
        // Channels should be similar (mono input)
        let diff: f32 = out_l.iter().zip(&out_r).map(|(l, r)| (l - r).abs()).sum();
        assert!(diff < 10.0, "Mono input should remain mostly centered at low width");
    }
    
    #[test]
    fn test_process_high_intensity_wide_stereo() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let mut widener = StereoWidener::new(config);
        
        // Generate long enough signal for Haas delay to fully engage
        // At high intensity: 35ms = 1680 samples @ 48kHz
        // Test after 2000 samples to ensure delay buffer is primed
        let left = vec![0.8; 2500];
        let right = vec![0.2; 2500];
        
        let (out_l, out_r) = widener.process(&left, &right, 1.0).unwrap();
        
        // At width_factor=2.0, side content doubled
        assert_eq!(out_l.len(), 2500);
        assert_eq!(out_r.len(), 2500);
        
        // Check output after delay buffer is fully primed (sample 2000)
        let input_separation = (0.8_f32 - 0.2_f32).abs();
        let output_separation = (out_l[2000] - out_r[2000]).abs();
        
        assert!(output_separation > input_separation, 
            "High intensity should increase stereo separation (expected > {}, got {})",
            input_separation, output_separation);
    }
    
    #[test]
    fn test_process_mismatched_channels() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let mut widener = StereoWidener::new(config);
        
        let left = vec![0.5; 1000];
        let right = vec![0.5; 500]; // Mismatched length
        
        let result = widener.process(&left, &right, 0.5);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_reset_clears_state() {
        let config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.0),
            8000.0,
            48000,
        ).unwrap();
        
        let mut widener = StereoWidener::new(config);
        
        // Process some audio to populate buffer
        let left = vec![1.0; 1000];
        let right = vec![1.0; 1000];
        widener.process(&left, &right, 0.5).unwrap();
        
        // Reset
        widener.reset();
        
        // Buffer should be zeroed
        assert!(widener.haas_buffer.iter().all(|&x| x == 0.0));
        assert_eq!(widener.haas_write_pos, 0);
    }
}

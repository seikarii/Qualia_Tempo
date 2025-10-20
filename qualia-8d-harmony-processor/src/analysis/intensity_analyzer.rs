//! # Responsibility
//! Analyzes audio intensity dynamics for real-time effect modulation.
//!
//! Generates intensity curves by combining RMS energy, crest factor, and spectral flux
//! to drive dynamic parameters in ensemble effects and EQ processing.

use anyhow::{Context, Result};
use realfft::{RealFftPlanner, RealToComplex};
use std::sync::Arc;

/// # Responsibility
/// Configuration for intensity analysis windows and weighting.
#[derive(Debug, Clone)]
pub struct IntensityAnalyzerConfig {
    /// Window size in milliseconds (typically 250ms for musical analysis)
    pub window_duration_ms: f32,
    
    /// Hop size in milliseconds (typically window_size / 2 for overlap)
    pub hop_duration_ms: f32,
    
    /// Sample rate in Hz
    pub sample_rate: u32,
    
    /// Weighting factors for intensity components [0.0, 1.0]
    pub rms_weight: f32,        // Energy contribution
    pub crest_weight: f32,      // Transient/attack contribution
    pub flux_weight: f32,       // Spectral change contribution
}

impl IntensityAnalyzerConfig {
    /// # Responsibility
    /// Create configuration with balanced defaults for musical intensity tracking.
    pub fn new(sample_rate: u32) -> Self {
        Self {
            window_duration_ms: 250.0,  // 250ms windows for musical phrases
            hop_duration_ms: 125.0,      // 50% overlap
            sample_rate,
            rms_weight: 0.4,             // 40% energy
            crest_weight: 0.3,           // 30% transients
            flux_weight: 0.3,            // 30% spectral change
        }
    }
    
    /// # Responsibility
    /// Calculate window size in samples.
    pub fn window_samples(&self) -> usize {
        ((self.window_duration_ms / 1000.0) * self.sample_rate as f32) as usize
    }
    
    /// # Responsibility
    /// Calculate hop size in samples.
    pub fn hop_samples(&self) -> usize {
        ((self.hop_duration_ms / 1000.0) * self.sample_rate as f32) as usize
    }
    
    /// # Responsibility
    /// Validate configuration parameters.
    pub fn validate(&self) -> Result<()> {
        anyhow::ensure!(
            self.window_duration_ms > 0.0,
            "Window duration must be positive"
        );
        anyhow::ensure!(
            self.hop_duration_ms > 0.0 && self.hop_duration_ms <= self.window_duration_ms,
            "Hop duration must be in (0, window_duration]"
        );
        anyhow::ensure!(
            self.sample_rate > 0,
            "Sample rate must be positive"
        );
        
        let total_weight = self.rms_weight + self.crest_weight + self.flux_weight;
        anyhow::ensure!(
            (total_weight - 1.0).abs() < 0.01,
            "Weight sum must equal 1.0, got {}",
            total_weight
        );
        
        Ok(())
    }
}

/// # Responsibility
/// Multi-metric intensity analyzer for dynamic audio processing.
///
/// Combines RMS energy, crest factor, and spectral flux to generate
/// normalized intensity curves [0.0, 1.0] for real-time effect modulation.
pub struct IntensityAnalyzer {
    config: IntensityAnalyzerConfig,
    fft: Arc<dyn RealToComplex<f32>>,
}

impl IntensityAnalyzer {
    /// # Responsibility
    /// Create new intensity analyzer with FFT pre-allocation.
    pub fn new(config: IntensityAnalyzerConfig) -> Result<Self> {
        config.validate().context("Invalid IntensityAnalyzerConfig")?;
        
        // Create FFT planner for spectral flux analysis
        let mut planner = RealFftPlanner::<f32>::new();
        let fft_size = config.window_samples().next_power_of_two();
        let fft = planner.plan_fft_forward(fft_size);
        
        Ok(Self {
            config,
            fft,
        })
    }
    
    /// # Responsibility
    /// Analyze audio buffer and generate intensity curve.
    ///
    /// Returns Vec<f32> where each value is normalized intensity [0.0, 1.0]
    /// at the corresponding time window. Length = num_windows based on hop size.
    ///
    /// # Arguments
    /// * `audio` - Input audio samples (mono)
    ///
    /// # Returns
    /// Intensity curve with one value per hop window
    pub fn analyze(&mut self, audio: &[f32]) -> Result<Vec<f32>> {
        if audio.is_empty() {
            return Ok(Vec::new());
        }
        
        let window_size = self.config.window_samples();
        let hop_size = self.config.hop_samples();
        
        // Calculate number of windows
        let num_windows = (audio.len().saturating_sub(window_size)) / hop_size + 1;
        
        if num_windows == 0 {
            return Ok(Vec::new());
        }
        
        let mut rms_values = Vec::with_capacity(num_windows);
        let mut crest_values = Vec::with_capacity(num_windows);
        let mut flux_values = Vec::with_capacity(num_windows);
        
        let mut prev_spectrum: Option<Vec<f32>> = None;
        
        // Process each window
        for window_idx in 0..num_windows {
            let start = window_idx * hop_size;
            let end = (start + window_size).min(audio.len());
            
            // Handle partial last window
            if end - start < window_size {
                break;
            }
            
            let window = &audio[start..end];
            
            // Calculate RMS energy
            let rms = self.calculate_rms(window);
            rms_values.push(rms);
            
            // Calculate crest factor
            let crest = self.calculate_crest_factor(window, rms);
            crest_values.push(crest);
            
            // Calculate spectral flux
            let spectrum = self.calculate_spectrum(window)?;
            let flux = if let Some(ref prev) = prev_spectrum {
                self.calculate_spectral_flux(&spectrum, prev)
            } else {
                0.0 // First window has no previous spectrum
            };
            flux_values.push(flux);
            
            prev_spectrum = Some(spectrum);
        }
        
        // Normalize each metric to [0.0, 1.0]
        let rms_normalized = Self::normalize_curve(&rms_values);
        let crest_normalized = Self::normalize_curve(&crest_values);
        let flux_normalized = Self::normalize_curve(&flux_values);
        
        // Combine metrics with weighted sum
        let intensity_curve: Vec<f32> = (0..num_windows)
            .map(|i| {
                let rms = rms_normalized.get(i).copied().unwrap_or(0.0);
                let crest = crest_normalized.get(i).copied().unwrap_or(0.0);
                let flux = flux_normalized.get(i).copied().unwrap_or(0.0);
                
                (rms * self.config.rms_weight
                    + crest * self.config.crest_weight
                    + flux * self.config.flux_weight)
                    .clamp(0.0, 1.0)
            })
            .collect();
        
        Ok(intensity_curve)
    }
    
    /// # Responsibility
    /// Calculate RMS (Root Mean Square) energy of audio window.
    ///
    /// RMS = sqrt(sum(sample^2) / num_samples)
    fn calculate_rms(&self, window: &[f32]) -> f32 {
        if window.is_empty() {
            return 0.0;
        }
        
        let sum_squares: f32 = window.iter().map(|&x| x * x).sum();
        (sum_squares / window.len() as f32).sqrt()
    }
    
    /// # Responsibility
    /// Calculate crest factor (peak-to-RMS ratio).
    ///
    /// Low crest factor = sustained/dense signal (high intensity)
    /// High crest factor = sparse/transient signal (variable intensity)
    ///
    /// Returns inverted normalized value: 1.0 - (crest / max_crest)
    fn calculate_crest_factor(&self, window: &[f32], rms: f32) -> f32 {
        if rms < 1e-6 {
            return 0.0; // Silence
        }
        
        let peak = window.iter().map(|&x| x.abs()).fold(0.0_f32, f32::max);
        let crest = peak / rms;
        
        // Invert: lower crest = higher intensity (dense, sustained sound)
        // Typical crest factor range: 1.0 (square wave) to 10+ (sparse)
        // Normalize and invert to [0, 1] where 1 = most intense
        (1.0 - (crest / 10.0)).clamp(0.0, 1.0)
    }
    
    /// # Responsibility
    /// Calculate magnitude spectrum via FFT.
    fn calculate_spectrum(&mut self, window: &[f32]) -> Result<Vec<f32>> {
        let fft_size = self.fft.len();
        
        // Prepare FFT input (zero-pad if needed)
        let mut fft_input = vec![0.0; fft_size];
        let copy_len = window.len().min(fft_size);
        fft_input[..copy_len].copy_from_slice(&window[..copy_len]);
        
        // Apply Hann window to reduce spectral leakage
        for (i, sample) in fft_input.iter_mut().enumerate() {
            let hann = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / fft_size as f32).cos());
            *sample *= hann;
        }
        
        // Perform FFT
        let mut fft_output = self.fft.make_output_vec();
        self.fft
            .process(&mut fft_input, &mut fft_output)
            .context("FFT processing failed")?;
        
        // Calculate magnitude spectrum
        let spectrum: Vec<f32> = fft_output
            .iter()
            .map(|c| (c.re * c.re + c.im * c.im).sqrt())
            .collect();
        
        Ok(spectrum)
    }
    
    /// # Responsibility
    /// Calculate spectral flux (magnitude change between consecutive frames).
    ///
    /// Spectral Flux = sum(|spectrum[t] - spectrum[t-1]|) / num_bins
    fn calculate_spectral_flux(&self, current: &[f32], previous: &[f32]) -> f32 {
        if current.len() != previous.len() {
            return 0.0;
        }
        
        let flux_sum: f32 = current
            .iter()
            .zip(previous.iter())
            .map(|(&curr, &prev)| (curr - prev).abs())
            .sum();
        
        flux_sum / current.len() as f32
    }
    
    /// # Responsibility
    /// Normalize curve to [0.0, 1.0] range via min-max scaling.
    fn normalize_curve(values: &[f32]) -> Vec<f32> {
        if values.is_empty() {
            return Vec::new();
        }
        
        let min = values.iter().copied().fold(f32::INFINITY, f32::min);
        let max = values.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        
        if (max - min).abs() < 1e-6 {
            // Constant curve - normalize to 0.5
            return vec![0.5; values.len()];
        }
        
        values
            .iter()
            .map(|&v| ((v - min) / (max - min)).clamp(0.0, 1.0))
            .collect()
    }
    
    pub fn config(&self) -> &IntensityAnalyzerConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_config_creation() {
        let config = IntensityAnalyzerConfig::new(48000);
        assert_relative_eq!(config.window_duration_ms, 250.0);
        assert_relative_eq!(config.hop_duration_ms, 125.0);
        assert_eq!(config.sample_rate, 48000);
        assert_relative_eq!(config.rms_weight + config.crest_weight + config.flux_weight, 1.0);
    }

    #[test]
    fn test_config_window_samples() {
        let config = IntensityAnalyzerConfig::new(48000);
        // 250ms at 48kHz = 12000 samples
        assert_eq!(config.window_samples(), 12000);
    }

    #[test]
    fn test_config_hop_samples() {
        let config = IntensityAnalyzerConfig::new(48000);
        // 125ms at 48kHz = 6000 samples
        assert_eq!(config.hop_samples(), 6000);
    }

    #[test]
    fn test_config_validation_valid() {
        let config = IntensityAnalyzerConfig::new(48000);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation_invalid_weights() {
        let mut config = IntensityAnalyzerConfig::new(48000);
        config.rms_weight = 0.5;
        config.crest_weight = 0.5;
        config.flux_weight = 0.5; // Sum = 1.5
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_analyzer_creation() {
        let config = IntensityAnalyzerConfig::new(48000);
        let analyzer = IntensityAnalyzer::new(config);
        assert!(analyzer.is_ok());
    }

    #[test]
    fn test_analyze_empty_input() {
        let config = IntensityAnalyzerConfig::new(48000);
        let mut analyzer = IntensityAnalyzer::new(config).unwrap();
        
        let result = analyzer.analyze(&[]);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_analyze_silence() {
        let config = IntensityAnalyzerConfig::new(48000);
        let mut analyzer = IntensityAnalyzer::new(config).unwrap();
        
        // 2 seconds of silence
        let silence = vec![0.0; 96000];
        let intensity = analyzer.analyze(&silence).unwrap();
        
        // Silence has constant metrics (all zero), which normalizes to 0.5 (neutral)
        // This is correct behavior - we can't distinguish "quiet" from "loud" in constant signal
        for &value in &intensity {
            assert_relative_eq!(value, 0.5, epsilon = 0.1);
        }
    }

    #[test]
    fn test_analyze_full_scale_sine() {
        let config = IntensityAnalyzerConfig::new(48000);
        let mut analyzer = IntensityAnalyzer::new(config).unwrap();
        
        // Generate 1 second of 440Hz sine wave at full scale
        let sine: Vec<f32> = (0..48000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin())
            .collect();
        
        let intensity = analyzer.analyze(&sine).unwrap();
        
        // Should produce high, consistent intensity
        assert!(!intensity.is_empty());
        let avg_intensity: f32 = intensity.iter().sum::<f32>() / intensity.len() as f32;
        assert!(avg_intensity > 0.5, "Loud sine should have high intensity, got {}", avg_intensity);
    }

    #[test]
    fn test_analyze_transient_signal() {
        let config = IntensityAnalyzerConfig::new(48000);
        let mut analyzer = IntensityAnalyzer::new(config).unwrap();
        
        // Generate signal with transient (impulse every 12000 samples = 250ms)
        let mut transient = vec![0.0; 48000];
        for i in (0..48000).step_by(12000) {
            if i < transient.len() {
                transient[i] = 1.0; // Impulse
            }
        }
        
        let intensity = analyzer.analyze(&transient).unwrap();
        
        // Should show peaks at transient locations
        assert!(!intensity.is_empty());
    }

    #[test]
    fn test_normalize_curve() {
        let values = vec![0.0, 0.5, 1.0, 0.25, 0.75];
        let normalized = IntensityAnalyzer::normalize_curve(&values);
        
        assert_relative_eq!(normalized[0], 0.0);    // min
        assert_relative_eq!(normalized[2], 1.0);    // max
        assert_relative_eq!(normalized[1], 0.5);    // middle
    }

    #[test]
    fn test_normalize_curve_constant() {
        let values = vec![0.5; 10];
        let normalized = IntensityAnalyzer::normalize_curve(&values);
        
        // All values should be 0.5 (middle of range)
        for &v in &normalized {
            assert_relative_eq!(v, 0.5);
        }
    }

    #[test]
    fn test_calculate_rms() {
        let config = IntensityAnalyzerConfig::new(48000);
        let analyzer = IntensityAnalyzer::new(config).unwrap();
        
        // Test with known values
        let window = vec![0.5; 100];
        let rms = analyzer.calculate_rms(&window);
        assert_relative_eq!(rms, 0.5, epsilon = 0.01);
        
        // Silence
        let silence = vec![0.0; 100];
        let rms_silence = analyzer.calculate_rms(&silence);
        assert_relative_eq!(rms_silence, 0.0, epsilon = 0.001);
    }
}

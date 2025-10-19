//! # Responsibility
//! Chromagram analysis for 12-bin pitch class distribution extraction.
//!
//! Computes pitch class profiles from audio via FFT to identify harmonic content
//! mapped to the 12 semitones of the chromatic scale (C, C#, D, ..., B).

use anyhow::{Result, bail};
use rustfft::{FftPlanner, num_complex::Complex};
use std::f32::consts::PI;

/// Chromagram analysis configuration
#[derive(Debug, Clone)]
pub struct ChromagramConfig {
    pub sample_rate: u32,
    pub fft_size: usize,        // FFT size (typically 8192 for good frequency resolution)
    pub hop_size: usize,        // Hop between frames (typically fft_size / 4)
    pub min_frequency: f32,     // Minimum frequency to analyze (typically 65.4 Hz = C2)
    pub max_frequency: f32,     // Maximum frequency to analyze (typically 2093 Hz = C7)
}

impl ChromagramConfig {
    pub fn new(sample_rate: u32) -> Self {
        let fft_size = 8192;
        Self {
            sample_rate,
            fft_size,
            hop_size: fft_size / 4,
            min_frequency: 65.4,    // C2
            max_frequency: 2093.0,  // C7
        }
    }

    /// Validate configuration parameters
    pub fn validate(&self) -> Result<()> {
        if !self.fft_size.is_power_of_two() {
            bail!("FFT size must be power of 2, got {}", self.fft_size);
        }

        if self.hop_size == 0 || self.hop_size > self.fft_size {
            bail!("Invalid hop size: {}", self.hop_size);
        }

        if self.min_frequency <= 0.0 || self.min_frequency >= self.max_frequency {
            bail!("Invalid frequency range: {} - {}", self.min_frequency, self.max_frequency);
        }

        if self.max_frequency >= (self.sample_rate as f32 / 2.0) {
            bail!("Max frequency {} exceeds Nyquist {}", self.max_frequency, self.sample_rate / 2);
        }

        Ok(())
    }
}

/// 12-bin chromagram representing pitch class distribution
#[derive(Debug, Clone)]
pub struct Chromagram {
    /// 12-element array for pitch classes [C, C#, D, D#, E, F, F#, G, G#, A, A#, B]
    pub bins: [f32; 12],
}

impl Chromagram {
    pub fn new() -> Self {
        Self { bins: [0.0; 12] }
    }

    /// Normalize bins to sum to 1.0
    pub fn normalize(&mut self) {
        let sum: f32 = self.bins.iter().sum();
        if sum > 0.0 {
            for bin in &mut self.bins {
                *bin /= sum;
            }
        }
    }

    /// Get dominant pitch class (0-11)
    pub fn dominant_pitch_class(&self) -> usize {
        self.bins
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(idx, _)| idx)
            .unwrap_or(0)
    }

    /// Get pitch class name from index (0=C, 1=C#, etc.)
    pub fn pitch_class_name(index: usize) -> &'static str {
        const NAMES: [&str; 12] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        NAMES.get(index % 12).unwrap_or(&"Unknown")
    }
}

impl Default for Chromagram {
    fn default() -> Self {
        Self::new()
    }
}

/// Chromagram analyzer using FFT-based pitch class detection
pub struct ChromagramAnalyzer {
    config: ChromagramConfig,
    fft: std::sync::Arc<dyn rustfft::Fft<f32>>,
}

impl ChromagramAnalyzer {
    pub fn new(config: ChromagramConfig) -> Result<Self> {
        config.validate()?;

        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(config.fft_size);

        Ok(Self { config, fft })
    }

    /// Analyze audio frame to produce chromagram
    ///
    /// # Arguments
    /// * `frame` - Audio samples (should be fft_size length)
    ///
    /// # Returns
    /// Chromagram with normalized 12-bin pitch class distribution
    pub fn analyze_frame(&self, frame: &[f32]) -> Result<Chromagram> {
        if frame.len() != self.config.fft_size {
            bail!("Frame length {} doesn't match FFT size {}", frame.len(), self.config.fft_size);
        }

        // Apply Hann window
        let windowed = self.apply_hann_window(frame);

        // Compute FFT
        let mut buffer: Vec<Complex<f32>> = windowed
            .iter()
            .map(|&x| Complex::new(x, 0.0))
            .collect();

        self.fft.process(&mut buffer);

        // Compute magnitude spectrum
        let magnitudes: Vec<f32> = buffer.iter().map(|c| c.norm()).collect();

        // Map FFT bins to chromagram bins
        let mut chromagram = Chromagram::new();
        self.map_to_chromagram(&magnitudes, &mut chromagram);

        chromagram.normalize();

        Ok(chromagram)
    }

    /// Apply Hann window to reduce spectral leakage
    fn apply_hann_window(&self, frame: &[f32]) -> Vec<f32> {
        let n = frame.len();
        frame
            .iter()
            .enumerate()
            .map(|(i, &x)| {
                let window = 0.5 * (1.0 - ((2.0 * PI * i as f32) / (n as f32 - 1.0)).cos());
                x * window
            })
            .collect()
    }

    /// Map FFT magnitude bins to 12-bin chromagram
    fn map_to_chromagram(&self, magnitudes: &[f32], chromagram: &mut Chromagram) {
        let freq_resolution = self.config.sample_rate as f32 / self.config.fft_size as f32;

        for (bin_idx, &magnitude) in magnitudes.iter().enumerate() {
            let frequency = bin_idx as f32 * freq_resolution;

            // Skip bins outside valid range
            if frequency < self.config.min_frequency || frequency > self.config.max_frequency {
                continue;
            }

            // Convert frequency to MIDI note number
            let midi_note = 69.0 + 12.0 * (frequency / 440.0).log2();

            // Map to pitch class (0-11)
            let pitch_class = (midi_note.round() as usize) % 12;

            chromagram.bins[pitch_class] += magnitude;
        }
    }

    pub fn config(&self) -> &ChromagramConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_chromagram_config_creation() {
        let config = ChromagramConfig::new(48000);
        assert_eq!(config.sample_rate, 48000);
        assert_eq!(config.fft_size, 8192);
        assert!(config.fft_size.is_power_of_two());
    }

    #[test]
    fn test_chromagram_config_validation_success() {
        let config = ChromagramConfig::new(48000);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_chromagram_config_invalid_fft_size() {
        let mut config = ChromagramConfig::new(48000);
        config.fft_size = 1000; // Not power of 2
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_chromagram_config_invalid_hop_size() {
        let mut config = ChromagramConfig::new(48000);
        config.hop_size = config.fft_size + 1;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_chromagram_config_invalid_frequency_range() {
        let mut config = ChromagramConfig::new(48000);
        config.min_frequency = 5000.0;
        config.max_frequency = 100.0; // Min > Max
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_chromagram_creation() {
        let chroma = Chromagram::new();
        assert_eq!(chroma.bins.len(), 12);
        
        // All bins should start at 0
        for &bin in &chroma.bins {
            assert_relative_eq!(bin, 0.0);
        }
    }

    #[test]
    fn test_chromagram_normalize() {
        let mut chroma = Chromagram::new();
        chroma.bins[0] = 2.0;
        chroma.bins[4] = 3.0;
        chroma.bins[7] = 5.0;
        
        chroma.normalize();
        
        let sum: f32 = chroma.bins.iter().sum();
        assert_relative_eq!(sum, 1.0, epsilon = 0.001);
    }

    #[test]
    fn test_chromagram_normalize_zero_sum() {
        let mut chroma = Chromagram::new();
        chroma.normalize();
        
        // Should remain all zeros
        for &bin in &chroma.bins {
            assert_relative_eq!(bin, 0.0);
        }
    }

    #[test]
    fn test_chromagram_dominant_pitch_class() {
        let mut chroma = Chromagram::new();
        chroma.bins[5] = 10.0; // F
        chroma.bins[9] = 15.0; // A (dominant)
        chroma.bins[0] = 5.0;  // C
        
        assert_eq!(chroma.dominant_pitch_class(), 9); // A
    }

    #[test]
    fn test_pitch_class_names() {
        assert_eq!(Chromagram::pitch_class_name(0), "C");
        assert_eq!(Chromagram::pitch_class_name(1), "C#");
        assert_eq!(Chromagram::pitch_class_name(4), "E");
        assert_eq!(Chromagram::pitch_class_name(9), "A");
        assert_eq!(Chromagram::pitch_class_name(11), "B");
    }

    #[test]
    fn test_pitch_class_names_wraparound() {
        assert_eq!(Chromagram::pitch_class_name(12), "C"); // Wraps to 0
        assert_eq!(Chromagram::pitch_class_name(13), "C#"); // Wraps to 1
    }

    #[test]
    fn test_chromagram_analyzer_creation() {
        let config = ChromagramConfig::new(48000);
        let analyzer = ChromagramAnalyzer::new(config);
        assert!(analyzer.is_ok());
    }

    #[test]
    fn test_chromagram_analyzer_invalid_config() {
        let mut config = ChromagramConfig::new(48000);
        config.fft_size = 1000; // Invalid
        let analyzer = ChromagramAnalyzer::new(config);
        assert!(analyzer.is_err());
    }

    #[test]
    fn test_analyze_frame_wrong_size() {
        let config = ChromagramConfig::new(48000);
        let analyzer = ChromagramAnalyzer::new(config).unwrap();
        
        let wrong_size_frame = vec![0.0; 1024]; // Should be 8192
        let result = analyzer.analyze_frame(&wrong_size_frame);
        assert!(result.is_err());
    }

    #[test]
    fn test_analyze_frame_silence() {
        let config = ChromagramConfig::new(48000);
        let analyzer = ChromagramAnalyzer::new(config).unwrap();
        
        let silence = vec![0.0; 8192];
        let chroma = analyzer.analyze_frame(&silence).unwrap();
        
        // Silence should produce near-zero chromagram
        let sum: f32 = chroma.bins.iter().sum();
        assert!(sum < 0.01);
    }

    #[test]
    fn test_analyze_frame_produces_normalized_output() {
        let config = ChromagramConfig::new(48000);
        let analyzer = ChromagramAnalyzer::new(config).unwrap();
        
        // Create frame with some energy
        let mut frame = vec![0.0; 8192];
        for i in 0..1000 {
            frame[i] = (i as f32 * 0.01).sin();
        }
        
        let chroma = analyzer.analyze_frame(&frame).unwrap();
        
        // Should be normalized (sum ≈ 1.0)
        let sum: f32 = chroma.bins.iter().sum();
        assert_relative_eq!(sum, 1.0, epsilon = 0.01);
    }

    #[test]
    fn test_hann_window_symmetry() {
        let config = ChromagramConfig::new(48000);
        let analyzer = ChromagramAnalyzer::new(config).unwrap();
        
        let input = vec![1.0; 128];
        let windowed = analyzer.apply_hann_window(&input);
        
        // Hann window should be symmetric
        assert_relative_eq!(windowed[0], windowed[127], epsilon = 0.001);
        assert_relative_eq!(windowed[10], windowed[117], epsilon = 0.001);
    }

    #[test]
    fn test_hann_window_reduces_edges() {
        let config = ChromagramConfig::new(48000);
        let analyzer = ChromagramAnalyzer::new(config).unwrap();
        
        let input = vec![1.0; 128];
        let windowed = analyzer.apply_hann_window(&input);
        
        // Edges should be attenuated
        assert!(windowed[0] < 0.1);
        assert!(windowed[127] < 0.1);
        
        // Center should be near 1.0
        assert!(windowed[64] > 0.9);
    }
}

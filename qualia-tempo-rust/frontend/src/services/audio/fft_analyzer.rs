//! # Responsibility
//! Performs real-time FFT analysis of audio for frequency-based gameplay mechanics.
//!
//! ---
//!
//! Extracts bass, mid, and treble frequency bands from the audio signal.
//! Runs at 60 FPS synchronized with requestAnimationFrame.
//! Used by BossAI to react dynamically to music intensity.

use web_sys::{AnalyserNode, AudioContext};
use wasm_bindgen::JsCast;
use std::sync::{Arc, Mutex};
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for FFT analysis.
#[derive(Debug, Clone)]
pub struct FFTConfig {
    /// FFT size (must be power of 2: 256, 512, 1024, 2048, 4096, 8192)
    pub fft_size: u32,
    
    /// Smoothing time constant (0.0 to 1.0)
    pub smoothing_time_constant: f64,
    
    /// Minimum decibels for normalization
    pub min_decibels: f64,
    
    /// Maximum decibels for normalization
    pub max_decibels: f64,
}

impl Default for FFTConfig {
    fn default() -> Self {
        Self {
            fft_size: 2048,
            smoothing_time_constant: 0.8,
            min_decibels: -90.0,
            max_decibels: -10.0,
        }
    }
}

/// # Responsibility
/// Frequency band analysis results.
#[derive(Debug, Clone, Copy)]
pub struct FrequencyBands {
    /// Bass energy (20-250 Hz) normalized to [0.0, 1.0]
    pub bass: f32,
    
    /// Mid energy (250-4000 Hz) normalized to [0.0, 1.0]
    pub mid: f32,
    
    /// Treble energy (4000-20000 Hz) normalized to [0.0, 1.0]
    pub treble: f32,
    
    /// Overall energy (RMS of all frequencies)
    pub overall: f32,
}

/// # Responsibility
/// Real-time FFT analyzer service for audio-reactive gameplay.
pub struct FFTAnalyzerService {
    config: FFTConfig,
    logger: Arc<dyn ILogger>,
    analyser: Option<AnalyserNode>,
    frequency_data: Arc<Mutex<Vec<u8>>>,
    sample_rate: f64,
}

impl FFTAnalyzerService {
    /// # Responsibility
    /// Creates new FFT analyzer with configuration.
    pub fn new(config: FFTConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            analyser: None,
            frequency_data: Arc::new(Mutex::new(Vec::new())),
            sample_rate: 44100.0, // Default, updated when connected
        }
    }
    
    /// # Responsibility
    /// Connects analyzer to audio context and returns AnalyserNode for routing.
    pub fn connect(&mut self, audio_context: &AudioContext) -> Result<AnalyserNode, String> {
        // Create analyser node
        let analyser = audio_context
            .create_analyser()
            .map_err(|e| format!("Failed to create AnalyserNode: {:?}", e))?;
        
        // Configure analyser
        analyser.set_fft_size(self.config.fft_size);
        analyser.set_smoothing_time_constant(self.config.smoothing_time_constant);
        analyser.set_min_decibels(self.config.min_decibels);
        analyser.set_max_decibels(self.config.max_decibels);
        
        // Initialize frequency data buffer
        let buffer_length = analyser.frequency_bin_count();
        *self.frequency_data.lock().unwrap() = vec![0u8; buffer_length as usize];
        
        self.sample_rate = audio_context.sample_rate() as f64;
        self.analyser = Some(analyser.clone());
        
        self.logger.info(&format!(
            "FFTAnalyzer connected: FFT size = {}, Buffer length = {}, Sample rate = {} Hz",
            self.config.fft_size, buffer_length, self.sample_rate
        ));
        
        Ok(analyser)
    }
    
    /// # Responsibility
    /// Analyzes current audio frame and returns frequency bands.
    ///
    /// ---
    ///
    /// Should be called once per animation frame (60 FPS).
    /// Returns normalized energy values for bass, mid, treble, and overall.
    pub fn analyze_frame(&self) -> Result<FrequencyBands, String> {
        let analyser = self.analyser.as_ref()
            .ok_or_else(|| "Analyser not connected".to_string())?;
        
        // Get frequency data from analyser
        let mut data = self.frequency_data.lock().unwrap();
        analyser.get_byte_frequency_data(&mut data);
        
        // Calculate frequency ranges (in Hz)
        let nyquist = self.sample_rate / 2.0;
        let bin_width = nyquist / (data.len() as f64);
        
        // Frequency band boundaries (in bins)
        let bass_end = (250.0 / bin_width) as usize;
        let mid_end = (4000.0 / bin_width) as usize;
        let treble_end = data.len();
        
        // Calculate band energies (average magnitude in each band)
        let bass = Self::calculate_band_energy(&data, 0, bass_end);
        let mid = Self::calculate_band_energy(&data, bass_end, mid_end);
        let treble = Self::calculate_band_energy(&data, mid_end, treble_end);
        
        // Calculate overall RMS energy
        let overall = Self::calculate_rms_energy(&data);
        
        Ok(FrequencyBands {
            bass,
            mid,
            treble,
            overall,
        })
    }
    
    /// # Responsibility
    /// Calculates average energy in a frequency band.
    ///
    /// ---
    ///
    /// Normalizes from [0, 255] byte range to [0.0, 1.0] float range.
    fn calculate_band_energy(data: &[u8], start: usize, end: usize) -> f32 {
        if start >= end || end > data.len() {
            return 0.0;
        }
        
        let sum: u32 = data[start..end].iter().map(|&x| x as u32).sum();
        let avg = sum as f32 / (end - start) as f32;
        
        // Normalize from [0, 255] to [0.0, 1.0]
        avg / 255.0
    }
    
    /// # Responsibility
    /// Calculates RMS (Root Mean Square) energy across all frequencies.
    fn calculate_rms_energy(data: &[u8]) -> f32 {
        if data.is_empty() {
            return 0.0;
        }
        
        let sum_of_squares: u32 = data.iter()
            .map(|&x| (x as u32).pow(2))
            .sum();
        
        let mean_square = sum_of_squares as f32 / data.len() as f32;
        let rms = mean_square.sqrt();
        
        // Normalize from [0, 255] to [0.0, 1.0]
        rms / 255.0
    }
    
    /// # Responsibility
    /// Gets current waveform data for visualization (oscilloscope).
    pub fn get_waveform_data(&self) -> Result<Vec<u8>, String> {
        let analyser = self.analyser.as_ref()
            .ok_or_else(|| "Analyser not connected".to_string())?;
        
        let buffer_length = analyser.frequency_bin_count();
        let mut data = vec![0u8; buffer_length as usize];
        analyser.get_byte_time_domain_data(&mut data);
        
        Ok(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_calculate_band_energy_normalizes_correctly() {
        let data = vec![255u8; 100]; // Max energy
        let energy = FFTAnalyzerService::calculate_band_energy(&data, 0, 100);
        assert!((energy - 1.0).abs() < 0.01, "Max energy should normalize to ~1.0");
        
        let data = vec![0u8; 100]; // Zero energy
        let energy = FFTAnalyzerService::calculate_band_energy(&data, 0, 100);
        assert!(energy < 0.01, "Zero energy should normalize to ~0.0");
    }
    
    #[test]
    fn test_calculate_rms_energy() {
        let data = vec![255u8; 100]; // Max energy
        let rms = FFTAnalyzerService::calculate_rms_energy(&data);
        assert!((rms - 1.0).abs() < 0.01, "Max RMS should normalize to ~1.0");
        
        let data = vec![0u8; 100]; // Zero energy
        let rms = FFTAnalyzerService::calculate_rms_energy(&data);
        assert!(rms < 0.01, "Zero RMS should normalize to ~0.0");
    }
    
    #[test]
    fn test_band_energy_with_invalid_range() {
        let data = vec![128u8; 100];
        
        // Start >= end
        let energy = FFTAnalyzerService::calculate_band_energy(&data, 50, 50);
        assert_eq!(energy, 0.0);
        
        // End > data.len()
        let energy = FFTAnalyzerService::calculate_band_energy(&data, 0, 200);
        assert_eq!(energy, 0.0);
    }
}

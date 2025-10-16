//! # Responsibility
//! Real-time FFT analysis of audio stream for reactive visuals.
//!
//! ---
//!
//! Uses Web Audio API's AnalyserNode to extract frequency domain data
//! (bass, mids, treble) for visual parameter modulation.

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{AudioContext, AnalyserNode};
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for FFT analyzer.
#[derive(Debug, Clone)]
pub struct FFTAnalyzerConfig {
    /// FFT size (power of 2: 256, 512, 1024, 2048, 4096, 8192)
    pub fft_size: u32,
    
    /// Smoothing time constant (0.0 - 1.0, higher = smoother)
    pub smoothing_time_constant: f32,
    
    /// Minimum decibels for frequency data
    pub min_decibels: f32,
    
    /// Maximum decibels for frequency data
    pub max_decibels: f32,
    
    /// Bass frequency range (Hz)
    pub bass_range: (f32, f32),
    
    /// Mids frequency range (Hz)
    pub mids_range: (f32, f32),
    
    /// Treble frequency range (Hz)
    pub treble_range: (f32, f32),
}

impl Default for FFTAnalyzerConfig {
    fn default() -> Self {
        Self {
            fft_size: 2048,
            smoothing_time_constant: 0.8,
            min_decibels: -90.0,
            max_decibels: -10.0,
            bass_range: (20.0, 250.0),
            mids_range: (250.0, 4000.0),
            treble_range: (4000.0, 20000.0),
        }
    }
}

/// # Responsibility
/// FFT analysis result for one frame.
#[derive(Debug, Clone, Copy)]
pub struct FFTData {
    /// Bass energy (0.0 - 1.0)
    pub bass: f32,
    
    /// Mids energy (0.0 - 1.0)
    pub mids: f32,
    
    /// Treble energy (0.0 - 1.0)
    pub treble: f32,
    
    /// Overall RMS energy (0.0 - 1.0)
    pub rms: f32,
    
    /// Peak frequency (Hz)
    pub peak_frequency: f32,
}

impl Default for FFTData {
    fn default() -> Self {
        Self {
            bass: 0.0,
            mids: 0.0,
            treble: 0.0,
            rms: 0.0,
            peak_frequency: 0.0,
        }
    }
}

/// # Responsibility
/// Performs real-time FFT analysis of audio stream.
///
/// ---
///
/// Wraps Web Audio API AnalyserNode to extract frequency bands.
/// Used to modulate visual parameters (particle size, bloom intensity, etc).
pub struct FFTAnalyzerService {
    config: FFTAnalyzerConfig,
    logger: Arc<dyn ILogger>,
    
    // Web Audio API nodes
    audio_context: Option<AudioContext>,
    analyser_node: Option<AnalyserNode>,
    
    // Frequency data buffer
    frequency_data: Vec<u8>,
    
    // Latest analysis result
    latest_data: FFTData,
}

impl FFTAnalyzerService {
    /// # Responsibility
    /// Creates a new FFTAnalyzerService with the given configuration.
    pub fn new(config: FFTAnalyzerConfig, logger: Arc<dyn ILogger>) -> Self {
        logger.info("Creating FFTAnalyzerService");
        
        let buffer_size = config.fft_size as usize / 2; // Nyquist frequency bins
        
        Self {
            config,
            logger,
            audio_context: None,
            analyser_node: None,
            frequency_data: vec![0u8; buffer_size],
            latest_data: FFTData::default(),
        }
    }
    
    /// # Responsibility
    /// Initializes the FFT analyzer with Web Audio API.
    pub fn initialize(&mut self, audio_context: AudioContext) -> Result<(), String> {
        self.logger.info("Initializing FFTAnalyzerService");
        
        // Create analyser node
        let analyser = audio_context
            .create_analyser()
            .map_err(|e| format!("Failed to create AnalyserNode: {:?}", e))?;
        
        // Configure analyser
        analyser.set_fft_size(self.config.fft_size);
        analyser.set_smoothing_time_constant(self.config.smoothing_time_constant as f64);
        analyser.set_min_decibels(self.config.min_decibels as f64);
        analyser.set_max_decibels(self.config.max_decibels as f64);
        
        self.audio_context = Some(audio_context);
        self.analyser_node = Some(analyser);
        
        self.logger.info("FFTAnalyzerService initialized successfully");
        Ok(())
    }
    
    /// # Responsibility
    /// Connects the analyzer to an audio source node.
    pub fn connect_source(&self, source_node: &web_sys::AudioNode) -> Result<(), String> {
        let analyser = self.analyser_node.as_ref().ok_or("FFTAnalyzerService not initialized")?;
        
        source_node
            .connect_with_audio_node(analyser)
            .map_err(|e| format!("Failed to connect audio source: {:?}", e))?;
        
        self.logger.info("Audio source connected to FFT analyzer");
        Ok(())
    }
    
    /// # Responsibility
    /// Analyzes current audio frame and returns FFT data.
    ///
    /// ---
    ///
    /// Should be called every frame (60 FPS) from the rendering loop.
    pub fn analyze(&mut self) -> Result<FFTData, String> {
        let analyser = self.analyser_node.as_ref().ok_or("FFTAnalyzerService not initialized")?;
        let audio_context = self.audio_context.as_ref().ok_or("AudioContext not initialized")?;
        
        // Get frequency data (0-255 byte values)
        analyser.get_byte_frequency_data(&mut self.frequency_data);
        
        // Calculate sample rate and frequency bin resolution
        let sample_rate = audio_context.sample_rate();
        let bin_count = self.frequency_data.len() as f32;
        let bin_hz = sample_rate / (bin_count * 2.0);
        
        // Helper: Calculate energy in frequency range
        let calculate_energy = |range: (f32, f32)| -> f32 {
            let start_bin = (range.0 / bin_hz).floor() as usize;
            let end_bin = (range.1 / bin_hz).ceil() as usize;
            
            let sum: f32 = self.frequency_data[start_bin..end_bin.min(self.frequency_data.len())]
                .iter()
                .map(|&v| (v as f32) / 255.0)
                .sum();
            
            let count = (end_bin - start_bin).max(1) as f32;
            sum / count
        };
        
        // Calculate bass, mids, treble
        let bass = calculate_energy(self.config.bass_range);
        let mids = calculate_energy(self.config.mids_range);
        let treble = calculate_energy(self.config.treble_range);
        
        // Calculate RMS energy (all frequencies)
        let rms_sum: f32 = self.frequency_data
            .iter()
            .map(|&v| {
                let normalized = (v as f32) / 255.0;
                normalized * normalized
            })
            .sum();
        let rms = (rms_sum / bin_count).sqrt();
        
        // Find peak frequency
        let peak_bin = self.frequency_data
            .iter()
            .enumerate()
            .max_by_key(|(_, &v)| v)
            .map(|(i, _)| i)
            .unwrap_or(0);
        let peak_frequency = peak_bin as f32 * bin_hz;
        
        // Store latest data
        self.latest_data = FFTData {
            bass,
            mids,
            treble,
            rms,
            peak_frequency,
        };
        
        Ok(self.latest_data)
    }
    
    /// # Responsibility
    /// Returns the latest FFT data without re-analyzing.
    pub fn get_latest_data(&self) -> FFTData {
        self.latest_data
    }
    
    /// # Responsibility
    /// Returns the raw frequency data buffer (for visualization).
    pub fn get_raw_frequency_data(&self) -> &[u8] {
        &self.frequency_data
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[test]
    fn test_fft_analyzer_config_defaults() {
        let config = FFTAnalyzerConfig::default();
        
        assert_eq!(config.fft_size, 2048);
        assert_eq!(config.smoothing_time_constant, 0.8);
        assert_eq!(config.min_decibels, -90.0);
        assert_eq!(config.max_decibels, -10.0);
        assert_eq!(config.bass_range, (20.0, 250.0));
        assert_eq!(config.mids_range, (250.0, 4000.0));
        assert_eq!(config.treble_range, (4000.0, 20000.0));
    }
    
    #[test]
    fn test_fft_analyzer_service_creation() {
        let config = FFTAnalyzerConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let service = FFTAnalyzerService::new(config, logger.clone());
        
        assert!(service.audio_context.is_none());
        assert!(service.analyser_node.is_none());
        assert_eq!(service.frequency_data.len(), 1024); // fft_size / 2
        
        let messages = logger.get_messages();
        assert!(messages.iter().any(|m| m.contains("Creating FFTAnalyzerService")));
    }
    
    #[test]
    fn test_fft_data_default() {
        let data = FFTData::default();
        
        assert_eq!(data.bass, 0.0);
        assert_eq!(data.mids, 0.0);
        assert_eq!(data.treble, 0.0);
        assert_eq!(data.rms, 0.0);
        assert_eq!(data.peak_frequency, 0.0);
    }
    
    #[test]
    fn test_get_latest_data_before_analysis() {
        let config = FFTAnalyzerConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let service = FFTAnalyzerService::new(config, logger);
        let data = service.get_latest_data();
        
        // Should return default FFTData
        assert_eq!(data.bass, 0.0);
        assert_eq!(data.mids, 0.0);
        assert_eq!(data.treble, 0.0);
    }
}

//! # Responsibility
//! Defines the audio analysis interface for FFT and instrument detection.

use crate::contracts::FrequencySpectrum;
use anyhow::Result;
use shaku::Interface;

/// # Responsibility
/// Performs FFT analysis for visualization and instrument detection.
pub trait IAudioAnalyzer: Interface {
    /// Compute frequency spectrum from audio samples
    fn analyze_spectrum(&self, samples: &[f32], sample_rate: u32) -> Result<FrequencySpectrum>;

    /// Detect instruments via frequency range analysis
    /// Returns: (bass_level, mid_level, treble_level) in [0.0, 1.0]
    fn detect_instruments(&self, spectrum: &FrequencySpectrum) -> (f32, f32, f32);

    /// Downsample waveform for visualization (peak detection)
    fn get_waveform_samples(&self, audio_buffer: &[f32], target_samples: usize) -> Vec<f32>;
}

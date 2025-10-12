//! # Responsibility
//! Provides spectral-based stem separation for parallel audio processing.
//!
//! ---
//!
//! This module implements the `IStemSeparator` trait using advanced DSP
//! techniques: FFT-based frequency band crossover and transient detection
//! to deconstruct audio into processable stems based on acoustic properties.

use crate::audio_loader::AudioData;
use anyhow::Result;
use rustfft::{num_complex::Complex, FftPlanner};
use std::collections::HashMap;
use std::f32::consts::PI;
use tracing::{debug, info};

/// # Responsibility
/// Enum representing the four stem types produced by spectral separation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Stem {
    /// Bass frequencies (20Hz - 200Hz): sub-bass and bass fundamentals
    Bass,
    /// Drums (transient content in 200Hz - 4kHz): percussive hits
    Drums,
    /// Vocals (sustained content in 200Hz - 4kHz): melodic/harmonic material
    Vocals,
    /// Presence (4kHz - 20kHz): air, cymbals, sibilance
    Presence,
}

/// # Responsibility
/// Trait defining the interface for stem separation implementations.
pub trait IStemSeparator: Send + Sync {
    /// Separates input audio into multiple stems.
    fn separate(&self, audio: &AudioData) -> Result<HashMap<Stem, AudioData>>;
}

/// # Responsibility
/// Spectral separator using FFT analysis and transient detection.
///
/// ---
///
/// **Separation Strategy:**
/// 1. **FFT Analysis**: Processes audio in overlapping blocks (2048 samples)
/// 2. **Frequency Crossover**:
///    - Bass: 20-200 Hz (isolated via band-pass)
///    - Presence: 4k-20k Hz (isolated via high-pass)
/// 3. **Transient Detection**: Within 200Hz-4kHz band, detects percussive hits
///    - Drums: High spectral flux (rapid energy changes)
///    - Vocals: Low spectral flux (sustained harmonic content)
pub struct SpectralSeparator {
    /// FFT block size (power of 2 for efficiency)
    block_size: usize,
    /// Hop size for overlap-add (50% overlap = block_size / 2)
    hop_size: usize,
    /// Spectral flux threshold for transient detection (normalized)
    transient_threshold: f32,
}

impl SpectralSeparator {
    /// # Responsibility
    /// Creates a new spectral separator with default parameters.
    ///
    /// ---
    ///
    /// **Parameters:**
    /// - block_size: 2048 samples (≈43ms at 48kHz, good time-frequency resolution)
    /// - hop_size: 1024 samples (50% overlap for smooth reconstruction)
    /// - transient_threshold: 0.15 (empirically tuned for drum detection)
    pub fn new() -> Self {
        Self {
            block_size: 2048,
            hop_size: 1024,
            transient_threshold: 0.15,
        }
    }

    /// # Responsibility
    /// Computes spectral flux between two consecutive FFT frames.
    ///
    /// ---
    ///
    /// Spectral flux measures how much the spectrum changes from one frame
    /// to the next. High flux indicates transient events (drum hits).
    fn compute_spectral_flux(&self, prev_mag: &[f32], curr_mag: &[f32]) -> f32 {
        let mut flux = 0.0;
        for (p, c) in prev_mag.iter().zip(curr_mag.iter()) {
            let diff = c - p;
            if diff > 0.0 {
                flux += diff;
            }
        }
        flux / prev_mag.len() as f32
    }

    /// # Responsibility
    /// Applies Hanning window to reduce spectral leakage.
    fn apply_window(&self, block: &mut [f32]) {
        for (i, sample) in block.iter_mut().enumerate() {
            let window = 0.5 * (1.0 - (2.0 * PI * i as f32 / (self.block_size as f32 - 1.0)).cos());
            *sample *= window;
        }
    }

    /// # Responsibility
    /// Creates a band-pass filter mask for frequency range.
    ///
    /// ---
    ///
    /// **Parameters:**
    /// - bin_count: Number of FFT bins (block_size / 2)
    /// - sample_rate: Audio sample rate in Hz
    /// - low_freq: Lower cutoff frequency in Hz
    /// - high_freq: Upper cutoff frequency in Hz
    fn create_band_mask(
        &self,
        bin_count: usize,
        sample_rate: u32,
        low_freq: f32,
        high_freq: f32,
    ) -> Vec<f32> {
        let mut mask = vec![0.0; bin_count];
        let freq_per_bin = sample_rate as f32 / self.block_size as f32;

        for i in 0..bin_count {
            let freq = i as f32 * freq_per_bin;
            if freq >= low_freq && freq <= high_freq {
                mask[i] = 1.0;
            }
        }
        mask
    }
}

impl Default for SpectralSeparator {
    fn default() -> Self {
        Self::new()
    }
}

impl IStemSeparator for SpectralSeparator {
    fn separate(&self, audio: &AudioData) -> Result<HashMap<Stem, AudioData>> {
        info!(
            "Starting spectral separation: {} frames, {} Hz, stereo",
            audio.samples.len(),
            audio.sample_rate
        );

        let frame_count = audio.samples.len();
        let sample_rate = audio.sample_rate;

        // Initialize stems with empty audio data
        let mut stems: HashMap<Stem, AudioData> = HashMap::new();
        for stem_type in [Stem::Bass, Stem::Drums, Stem::Vocals, Stem::Presence] {
            stems.insert(
                stem_type,
                AudioData {
                    samples: vec![[0.0, 0.0]; frame_count],
                    sample_rate,
                },
            );
        }

        // Create FFT planner
        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(self.block_size);
        let ifft = planner.plan_fft_inverse(self.block_size);

        // Create frequency masks
        let bin_count = self.block_size / 2;
        let bass_mask = self.create_band_mask(bin_count, sample_rate, 20.0, 200.0);
        let presence_mask = self.create_band_mask(bin_count, sample_rate, 4000.0, 20000.0);
        let midrange_mask = self.create_band_mask(bin_count, sample_rate, 200.0, 4000.0);

        // Process each channel separately
        for channel in 0..2 {
            debug!("Processing channel {}", channel);

            let mut prev_magnitude: Vec<f32> = vec![0.0; bin_count];
            let blocks = (frame_count - self.block_size) / self.hop_size + 1;

            for block_idx in 0..blocks {
                let start = block_idx * self.hop_size;
                let end = (start + self.block_size).min(frame_count);

                if end - start < self.block_size {
                    break; // Skip incomplete final block
                }

                // Extract and window the block
                let mut block: Vec<f32> = (start..end)
                    .map(|i| audio.samples[i][channel])
                    .collect();
                self.apply_window(&mut block);

                // Forward FFT
                let mut spectrum: Vec<Complex<f32>> =
                    block.iter().map(|&s| Complex::new(s, 0.0)).collect();
                fft.process(&mut spectrum);

                // Compute magnitude spectrum
                let magnitude: Vec<f32> = spectrum
                    .iter()
                    .take(bin_count)
                    .map(|c| c.norm())
                    .collect();

                // Compute spectral flux for transient detection
                let flux = self.compute_spectral_flux(&prev_magnitude, &magnitude);
                let is_transient = flux > self.transient_threshold;

                // Create four filtered spectra
                let mut bass_spectrum = spectrum.clone();
                let mut presence_spectrum = spectrum.clone();
                let mut drums_spectrum = spectrum.clone();
                let mut vocals_spectrum = spectrum.clone();

                for i in 0..bin_count {
                    // Apply masks (symmetric for conjugate bins)
                    bass_spectrum[i] *= bass_mask[i];
                    bass_spectrum[self.block_size - i - 1] *= bass_mask[i];

                    presence_spectrum[i] *= presence_mask[i];
                    presence_spectrum[self.block_size - i - 1] *= presence_mask[i];

                    // Midrange: split based on transient detection
                    if is_transient {
                        drums_spectrum[i] *= midrange_mask[i];
                        drums_spectrum[self.block_size - i - 1] *= midrange_mask[i];
                        vocals_spectrum[i] *= 0.0;
                        vocals_spectrum[self.block_size - i - 1] *= 0.0;
                    } else {
                        drums_spectrum[i] *= 0.0;
                        drums_spectrum[self.block_size - i - 1] *= 0.0;
                        vocals_spectrum[i] *= midrange_mask[i];
                        vocals_spectrum[self.block_size - i - 1] *= midrange_mask[i];
                    }
                }

                // Inverse FFT for each stem
                ifft.process(&mut bass_spectrum);
                ifft.process(&mut presence_spectrum);
                ifft.process(&mut drums_spectrum);
                ifft.process(&mut vocals_spectrum);

                // Overlap-add reconstruction (with normalization)
                let norm = 1.0 / self.block_size as f32;
                for (i, offset) in (start..end).enumerate() {
                    stems.get_mut(&Stem::Bass).unwrap().samples[offset][channel] +=
                        bass_spectrum[i].re * norm;
                    stems.get_mut(&Stem::Presence).unwrap().samples[offset][channel] +=
                        presence_spectrum[i].re * norm;
                    stems.get_mut(&Stem::Drums).unwrap().samples[offset][channel] +=
                        drums_spectrum[i].re * norm;
                    stems.get_mut(&Stem::Vocals).unwrap().samples[offset][channel] +=
                        vocals_spectrum[i].re * norm;
                }

                prev_magnitude = magnitude;
            }
        }

        info!("Spectral separation complete: 4 stems generated");
        Ok(stems)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spectral_separator_creation() {
        let separator = SpectralSeparator::new();
        assert_eq!(separator.block_size, 2048);
        assert_eq!(separator.hop_size, 1024);
        assert_eq!(separator.transient_threshold, 0.15);
    }

    #[test]
    fn test_band_mask_creation() {
        let separator = SpectralSeparator::new();
        let mask = separator.create_band_mask(1024, 48000, 100.0, 200.0);

        // Verify mask is 1.0 within band, 0.0 outside
        let freq_per_bin = 48000.0 / 2048.0; // ~23.4 Hz per bin
        for (i, &value) in mask.iter().enumerate() {
            let freq = i as f32 * freq_per_bin;
            if freq >= 100.0 && freq <= 200.0 {
                assert_eq!(value, 1.0, "Bin {} ({:.1} Hz) should be 1.0", i, freq);
            } else {
                assert_eq!(value, 0.0, "Bin {} ({:.1} Hz) should be 0.0", i, freq);
            }
        }
    }

    #[test]
    fn test_spectral_flux_computation() {
        let separator = SpectralSeparator::new();
        let prev = vec![1.0, 2.0, 3.0, 4.0];
        let curr = vec![2.0, 3.0, 4.0, 5.0]; // All bins increased by 1.0

        let flux = separator.compute_spectral_flux(&prev, &curr);
        assert!((flux - 1.0).abs() < 0.01, "Expected flux ~1.0, got {}", flux);
    }

    #[test]
    fn test_separate_stereo_sine_wave() {
        let separator = SpectralSeparator::new();
        let sample_rate = 48000;
        let duration_samples = 4800; // 0.1 seconds

        // Generate 100 Hz sine wave (should appear in Bass stem)
        let mut samples = Vec::new();
        for i in 0..duration_samples {
            let t = i as f32 / sample_rate as f32;
            let sample = (2.0 * PI * 100.0 * t).sin();
            samples.push([sample, sample]);
        }

        let audio = AudioData {
            samples,
            sample_rate,
        };

        let stems = separator.separate(&audio).expect("Separation failed");

        // Verify we got 4 stems
        assert_eq!(stems.len(), 4);
        assert!(stems.contains_key(&Stem::Bass));
        assert!(stems.contains_key(&Stem::Drums));
        assert!(stems.contains_key(&Stem::Vocals));
        assert!(stems.contains_key(&Stem::Presence));

        // Bass stem should have significant energy (100 Hz is in 20-200 Hz band)
        let bass_energy: f32 = stems[&Stem::Bass]
            .samples
            .iter()
            .map(|f| f[0] * f[0])
            .sum();
        assert!(bass_energy > 0.01, "Bass stem should contain 100 Hz energy");
    }
}

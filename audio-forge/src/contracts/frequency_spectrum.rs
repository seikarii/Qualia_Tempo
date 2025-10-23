//! # Responsibility
//! Data contract for FFT frequency spectrum results.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents frequency spectrum data from FFT analysis.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FrequencySpectrum {
    /// Frequency bins (Hz)
    pub frequencies: Vec<f32>,

    /// Magnitude values (normalized to [0.0, 1.0])
    pub magnitudes: Vec<f32>,

    /// Sample rate used for analysis
    pub sample_rate: u32,

    /// FFT window size
    pub window_size: usize,
}

impl FrequencySpectrum {
    /// # Responsibility
    /// Calculate average amplitude in frequency range.
    pub fn average_amplitude_in_range(&self, low_hz: f32, high_hz: f32) -> f32 {
        let mut sum = 0.0;
        let mut count = 0;

        for (i, &freq) in self.frequencies.iter().enumerate() {
            if freq >= low_hz && freq <= high_hz {
                sum += self.magnitudes[i];
                count += 1;
            }
        }

        if count > 0 { sum / count as f32 } else { 0.0 }
    }

    /// # Responsibility
    /// Find peak frequency in range.
    pub fn peak_frequency_in_range(&self, low_hz: f32, high_hz: f32) -> Option<f32> {
        let mut peak_freq = None;
        let mut peak_mag = 0.0;

        for (i, &freq) in self.frequencies.iter().enumerate() {
            if freq >= low_hz && freq <= high_hz && self.magnitudes[i] > peak_mag {
                peak_mag = self.magnitudes[i];
                peak_freq = Some(freq);
            }
        }

        peak_freq
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_average_amplitude_in_range() {
        let spectrum = FrequencySpectrum {
            frequencies: vec![100.0, 200.0, 300.0, 400.0],
            magnitudes: vec![0.5, 0.8, 0.6, 0.4],
            sample_rate: 44100,
            window_size: 2048,
        };

        let avg = spectrum.average_amplitude_in_range(150.0, 350.0);
        assert!((avg - 0.7).abs() < 0.01); // (0.8 + 0.6) / 2 = 0.7
    }

    #[test]
    fn test_peak_frequency_detection() {
        let spectrum = FrequencySpectrum {
            frequencies: vec![100.0, 200.0, 300.0, 400.0],
            magnitudes: vec![0.5, 0.8, 0.6, 0.4],
            sample_rate: 44100,
            window_size: 2048,
        };

        let peak = spectrum.peak_frequency_in_range(100.0, 400.0);
        assert_eq!(peak, Some(200.0));
    }

    #[test]
    fn test_no_peak_in_empty_range() {
        let spectrum = FrequencySpectrum {
            frequencies: vec![100.0, 200.0, 300.0, 400.0],
            magnitudes: vec![0.5, 0.8, 0.6, 0.4],
            sample_rate: 44100,
            window_size: 2048,
        };

        let peak = spectrum.peak_frequency_in_range(500.0, 600.0);
        assert_eq!(peak, None);
    }
}

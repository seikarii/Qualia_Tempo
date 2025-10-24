//! # Responsibility
//! High-fidelity mock for IAudioAnalyzer trait.
//!
//! ---
//!
//! Enables testing of FFT-dependent services without real signal processing.

use crate::contracts::FrequencySpectrum;
use crate::errors::AudioAnalyzerError;
use crate::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use mockall::mock;

mock! {
    /// # Responsibility
    /// Mock implementation of IAudioAnalyzer for unit testing.
    ///
    /// ---
    ///
    /// **RETURN VALUE PATTERN**: Use `.returning()` for dynamic responses:
    /// ```rust
    /// mock.expect_analyze_spectrum()
    ///     .returning(|samples, _| {
    ///         Ok(FrequencySpectrum {
    ///             magnitudes: vec![0.5; samples.len()],
    ///             frequencies: vec![440.0; samples.len()],
    ///             sample_rate: 44100,
    ///             peak_frequency: Some(440.0),
    ///         })
    ///     });
    /// ```
    pub AudioAnalyzer {}

    impl IAudioAnalyzer for AudioAnalyzer {
        fn analyze_spectrum(&self, samples: &[f32], sample_rate: u32) -> Result<FrequencySpectrum, AudioAnalyzerError>;
        fn detect_instruments(&self, spectrum: &FrequencySpectrum) -> (f32, f32, f32);
        fn get_waveform_samples(&self, audio_buffer: &[f32], target_samples: usize) -> Vec<f32>;
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_analyze_spectrum_returns_data() {
        let mut mock = MockAudioAnalyzer::new();
        
        mock.expect_analyze_spectrum()
            .times(1)
            .returning(|_, sample_rate| {
                Ok(FrequencySpectrum {
                    magnitudes: vec![0.5, 0.3, 0.1],
                    frequencies: vec![100.0, 200.0, 300.0],
                    sample_rate,
                    window_size: 2048,
                })
            });

        let samples = vec![0.5; 100];
        let result = mock.analyze_spectrum(&samples, 44100).unwrap();
        assert_eq!(result.magnitudes.len(), 3);
        assert_eq!(result.window_size, 2048);
    }

    #[test]
    fn test_mock_detect_instruments() {
        let mut mock = MockAudioAnalyzer::new();
        
        // Return bass-heavy profile
        mock.expect_detect_instruments()
            .times(1)
            .return_const((0.8, 0.3, 0.1));

        let spectrum = FrequencySpectrum {
            magnitudes: vec![],
            frequencies: vec![],
            sample_rate: 44100,
            window_size: 2048,
        };

        let (bass, mid, treble) = mock.detect_instruments(&spectrum);
        assert_eq!(bass, 0.8);
        assert_eq!(mid, 0.3);
        assert_eq!(treble, 0.1);
    }
}

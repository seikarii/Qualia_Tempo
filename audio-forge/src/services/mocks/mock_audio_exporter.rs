//! # Responsibility
//! High-fidelity mock for IAudioExporter trait.
//!
//! ---
//!
//! Enables testing of export workflows without actual file I/O.

use crate::errors::AudioExporterError;
use crate::services::interfaces::i_audio_exporter::IAudioExporter;
use mockall::mock;
use std::path::Path;

mock! {
    /// # Responsibility
    /// Mock implementation of IAudioExporter for unit testing.
    ///
    /// ---
    ///
    /// **FILE PATH VALIDATION**: Use `.withf()` to verify output paths:
    /// ```rust
    /// mock.expect_export_wav()
    ///     .withf(|path: &Path, _, _| path.extension() == Some("wav".as_ref()))
    ///     .returning(|_, _, _| Ok(()));
    /// ```
    pub AudioExporter {}

    impl IAudioExporter for AudioExporter {
        fn export_wav(&self, output_path: &Path, samples: &[f32], sample_rate: u32) -> Result<(), AudioExporterError>;
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_mock_export_wav_succeeds() {
        let mut mock = MockAudioExporter::new();
        
        mock.expect_export_wav()
            .times(1)
            .returning(|_, _, _| Ok(()));

        let path = PathBuf::from("/tmp/test.wav");
        let samples = vec![0.5; 100];
        assert!(mock.export_wav(&path, &samples, 44100).is_ok());
    }

    #[test]
    fn test_mock_export_wav_validates_path() {
        let mut mock = MockAudioExporter::new();
        
        // Verify .wav extension
        mock.expect_export_wav()
            .withf(|path: &Path, _, _| {
                path.extension().and_then(|e| e.to_str()) == Some("wav")
            })
            .returning(|_, _, _| Ok(()));

        let path = PathBuf::from("output.wav");
        let samples = vec![0.5; 10];
        mock.export_wav(&path, &samples, 44100).unwrap();
    }

    #[test]
    fn test_mock_export_wav_can_fail() {
        let mut mock = MockAudioExporter::new();
        
        mock.expect_export_wav()
            .returning(|_, _, _| {
                Err(AudioExporterError::WriteError("disk full".to_string()))
            });

        let path = PathBuf::from("fail.wav");
        let result = mock.export_wav(&path, &[], 44100);
        assert!(result.is_err());
    }
}

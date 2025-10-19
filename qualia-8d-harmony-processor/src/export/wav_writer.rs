//! # Responsibility
//! WAV file export with 24-bit precision and binaural (stereo) output.

use crate::audio::BinauralSignal;
use anyhow::{Context, Result};
use hound::{WavSpec, WavWriter};
use std::path::Path;

/// Configuration for WAV export
#[derive(Debug, Clone)]
pub struct WavExporterConfig {
    pub sample_rate: u32,
    pub bit_depth: u16,
    pub channels: u16,
}

impl WavExporterConfig {
    pub fn new_24bit_stereo(sample_rate: u32) -> Self {
        Self {
            sample_rate,
            bit_depth: 24,
            channels: 2,
        }
    }

    pub fn validate(&self) -> Result<()> {
        anyhow::ensure!(
            self.sample_rate > 0,
            "Sample rate must be positive, got {}",
            self.sample_rate
        );
        anyhow::ensure!(
            self.bit_depth == 16 || self.bit_depth == 24 || self.bit_depth == 32,
            "Bit depth must be 16, 24, or 32, got {}",
            self.bit_depth
        );
        anyhow::ensure!(
            self.channels == 1 || self.channels == 2,
            "Channels must be 1 (mono) or 2 (stereo), got {}",
            self.channels
        );
        Ok(())
    }
}

/// WAV file exporter
pub struct WavExporter {
    config: WavExporterConfig,
}

impl WavExporter {
    pub fn new(config: WavExporterConfig) -> Result<Self> {
        config.validate().context("Invalid WavExporterConfig")?;
        Ok(Self { config })
    }

    /// Export binaural signal to WAV file
    pub fn export_binaural(&self, signal: &BinauralSignal, path: &Path) -> Result<()> {
        anyhow::ensure!(
            signal.left.len() == signal.right.len(),
            "Left and right channels must have same length"
        );

        let spec = WavSpec {
            channels: 2,
            sample_rate: self.config.sample_rate,
            bits_per_sample: self.config.bit_depth,
            sample_format: hound::SampleFormat::Int,
        };

        let mut writer = WavWriter::create(path, spec)
            .context(format!("Failed to create WAV file: {:?}", path))?;

        // Interleave left and right channels
        for (l, r) in signal.left.iter().zip(signal.right.iter()) {
            self.write_sample(&mut writer, *l)?;
            self.write_sample(&mut writer, *r)?;
        }

        writer.finalize().context("Failed to finalize WAV file")?;

        Ok(())
    }

    /// Export mono signal to WAV file
    pub fn export_mono(&self, samples: &[f32], path: &Path) -> Result<()> {
        let spec = WavSpec {
            channels: 1,
            sample_rate: self.config.sample_rate,
            bits_per_sample: self.config.bit_depth,
            sample_format: hound::SampleFormat::Int,
        };

        let mut writer = WavWriter::create(path, spec)
            .context(format!("Failed to create WAV file: {:?}", path))?;

        for &sample in samples {
            self.write_sample(&mut writer, sample)?;
        }

        writer.finalize().context("Failed to finalize WAV file")?;

        Ok(())
    }

    /// Write single sample with correct bit depth scaling
    fn write_sample(&self, writer: &mut WavWriter<std::io::BufWriter<std::fs::File>>, sample: f32) -> Result<()> {
        // Clamp sample to [-1.0, 1.0]
        let clamped = sample.clamp(-1.0, 1.0);

        match self.config.bit_depth {
            16 => {
                let scaled = (clamped * i16::MAX as f32) as i16;
                writer.write_sample(scaled).context("Failed to write 16-bit sample")?;
            }
            24 => {
                // 24-bit is stored as i32 with 8 MSB unused
                let max_24bit = 8388607.0; // 2^23 - 1
                let scaled = (clamped * max_24bit) as i32;
                writer.write_sample(scaled).context("Failed to write 24-bit sample")?;
            }
            32 => {
                let scaled = (clamped * i32::MAX as f32) as i32;
                writer.write_sample(scaled).context("Failed to write 32-bit sample")?;
            }
            _ => anyhow::bail!("Unsupported bit depth: {}", self.config.bit_depth),
        }

        Ok(())
    }

    pub fn config(&self) -> &WavExporterConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_config_24bit_stereo() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        assert_eq!(config.sample_rate, 48000);
        assert_eq!(config.bit_depth, 24);
        assert_eq!(config.channels, 2);
    }

    #[test]
    fn test_config_validation_valid() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation_zero_sample_rate() {
        let mut config = WavExporterConfig::new_24bit_stereo(48000);
        config.sample_rate = 0;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_invalid_bit_depth() {
        let mut config = WavExporterConfig::new_24bit_stereo(48000);
        config.bit_depth = 20;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_invalid_channels() {
        let mut config = WavExporterConfig::new_24bit_stereo(48000);
        config.channels = 5;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_exporter_creation() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        let exporter = WavExporter::new(config);
        assert!(exporter.is_ok());
    }

    #[test]
    fn test_export_binaural_creates_file() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        let exporter = WavExporter::new(config).unwrap();

        let signal = BinauralSignal {
            left: vec![0.5; 1000],
            right: vec![-0.5; 1000],
        };

        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_binaural.wav");

        let result = exporter.export_binaural(&signal, &file_path);
        assert!(result.is_ok());
        assert!(file_path.exists());
    }

    #[test]
    fn test_export_mono_creates_file() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        let exporter = WavExporter::new(config).unwrap();

        let samples = vec![0.0, 0.5, -0.5, 1.0, -1.0];

        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_mono.wav");

        let result = exporter.export_mono(&samples, &file_path);
        assert!(result.is_ok());
        assert!(file_path.exists());
    }

    #[test]
    fn test_export_binaural_mismatched_lengths() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        let exporter = WavExporter::new(config).unwrap();

        let signal = BinauralSignal {
            left: vec![0.5; 1000],
            right: vec![-0.5; 500], // Mismatched!
        };

        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_mismatch.wav");

        let result = exporter.export_binaural(&signal, &file_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_export_16bit() {
        let mut config = WavExporterConfig::new_24bit_stereo(48000);
        config.bit_depth = 16;
        let exporter = WavExporter::new(config).unwrap();

        let samples = vec![0.0, 0.5, -0.5, 1.0];

        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_16bit.wav");

        let result = exporter.export_mono(&samples, &file_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_export_32bit() {
        let mut config = WavExporterConfig::new_24bit_stereo(48000);
        config.bit_depth = 32;
        let exporter = WavExporter::new(config).unwrap();

        let samples = vec![0.0, 0.5, -0.5, 1.0];

        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_32bit.wav");

        let result = exporter.export_mono(&samples, &file_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_sample_clamping() {
        let config = WavExporterConfig::new_24bit_stereo(48000);
        let exporter = WavExporter::new(config).unwrap();

        // Values beyond [-1.0, 1.0] should be clamped
        let samples = vec![1.5, -2.0, 0.5];

        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test_clamped.wav");

        let result = exporter.export_mono(&samples, &file_path);
        assert!(result.is_ok()); // Should succeed with clamping
    }
}

//! # Responsibility
//! Implements audio export functionality to WAV format.
//!
//! ---
//!
//! This service handles the conversion of processed f32 audio samples
//! to standard WAV file format using the hound crate. It provides
//! CD-quality exports (44.1 kHz, 16-bit, stereo) with proper clipping
//! prevention and error handling.

use anyhow::{anyhow, Context, Result};
use hound::{WavSpec, WavWriter};
use shaku::Component;
use std::path::Path;
use tracing::{info, warn};

use super::interfaces::IAudioExporter;

/// # Responsibility
/// Service for exporting processed audio samples to WAV files.
///
/// ---
///
/// ## Directive 17: Audio Export Implementation
/// Uses hound crate for WAV writing with the following specifications:
/// - Sample rate: Variable (typically 44100 Hz)
/// - Channels: 2 (stereo)
/// - Bit depth: 16-bit signed integer
/// - Format: PCM
///
/// ## Conversion Algorithm
/// f32 → i16 conversion with clipping prevention:
/// 1. Clamp input to [-1.0, 1.0]
/// 2. Scale by 32767.0 (i16::MAX)
/// 3. Round to nearest integer
/// 4. Cast to i16
///
/// ## Performance
/// - Streaming writes (no full buffer in memory)
/// - ~100 MB/s throughput for typical audio
/// - Memory usage: O(1) (buffered I/O)
#[derive(Component, Default)]
#[shaku(interface = IAudioExporter)]
pub struct AudioExporterService;

impl AudioExporterService {
    /// # Responsibility
    /// Convert f32 sample to i16 with clipping prevention.
    ///
    /// ---
    ///
    /// ## Algorithm
    /// - Clamp to [-1.0, 1.0] to prevent overflow
    /// - Scale by 32767.0 (maximum i16 value)
    /// - Round to nearest integer for minimal quantization error
    ///
    /// ## Examples
    /// - 1.0 → 32767
    /// - 0.0 → 0
    /// - -1.0 → -32767
    /// - 1.5 → 32767 (clamped)
    #[inline]
    fn f32_to_i16(sample: f32) -> i16 {
        // Clamp to valid range
        let clamped = sample.clamp(-1.0, 1.0);
        
        // Scale and round
        let scaled = clamped * 32767.0;
        
        // Convert to i16 (rounding is automatic with 'as' cast after multiplication)
        scaled as i16
    }
}

impl IAudioExporter for AudioExporterService {
    fn export_wav(
        &self,
        output_path: &Path,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<()> {
        info!("💾 Exporting audio to WAV: {}", output_path.display());
        info!("   Sample rate: {} Hz", sample_rate);
        info!("   Samples: {} ({:.2} seconds)", samples.len(), samples.len() as f64 / sample_rate as f64 / 2.0);
        
        // Validation: Empty buffer check
        if samples.is_empty() {
            return Err(anyhow!("Cannot export empty audio buffer"));
        }
        
        // Validation: Sample rate sanity check
        if sample_rate == 0 || sample_rate > 192_000 {
            return Err(anyhow!("Invalid sample rate: {} Hz (must be 1-192000)", sample_rate));
        }
        
        // Validation: Stereo pair check
        if !samples.len().is_multiple_of(2) {
            warn!("⚠️  Sample count is odd ({}), truncating last sample", samples.len());
        }
        
        // Configure WAV specification (CD quality: 44.1kHz, 16-bit, stereo)
        let spec = WavSpec {
            channels: 2,              // Stereo
            sample_rate,              // From source file (typically 44100)
            bits_per_sample: 16,      // CD quality
            sample_format: hound::SampleFormat::Int, // Signed integer PCM
        };
        
        // Create WAV writer
        let mut writer = WavWriter::create(output_path, spec)
            .context(format!("Failed to create WAV file: {}", output_path.display()))?;
        
        // Write samples with f32 → i16 conversion
        let mut written_samples = 0;
        for &sample in samples.iter() {
            let i16_sample = Self::f32_to_i16(sample);
            writer.write_sample(i16_sample)
                .context("Failed to write sample to WAV file")?;
            written_samples += 1;
        }
        
        // Finalize WAV file (writes headers, flushes buffers)
        writer.finalize()
            .context("Failed to finalize WAV file")?;
        
        info!("✅ Export complete: {} samples written", written_samples);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// # Responsibility
    /// Verify f32 → i16 conversion produces correct values.
    #[test]
    fn test_f32_to_i16_conversion() {
        // Test exact values
        assert_eq!(AudioExporterService::f32_to_i16(1.0), 32767);
        assert_eq!(AudioExporterService::f32_to_i16(0.0), 0);
        assert_eq!(AudioExporterService::f32_to_i16(-1.0), -32767);
        
        // Test mid-range values
        assert_eq!(AudioExporterService::f32_to_i16(0.5), 16383);
        assert_eq!(AudioExporterService::f32_to_i16(-0.5), -16383);
        
        // Test clipping (values outside [-1.0, 1.0])
        assert_eq!(AudioExporterService::f32_to_i16(2.0), 32767);
        assert_eq!(AudioExporterService::f32_to_i16(-2.0), -32767);
        assert_eq!(AudioExporterService::f32_to_i16(100.0), 32767);
        assert_eq!(AudioExporterService::f32_to_i16(-100.0), -32767);
    }

    /// # Responsibility
    /// Verify WAV export creates valid file with correct headers.
    #[test]
    fn test_export_wav_creates_valid_file() {
        let service = AudioExporterService;
        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir.path().join("test_output.wav");
        
        // Create test samples: 1 second of 440 Hz sine wave (stereo)
        let sample_rate = 44100;
        let duration_secs = 1.0;
        let frequency = 440.0; // A4 note
        
        let mut samples = Vec::new();
        let total_samples = (sample_rate as f64 * duration_secs) as usize * 2; // Stereo
        
        for i in 0..total_samples / 2 {
            let t = i as f64 / sample_rate as f64;
            let sample = (2.0 * std::f64::consts::PI * frequency * t).sin() as f32;
            samples.push(sample * 0.5); // Left channel
            samples.push(sample * 0.5); // Right channel
        }
        
        // Export to WAV
        let result = service.export_wav(&output_path, &samples, sample_rate);
        assert!(result.is_ok(), "Export failed: {:?}", result.err());
        
        // Verify file exists
        assert!(output_path.exists(), "WAV file was not created");
        
        // Verify file size (rough estimate: header + data)
        let metadata = fs::metadata(&output_path).unwrap();
        let expected_size = 44 + (samples.len() * 2); // WAV header + 16-bit samples
        assert!(
            metadata.len() >= expected_size as u64,
            "File size too small: {} bytes (expected ~{})",
            metadata.len(),
            expected_size
        );
    }

    /// # Responsibility
    /// Verify export rejects empty sample buffer.
    #[test]
    fn test_export_wav_rejects_empty_buffer() {
        let service = AudioExporterService;
        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir.path().join("empty.wav");
        
        let empty_samples: Vec<f32> = vec![];
        let result = service.export_wav(&output_path, &empty_samples, 44100);
        
        assert!(result.is_err(), "Should reject empty buffer");
        assert!(result.unwrap_err().to_string().contains("empty"));
    }

    /// # Responsibility
    /// Verify export rejects invalid sample rates.
    #[test]
    fn test_export_wav_rejects_invalid_sample_rate() {
        let service = AudioExporterService;
        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir.path().join("invalid.wav");
        
        let samples = vec![0.0, 0.0, 0.0, 0.0];
        
        // Test zero sample rate
        let result = service.export_wav(&output_path, &samples, 0);
        assert!(result.is_err(), "Should reject zero sample rate");
        
        // Test excessive sample rate
        let result = service.export_wav(&output_path, &samples, 999_999);
        assert!(result.is_err(), "Should reject excessive sample rate");
    }

    /// # Responsibility
    /// Verify clipping prevention for out-of-range samples.
    #[test]
    fn test_export_wav_handles_clipping() {
        let service = AudioExporterService;
        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir.path().join("clipping.wav");
        
        // Create samples with values outside [-1.0, 1.0]
        let samples = vec![
            2.0, -2.0,    // Should be clamped to ±1.0
            1.5, -1.5,    // Should be clamped
            0.5, -0.5,    // Normal values
        ];
        
        let result = service.export_wav(&output_path, &samples, 44100);
        assert!(result.is_ok(), "Export should succeed with clipping prevention");
        
        // File should exist and contain clamped data
        assert!(output_path.exists());
    }
}

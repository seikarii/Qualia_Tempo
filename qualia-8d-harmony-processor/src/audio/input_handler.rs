//! # Responsibility
//! Audio file loading, decoding, and normalization to target sample rate.
//!
//! Uses Symphonia for multi-codec decoding and Rubato for high-quality resampling.

use anyhow::{Context, Result};
use rubato::{FftFixedInOut, Resampler};
use std::path::Path;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

/// Audio buffer with mono samples normalized to [-1.0, 1.0]
#[derive(Debug, Clone)]
pub struct AudioBuffer {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub duration_sec: f64,
}

impl AudioBuffer {
    pub fn new(samples: Vec<f32>, sample_rate: u32) -> Self {
        let duration_sec = samples.len() as f64 / sample_rate as f64;
        Self {
            samples,
            sample_rate,
            duration_sec,
        }
    }

    pub fn len(&self) -> usize {
        self.samples.len()
    }

    pub fn is_empty(&self) -> bool {
        self.samples.is_empty()
    }
}

/// Configuration for input handler
#[derive(Debug, Clone)]
pub struct InputHandlerConfig {
    pub target_sample_rate: u32,
    pub convert_to_mono: bool,
}

impl InputHandlerConfig {
    pub fn new(target_sample_rate: u32) -> Self {
        Self {
            target_sample_rate,
            convert_to_mono: true,
        }
    }

    pub fn validate(&self) -> Result<()> {
        anyhow::ensure!(
            self.target_sample_rate > 0,
            "Target sample rate must be positive, got {}",
            self.target_sample_rate
        );
        anyhow::ensure!(
            self.target_sample_rate >= 8000 && self.target_sample_rate <= 192000,
            "Target sample rate must be in range [8000, 192000], got {}",
            self.target_sample_rate
        );
        Ok(())
    }
}

/// Audio file loader and decoder
pub struct InputHandler {
    config: InputHandlerConfig,
}

impl InputHandler {
    pub fn new(config: InputHandlerConfig) -> Result<Self> {
        config.validate().context("Invalid InputHandlerConfig")?;
        Ok(Self { config })
    }

    /// Load and decode audio file to normalized mono buffer
    pub fn load_stem(&self, path: &Path) -> Result<AudioBuffer> {
        // Open file
        let file = std::fs::File::open(path)
            .context(format!("Failed to open audio file: {:?}", path))?;

        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        // Create hint from file extension
        let mut hint = Hint::new();
        if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            hint.with_extension(ext);
        }

        // Probe format
        let format_opts = FormatOptions::default();
        let metadata_opts = MetadataOptions::default();
        
        let probed = symphonia::default::get_probe()
            .format(&hint, mss, &format_opts, &metadata_opts)
            .context("Failed to probe audio format")?;

        let mut format = probed.format;

        // Get default track
        let track = format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .context("No valid audio track found")?;

        // Create decoder
        let mut decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .context("Failed to create decoder")?;

        let track_id = track.id;
        let original_sample_rate = track
            .codec_params
            .sample_rate
            .context("Sample rate not found in codec params")?;

        let channels = track
            .codec_params
            .channels
            .context("Channel count not found in codec params")?
            .count();

        // Decode all packets
        let mut all_samples = Vec::new();
        
        loop {
            let packet = match format.next_packet() {
                Ok(packet) => packet,
                Err(_) => break, // End of stream
            };

            if packet.track_id() != track_id {
                continue;
            }

            match decoder.decode(&packet) {
                Ok(decoded) => {
                    let mut sample_buf = SampleBuffer::<f32>::new(
                        decoded.capacity() as u64,
                        *decoded.spec(),
                    );
                    sample_buf.copy_interleaved_ref(decoded);
                    all_samples.extend_from_slice(sample_buf.samples());
                }
                Err(_) => continue,
            }
        }

        // Convert to mono if needed
        let mono_samples = if self.config.convert_to_mono && channels > 1 {
            self.convert_to_mono(&all_samples, channels)
        } else {
            all_samples
        };

        // Resample if needed
        let final_samples = if original_sample_rate != self.config.target_sample_rate {
            self.resample(&mono_samples, original_sample_rate, self.config.target_sample_rate)?
        } else {
            mono_samples
        };

        Ok(AudioBuffer::new(final_samples, self.config.target_sample_rate))
    }

    /// Convert interleaved multi-channel audio to mono by averaging
    fn convert_to_mono(&self, interleaved: &[f32], channels: usize) -> Vec<f32> {
        let num_frames = interleaved.len() / channels;
        let mut mono = Vec::with_capacity(num_frames);

        for frame_idx in 0..num_frames {
            let mut sum = 0.0;
            for ch in 0..channels {
                sum += interleaved[frame_idx * channels + ch];
            }
            mono.push(sum / channels as f32);
        }

        mono
    }

    /// Resample audio using high-quality FFT-based resampling
    fn resample(&self, input: &[f32], from_rate: u32, to_rate: u32) -> Result<Vec<f32>> {
        let chunk_size = 1024;
        let mut resampler = FftFixedInOut::<f32>::new(
            from_rate as usize,
            to_rate as usize,
            chunk_size,
            1, // mono
        )
        .context("Failed to create resampler")?;

        let mut output = Vec::new();
        let mut input_chunks = input.chunks_exact(chunk_size);

        for chunk in input_chunks.by_ref() {
            let waves_in = vec![chunk.to_vec()];
            let waves_out = resampler
                .process(&waves_in, None)
                .context("Resampling failed")?;
            output.extend_from_slice(&waves_out[0]);
        }

        // Handle remainder
        let remainder = input_chunks.remainder();
        if !remainder.is_empty() {
            let mut padded = remainder.to_vec();
            padded.resize(chunk_size, 0.0);
            let waves_in = vec![padded];
            let waves_out = resampler
                .process(&waves_in, None)
                .context("Resampling remainder failed")?;
            
            // Only take valid samples (not padding)
            let valid_out_len = (remainder.len() as f64 * to_rate as f64 / from_rate as f64) as usize;
            output.extend_from_slice(&waves_out[0][..valid_out_len]);
        }

        Ok(output)
    }

    pub fn config(&self) -> &InputHandlerConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_buffer_creation() {
        let samples = vec![0.5, -0.5, 0.0, 1.0];
        let buffer = AudioBuffer::new(samples.clone(), 48000);

        assert_eq!(buffer.samples, samples);
        assert_eq!(buffer.sample_rate, 48000);
        assert_eq!(buffer.len(), 4);
        assert!(!buffer.is_empty());
    }

    #[test]
    fn test_audio_buffer_duration() {
        let samples = vec![0.0; 48000]; // 1 second at 48kHz
        let buffer = AudioBuffer::new(samples, 48000);

        assert!((buffer.duration_sec - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_config_validation_valid() {
        let config = InputHandlerConfig::new(48000);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation_zero_rate() {
        let mut config = InputHandlerConfig::new(48000);
        config.target_sample_rate = 0;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_too_low() {
        let mut config = InputHandlerConfig::new(48000);
        config.target_sample_rate = 4000;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_too_high() {
        let mut config = InputHandlerConfig::new(48000);
        config.target_sample_rate = 200000;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_input_handler_creation() {
        let config = InputHandlerConfig::new(48000);
        let handler = InputHandler::new(config);
        assert!(handler.is_ok());
    }

    #[test]
    fn test_input_handler_creation_invalid_config() {
        let mut config = InputHandlerConfig::new(48000);
        config.target_sample_rate = 0;
        let handler = InputHandler::new(config);
        assert!(handler.is_err());
    }

    #[test]
    fn test_convert_to_mono_stereo() {
        let config = InputHandlerConfig::new(48000);
        let handler = InputHandler::new(config).unwrap();

        // Stereo: L=1.0, R=-1.0, L=0.5, R=0.5
        let stereo = vec![1.0, -1.0, 0.5, 0.5];
        let mono = handler.convert_to_mono(&stereo, 2);

        assert_eq!(mono.len(), 2);
        assert!((mono[0] - 0.0).abs() < 0.001); // (1.0 + -1.0) / 2
        assert!((mono[1] - 0.5).abs() < 0.001); // (0.5 + 0.5) / 2
    }

    #[test]
    fn test_convert_to_mono_5_1_surround() {
        let config = InputHandlerConfig::new(48000);
        let handler = InputHandler::new(config).unwrap();

        // 6 channels, 2 frames: all channels = 0.6
        let multi = vec![0.6; 12];
        let mono = handler.convert_to_mono(&multi, 6);

        assert_eq!(mono.len(), 2);
        assert!((mono[0] - 0.6).abs() < 0.001);
        assert!((mono[1] - 0.6).abs() < 0.001);
    }

    #[test]
    fn test_resample_upsample_48k_to_96k() {
        let config = InputHandlerConfig::new(96000);
        let handler = InputHandler::new(config).unwrap();

        // Create 48kHz sine wave (1 second)
        let input: Vec<f32> = (0..48000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin())
            .collect();

        let resampled = handler.resample(&input, 48000, 96000);
        assert!(resampled.is_ok());

        let output = resampled.unwrap();
        assert!(output.len() > input.len()); // Upsampled
        assert!((output.len() as f32 / input.len() as f32 - 2.0).abs() < 0.1); // ~2x length
    }

    #[test]
    fn test_resample_downsample_96k_to_48k() {
        let config = InputHandlerConfig::new(48000);
        let handler = InputHandler::new(config).unwrap();

        // Create 96kHz signal
        let input: Vec<f32> = (0..96000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 96000.0).sin())
            .collect();

        let resampled = handler.resample(&input, 96000, 48000);
        assert!(resampled.is_ok());

        let output = resampled.unwrap();
        assert!(output.len() < input.len()); // Downsampled
        assert!((output.len() as f32 / input.len() as f32 - 0.5).abs() < 0.1); // ~0.5x length
    }
}

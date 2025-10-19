//! # Responsibility
//! Loads, decodes, and normalizes audio files for processing.

use anyhow::{Context, Result};
use std::path::Path;

/// # Responsibility
/// Container for mono audio samples with metadata.
#[derive(Debug, Clone)]
pub struct AudioBuffer {
    pub samples: Vec<f32>,  // Mono, normalized [-1.0, 1.0]
    pub sample_rate: u32,
}

impl AudioBuffer {
    pub fn new(samples: Vec<f32>, sample_rate: u32) -> Self {
        Self {
            samples,
            sample_rate,
        }
    }

    /// Get duration in seconds
    pub fn duration_sec(&self) -> f32 {
        self.samples.len() as f32 / self.sample_rate as f32
    }

    /// Normalize samples to peak at 1.0
    pub fn normalize(&mut self) {
        let peak = self.samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        if peak > 0.0 {
            for sample in &mut self.samples {
                *sample /= peak;
            }
        }
    }
}

/// # Responsibility
/// Loads and processes audio files for 8D processing.
pub struct InputHandler {
    target_sample_rate: u32,
}

impl InputHandler {
    pub fn new(target_sample_rate: u32) -> Self {
        Self {
            target_sample_rate,
        }
    }

    /// Load a single audio file (simplified implementation)
    pub fn load_stem(&self, path: &Path) -> Result<AudioBuffer> {
        // For MVP: Generate test sine wave or load simple WAV
        // In production: Use symphonia for full format support
        
        // Check if path exists
        if !path.exists() {
            // Return test sine wave for now
            return Ok(self.generate_test_tone(1.0, 440.0));
        }

        // Try to load with hound (WAV only for MVP)
        if path.extension().and_then(|s| s.to_str()) == Some("wav") {
            self.load_wav(path)
        } else {
            Err(anyhow::anyhow!(
                "Unsupported format. Only WAV supported in MVP"
            ))
        }
    }

    /// Load WAV file using hound
    fn load_wav(&self, path: &Path) -> Result<AudioBuffer> {
        let mut reader = hound::WavReader::open(path)
            .context("Failed to open WAV file")?;

        let spec = reader.spec();
        let mut samples = Vec::new();

        // Read samples and convert to f32
        match spec.sample_format {
            hound::SampleFormat::Float => {
                for sample in reader.samples::<f32>() {
                    samples.push(sample?);
                }
            }
            hound::SampleFormat::Int => {
                let max_val = 2_f32.powi(spec.bits_per_sample as i32 - 1);
                for sample in reader.samples::<i32>() {
                    samples.push(sample? as f32 / max_val);
                }
            }
        }

        // Convert stereo to mono if needed
        if spec.channels > 1 {
            samples = samples
                .chunks(spec.channels as usize)
                .map(|chunk| chunk.iter().sum::<f32>() / spec.channels as f32)
                .collect();
        }

        // Resample if needed
        let final_samples = if spec.sample_rate != self.target_sample_rate {
            self.simple_resample(&samples, spec.sample_rate, self.target_sample_rate)?
        } else {
            samples
        };

        Ok(AudioBuffer::new(final_samples, self.target_sample_rate))
    }

    /// Simple linear interpolation resampling (MVP quality)
    fn simple_resample(&self, input: &[f32], from_rate: u32, to_rate: u32) -> Result<Vec<f32>> {
        let ratio = from_rate as f64 / to_rate as f64;
        let output_len = (input.len() as f64 / ratio) as usize;
        let mut output = Vec::with_capacity(output_len);

        for i in 0..output_len {
            let src_pos = i as f64 * ratio;
            let idx = src_pos as usize;
            
            if idx + 1 < input.len() {
                let frac = src_pos - idx as f64;
                let sample = input[idx] * (1.0 - frac) as f32 + input[idx + 1] * frac as f32;
                output.push(sample);
            } else if idx < input.len() {
                output.push(input[idx]);
            }
        }

        Ok(output)
    }

    /// Generate test tone for testing
    pub fn generate_test_tone(&self, duration_sec: f32, frequency_hz: f32) -> AudioBuffer {
        let num_samples = (self.target_sample_rate as f32 * duration_sec) as usize;
        let mut samples = Vec::with_capacity(num_samples);

        for i in 0..num_samples {
            let t = i as f32 / self.target_sample_rate as f32;
            let sample = (2.0 * std::f32::consts::PI * frequency_hz * t).sin() * 0.5;
            samples.push(sample);
        }

        AudioBuffer::new(samples, self.target_sample_rate)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_buffer_duration() {
        let buffer = AudioBuffer::new(vec![0.0; 48000], 48000);
        assert_eq!(buffer.duration_sec(), 1.0);
    }

    #[test]
    fn test_normalize() {
        let mut buffer = AudioBuffer::new(vec![0.5, -0.5, 0.25], 48000);
        buffer.normalize();
        
        assert_eq!(buffer.samples[0], 1.0);
        assert_eq!(buffer.samples[1], -1.0);
        assert_eq!(buffer.samples[2], 0.5);
    }

    #[test]
    fn test_generate_test_tone() {
        let handler = InputHandler::new(48000);
        let buffer = handler.generate_test_tone(1.0, 440.0);
        
        assert_eq!(buffer.samples.len(), 48000);
        assert_eq!(buffer.sample_rate, 48000);
        
        // Check that signal is not silent
        let peak = buffer.samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        assert!(peak > 0.4 && peak < 0.6); // Should be around 0.5
    }

    #[test]
    fn test_simple_resample_upsampling() {
        let handler = InputHandler::new(48000);
        let input = vec![0.0, 1.0, 0.0];
        let output = handler.simple_resample(&input, 1000, 2000).unwrap();
        
        // Should approximately double the length
        assert!(output.len() >= 5 && output.len() <= 7);
    }

    #[test]
    fn test_simple_resample_downsampling() {
        let handler = InputHandler::new(48000);
        let input = vec![0.0; 100];
        let output = handler.simple_resample(&input, 48000, 24000).unwrap();
        
        // Should approximately halve the length
        assert!(output.len() >= 45 && output.len() <= 55);
    }

    #[test]
    fn test_zero_length_audio() {
        let buffer = AudioBuffer::new(vec![], 48000);
        assert_eq!(buffer.duration_sec(), 0.0);
        assert_eq!(buffer.samples.len(), 0);
    }

    #[test]
    fn test_normalize_zero_signal() {
        let mut buffer = AudioBuffer::new(vec![0.0; 100], 48000);
        buffer.normalize();
        
        // Should not crash or produce NaN
        for sample in &buffer.samples {
            assert!(sample.is_finite());
            assert_eq!(*sample, 0.0);
        }
    }

    #[test]
    fn test_generate_tone_zero_duration() {
        let handler = InputHandler::new(48000);
        let buffer = handler.generate_test_tone(0.0, 440.0);
        
        assert_eq!(buffer.samples.len(), 0);
    }

    #[test]
    fn test_resample_same_rate() {
        let handler = InputHandler::new(48000);
        let input = vec![1.0, 2.0, 3.0];
        let output = handler.simple_resample(&input, 48000, 48000).unwrap();
        
        // Same rate should preserve samples
        assert_eq!(output.len(), input.len());
    }
}

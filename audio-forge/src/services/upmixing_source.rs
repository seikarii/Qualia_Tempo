//! # Responsibility
//! Source wrapper that upmixes stereo audio to 8.1 surround in real-time.

use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use rodio::Source;
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, warn};

/// # Responsibility
/// Decorator that wraps a stereo Source and upmixes to 8.1 surround channels.
///
/// ---
///
/// This follows the same architectural pattern as AnalyzingSource and EffectsSource:
/// - Implements `Iterator` and `Source` traits
/// - Forwards metadata with channel count override (2 → 8)
/// - Intercepts sample iteration to apply upmixing
/// - Batch processing for efficiency
///
/// **Pipeline position:** Decoder → AnalyzingSource → EffectsSource → UpmixingSource → Sink
pub struct UpmixingSource<S: Source<Item = f32>> {
    source: S,
    multi_channel: Arc<dyn IMultiChannelOutput>,
    
    // Batch processing buffer
    stereo_buffer: Vec<f32>,
    output_buffer: Vec<f32>,
    output_index: usize,
    batch_size: usize, // Number of STEREO frames to batch
    
    // Metadata override
    output_channels: u16, // Always 8 for 8.1
}

impl<S: Source<Item = f32>> UpmixingSource<S> {
    /// # Responsibility
    /// Create new upmixing processor wrapping a stereo source.
    ///
    /// ---
    ///
    /// ## Parameters
    /// - `source`: Inner audio source (must be stereo: 2 channels)
    /// - `multi_channel`: Service providing upmixing algorithm
    /// - `batch_size`: Number of STEREO frames to batch (default: 256)
    ///
    /// ## Performance Notes
    /// Batch size of 256 stereo frames = 512 input samples → 2048 output samples
    /// This reduces overhead of upmixing calculations.
    ///
    /// ## Returns
    /// Returns Result with error if source is not stereo (proper Rust error handling)
    pub fn try_new(
        source: S,
        multi_channel: Arc<dyn IMultiChannelOutput>,
        batch_size: usize,
    ) -> Result<Self, String> {
        let channels = source.channels();
        
        if channels != 2 {
            return Err(format!(
                "UpmixingSource requires stereo input (2 channels), got {} channels",
                channels
            ));
        }
        
        Ok(Self {
            source,
            multi_channel,
            stereo_buffer: Vec::with_capacity(batch_size * 2),
            output_buffer: Vec::with_capacity(batch_size * 8),
            output_index: 0,
            batch_size,
            output_channels: 8, // 8.1 system (8 channels, LFE is one of them)
        })
    }
    
    /// # Responsibility
    /// Legacy constructor for backward compatibility (panics on error).
    ///
    /// ---
    ///
    /// DEPRECATED: Use `try_new()` instead for proper error handling.
    #[deprecated(since = "0.1.0", note = "Use try_new() for proper error handling")]
    pub fn new(
        source: S,
        multi_channel: Arc<dyn IMultiChannelOutput>,
        batch_size: usize,
    ) -> Self {
        Self::try_new(source, multi_channel, batch_size)
            .expect("UpmixingSource::new failed - use try_new() instead")
    }
    
    /// # Responsibility
    /// Process accumulated stereo samples through upmixing algorithm.
    ///
    /// ---
    ///
    /// Converts stereo buffer to 8.1 surround:
    /// - FL, FR: Front Left/Right (direct copy)
    /// - FC: Front Center (mono sum)
    /// - LFE: Low Frequency Effects (filtered mono)
    /// - BL, BR: Back Left/Right (delayed + attenuated)
    /// - SL, SR: Side Left/Right (mid-delay + attenuated)
    fn upmix_buffer(&mut self) {
        if self.stereo_buffer.is_empty() {
            return;
        }
        
        match self.multi_channel.upmix_stereo_to_8_1(&self.stereo_buffer) {
            Ok(upmixed) => {
                self.output_buffer = upmixed;
            }
            Err(e) => {
                error!("Upmixing failed: {} - outputting silence", e);
                // Fallback: output silence with correct channel count
                let frame_count = self.stereo_buffer.len() / 2;
                self.output_buffer = vec![0.0; frame_count * 8];
            }
        }
        
        self.stereo_buffer.clear();
    }
}

impl<S: Source<Item = f32>> Iterator for UpmixingSource<S> {
    type Item = f32;
    
    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        // If output buffer has samples, return next one
        if self.output_index < self.output_buffer.len() {
            let sample = self.output_buffer[self.output_index];
            self.output_index += 1;
            return Some(sample);
        }
        
        // Output buffer exhausted: collect new stereo batch
        self.stereo_buffer.clear();
        self.output_index = 0;
        
        // Collect batch_size stereo FRAMES (batch_size * 2 samples)
        let target_samples = self.batch_size * 2;
        for _ in 0..target_samples {
            if let Some(sample) = self.source.next() {
                self.stereo_buffer.push(sample);
            } else {
                break; // End of stream
            }
        }
        
        if self.stereo_buffer.is_empty() {
            return None; // Stream finished
        }
        
        // Upmix stereo batch to 8.1
        self.upmix_buffer();
        
        // Return first output sample
        if self.output_buffer.is_empty() {
            warn!("Upmixing produced empty output - stream may be corrupted");
            return None;
        }
        
        self.output_index = 1;
        Some(self.output_buffer[0])
    }
}

impl<S: Source<Item = f32>> Source for UpmixingSource<S> {
    fn current_span_len(&self) -> Option<usize> {
        // Upmixing changes sample count: 2ch → 8ch (4x multiplier)
        self.source.current_span_len().map(|len| len * 4)
    }
    
    fn channels(&self) -> u16 {
        self.output_channels // Always 8 for 8.1 surround
    }
    
    fn sample_rate(&self) -> u32 {
        self.source.sample_rate() // Sample rate unchanged
    }
    
    fn total_duration(&self) -> Option<Duration> {
        self.source.total_duration() // Duration unchanged
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::multi_channel_output::MultiChannelOutputService;
    use rodio::source::SineWave;
    
    /// # Responsibility
    /// Minimal stereo test source wrapping SineWave for tests.
    /// Duplicates each mono sample to [L, R, L, R, ...] pattern.
    struct StereoTestSource<S: Source<Item = f32>> {
        inner: S,
        pending_sample: Option<f32>,
    }
    
    impl<S: Source<Item = f32>> StereoTestSource<S> {
        fn new(inner: S) -> Self {
            Self {
                inner,
                pending_sample: None,
            }
        }
    }
    
    impl<S: Source<Item = f32>> Iterator for StereoTestSource<S> {
        type Item = f32;
        
        fn next(&mut self) -> Option<Self::Item> {
            // If we have a pending duplicate, return it
            if let Some(sample) = self.pending_sample.take() {
                return Some(sample);
            }
            
            // Otherwise get next from source and duplicate
            if let Some(sample) = self.inner.next() {
                self.pending_sample = Some(sample); // Save for next call
                Some(sample)
            } else {
                None
            }
        }
    }
    
    impl<S: Source<Item = f32>> Source for StereoTestSource<S> {
        fn current_span_len(&self) -> Option<usize> {
            self.inner.current_span_len().map(|len| len * 2)
        }
        
        fn channels(&self) -> u16 {
            2 // Force stereo
        }
        
        fn sample_rate(&self) -> u32 {
            self.inner.sample_rate()
        }
        
        fn total_duration(&self) -> Option<Duration> {
            self.inner.total_duration()
        }
    }
    
    #[test]
    fn test_upmixing_source_metadata() {
        // Create stereo source
        let mono_sine = SineWave::new(440.0).take_duration(Duration::from_millis(100));
        let stereo_sine = StereoTestSource::new(mono_sine);
        
        let sample_rate = stereo_sine.sample_rate();
        
        let multi_channel = Arc::new(MultiChannelOutputService::default());
        let upmixing_source = UpmixingSource::try_new(stereo_sine, multi_channel, 256).unwrap();
        
        // Metadata checks
        assert_eq!(upmixing_source.sample_rate(), sample_rate);
        assert_eq!(upmixing_source.channels(), 8); // Upmixed to 8.1
    }
    
    #[test]
    fn test_upmixing_source_sample_count() {
        // Create stereo source
        let mono_sine = SineWave::new(440.0).take_duration(Duration::from_millis(10));
        let mono_samples: Vec<f32> = mono_sine.clone().collect();
        let expected_stereo_samples = mono_samples.len() * 2; // Duplicated
        let expected_frames = mono_samples.len(); // Frame count preserved
        
        let stereo_sine = StereoTestSource::new(mono_sine);
        
        let multi_channel = Arc::new(MultiChannelOutputService::default());
        let mut upmixing_source = UpmixingSource::try_new(stereo_sine, multi_channel, 256).unwrap();
        
        // Collect output samples (limited to expected stereo count * 4)
        let output_samples: Vec<f32> = upmixing_source.by_ref().take(expected_stereo_samples * 4).collect();
        let output_frames = output_samples.len() / 8; // 8.1 frames
        
        // Frame count should be preserved (only channels multiplied)
        assert_eq!(expected_frames, output_frames);
        
        // Total sample count should be 4x stereo (2ch → 8ch)
        assert_eq!(output_samples.len(), expected_stereo_samples * 4);
    }
    
    #[test]
    #[should_panic(expected = "UpmixingSource requires stereo input")]
    fn test_upmixing_source_rejects_non_stereo() {
        // Create mono source (1 channel) - don't convert to stereo
        let sine = SineWave::new(440.0)
            .take_duration(Duration::from_millis(10));
        
        let multi_channel = Arc::new(MultiChannelOutputService::default());
        
        // This should panic because SineWave is mono - try_new returns Err, unwrap panics
        let _ = UpmixingSource::try_new(sine, multi_channel, 256).unwrap();
    }
    
    #[test]
    fn test_upmixing_source_batch_processing() {
        let mono_sine = SineWave::new(440.0).take_duration(Duration::from_millis(50));
        let stereo_sine = StereoTestSource::new(mono_sine);
        
        let multi_channel = Arc::new(MultiChannelOutputService::default());
        let mut upmixing_source = UpmixingSource::try_new(stereo_sine, multi_channel, 128).unwrap();
        
        // Pull samples - should batch process internally
        let count = upmixing_source.by_ref().take(2000).count();
        
        assert_eq!(count, 2000, "Should produce 2000 samples");
    }
}

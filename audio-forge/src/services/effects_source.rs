//! # Responsibility
//! Source wrapper that applies real-time audio effects during playback.

use crate::services::interfaces::i_audio_effects::IAudioEffects;
use rodio::Source;
use std::sync::Arc;
use std::time::Duration;

/// # Responsibility
/// Decorator that wraps a Source and applies audio effects in real-time.
///
/// ---
///
/// This follows the same architectural pattern as AnalyzingSource:
/// - Implements `Iterator` and `Source` traits
/// - Forwards all metadata calls to inner source
/// - Intercepts sample iteration to apply effects
/// - Non-blocking: effects processing happens inline during playback
///
/// **Pipeline position:** Decoder → AnalyzingSource → EffectsSource → Sink
pub struct EffectsSource<S: Source<Item = f32>> {
    source: S,
    audio_effects: Arc<dyn IAudioEffects>,
    
    // State tracking for time-based effects (8D audio)
    elapsed_samples: u64,
    sample_rate: u32,
    
    // Buffer for batch processing (reduces per-sample overhead)
    buffer: Vec<f32>,
    buffer_index: usize,
    chunk_size: usize,
}

impl<S: Source<Item = f32>> EffectsSource<S> {
    /// # Responsibility
    /// Create new effects processor wrapping an existing source.
    ///
    /// ---
    ///
    /// ## Parameters
    /// - `source`: Inner audio source (typically AnalyzingSource<Decoder>)
    /// - `audio_effects`: Service providing DSP algorithms
    /// - `chunk_size`: Samples to batch before applying effects (default: 512)
    ///
    /// ## Performance Notes
    /// Batch processing (chunk_size=512) reduces overhead:
    /// - Single RwLock read per chunk (not per sample)
    /// - Better CPU cache utilization
    /// - Amortized effect calculations
    pub fn new(
        source: S,
        audio_effects: Arc<dyn IAudioEffects>,
        chunk_size: usize,
    ) -> Self {
        let sample_rate = source.sample_rate();
        
        Self {
            source,
            audio_effects,
            elapsed_samples: 0,
            sample_rate,
            buffer: Vec::with_capacity(chunk_size),
            buffer_index: 0,
            chunk_size,
        }
    }
    
    /// # Responsibility
    /// Process accumulated samples through effects pipeline.
    ///
    /// ---
    ///
    /// Applies effects in order:
    /// 1. 8D Audio (panning, needs elapsed time)
    /// 2. Drop Effect (volume reduction)
    /// 3. Bass Boost (low-frequency gain)
    /// 4. Treble Boost (high-frequency gain)
    ///
    /// Errors are logged with tracing::warn but don't break playback.
    fn apply_effects_to_buffer(&mut self) {
        use tracing::warn;
        
        if self.buffer.is_empty() {
            return;
        }
        
        // Calculate elapsed time for time-based effects
        let elapsed_time = self.elapsed_samples as f32 / self.sample_rate as f32;
        
        // Apply effects in sequence (order matters for quality)
        if let Err(e) = self.audio_effects.apply_8d_effect(
            &mut self.buffer,
            self.sample_rate,
            elapsed_time,
        ) {
            warn!("8D effect failed: {}", e);
        }
        
        if let Err(e) = self.audio_effects.apply_drop_effect(&mut self.buffer) {
            warn!("Drop effect failed: {}", e);
        }
        
        // DIRECTIVE 11: Propagate sample_rate from source to filter calculations
        if let Err(e) = self.audio_effects.apply_bass_boost(&mut self.buffer, self.sample_rate) {
            warn!("Bass boost failed: {}", e);
        }
        
        if let Err(e) = self.audio_effects.apply_treble_boost(&mut self.buffer, self.sample_rate) {
            warn!("Treble boost failed: {}", e);
        }
        
        // Apply pitch shifting (Hz changer: 440→432/528Hz)
        if let Err(e) = self.audio_effects.apply_pitch_shift(&mut self.buffer, self.sample_rate) {
            warn!("Pitch shift failed: {}", e);
        }
        
        // Track time progression
        self.elapsed_samples += self.buffer.len() as u64;
    }
}

impl<S: Source<Item = f32>> Iterator for EffectsSource<S> {
    type Item = f32;
    
    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        // If buffer has processed samples, return next one
        if self.buffer_index < self.buffer.len() {
            let sample = self.buffer[self.buffer_index];
            self.buffer_index += 1;
            return Some(sample);
        }
        
        // Buffer exhausted: fill with new samples from inner source
        self.buffer.clear();
        self.buffer_index = 0;
        
        // Collect chunk_size samples
        for _ in 0..self.chunk_size {
            if let Some(sample) = self.source.next() {
                self.buffer.push(sample);
            } else {
                break; // End of stream
            }
        }
        
        if self.buffer.is_empty() {
            return None; // Stream finished
        }
        
        // Apply effects to entire buffer
        self.apply_effects_to_buffer();
        
        // Return first processed sample
        self.buffer_index = 1;
        Some(self.buffer[0])
    }
}

impl<S: Source<Item = f32>> Source for EffectsSource<S> {
    fn current_span_len(&self) -> Option<usize> {
        self.source.current_span_len()
    }
    
    fn channels(&self) -> u16 {
        self.source.channels()
    }
    
    fn sample_rate(&self) -> u32 {
        self.source.sample_rate()
    }
    
    fn total_duration(&self) -> Option<Duration> {
        self.source.total_duration()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::effect_parameters::EffectConfig;
    use crate::services::audio_effects::AudioEffectsService;
    use crate::services::event_bus::EventBusService;
    use rodio::source::SineWave;
    
    fn create_test_effects_service() -> Arc<dyn IAudioEffects> {
        let event_bus = Arc::new(EventBusService::default());
        Arc::new(AudioEffectsService::new(EffectConfig::default(), event_bus))
    }
    
    fn create_test_effects_service_with_config(config: EffectConfig) -> Arc<dyn IAudioEffects> {
        let event_bus = Arc::new(EventBusService::default());
        Arc::new(AudioEffectsService::new(config, event_bus))
    }
    
    #[test]
    fn test_effects_source_forwards_metadata() {
        let sine = SineWave::new(440.0).take_duration(Duration::from_secs(1));
        let sample_rate = sine.sample_rate();
        let channels = sine.channels();
        
        let effects = create_test_effects_service();
        let effects_source = EffectsSource::new(sine, effects, 512);
        
        assert_eq!(effects_source.sample_rate(), sample_rate);
        assert_eq!(effects_source.channels(), channels);
    }
    
    #[test]
    fn test_effects_source_passes_through_when_disabled() {
        // Create sine wave with known amplitude
        let sine = SineWave::new(440.0)
            .take_duration(Duration::from_millis(10))
            .amplify(0.5);
        
        let effects = create_test_effects_service();
        let mut effects_source = EffectsSource::new(sine, effects, 512);
        
        // Collect some samples
        let samples: Vec<f32> = effects_source.by_ref().take(100).collect();
        
        assert_eq!(samples.len(), 100);
        
        // When all effects disabled, samples should be within expected range
        for sample in samples {
            assert!(
                sample.abs() <= 0.6,
                "Sample should be roughly ±0.5 (sine amplitude)"
            );
        }
    }
    
    #[test]
    fn test_effects_source_applies_drop_effect() {
        let sine = SineWave::new(440.0)
            .take_duration(Duration::from_millis(10))
            .amplify(0.5);
        
        let config = EffectConfig {
            drop_effect_enabled: true,
            drop_amount: 1.0, // Complete silence
            ..Default::default()
        };
        
        let effects = create_test_effects_service_with_config(config);
        let mut effects_source = EffectsSource::new(sine, effects, 512);
        
        // Collect samples
        let samples: Vec<f32> = effects_source.by_ref().take(100).collect();
        
        // All samples should be zero (100% drop)
        for sample in samples {
            assert_eq!(sample, 0.0, "Drop effect should silence audio");
        }
    }
    
    #[test]
    fn test_effects_source_buffer_processing() {
        let sine = SineWave::new(440.0).take_duration(Duration::from_secs(1));
        
        let effects = create_test_effects_service();
        let mut effects_source = EffectsSource::new(sine, effects, 256);
        
        // Pull samples - should batch process internally
        let count = effects_source.by_ref().take(1000).count();
        
        assert_eq!(count, 1000, "Should produce 1000 samples");
    }
}

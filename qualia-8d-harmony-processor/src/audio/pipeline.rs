//! # Responsibility
//! Centralized audio processing pipeline (Composition Root pattern).
//!
//! ---
//!
//! Aggregates all audio processors into a single, cohesive pipeline:
//! Input → Intensity Analysis → Frequency Boost → Psychoacoustic Bass → Convolution Reverb → Ensemble Effect
//!
//! Simplifies main.rs by providing single instantiation and processing interface.

use anyhow::{Context, Result};
use crate::analysis::{IntensityAnalyzer, IntensityAnalyzerConfig};
use super::{
    ConvolutionReverb, ConvolutionReverbConfig,
    EnsembleConfig, EnsembleEffect, EnsembleMode,
    FrequencyBooster, FrequencyBoosterConfig,
    HarmonicExciter, HarmonicExciterConfig,
    PsychoacousticBass, PsychoacousticBassConfig,
    StereoWidener, StereoWidenerConfig,
    TransientShaper, TransientShaperConfig,
    VoiceOutput,
};

/// # Responsibility
/// Configuration aggregate for entire audio processing pipeline.
///
/// ---
///
/// Bundles all sub-processor configurations into single struct for
/// simplified instantiation via Composition Root pattern.
#[derive(Debug, Clone)]
pub struct PipelineConfig {
    /// Sample rate in Hz (shared across all processors)
    pub sample_rate: u32,
    
    /// Intensity analyzer configuration
    pub intensity: IntensityAnalyzerConfig,
    
    /// Transient shaper configuration (NEW: percussive clarity)
    pub transient_shaper: TransientShaperConfig,
    
    /// Frequency booster (EQ) configuration
    pub frequency_boost: FrequencyBoosterConfig,
    
    /// Harmonic exciter configuration
    pub harmonic_exciter: HarmonicExciterConfig,
    
    /// Psychoacoustic bass enhancement configuration
    pub psychoacoustic_bass: PsychoacousticBassConfig,
    
    /// Convolution reverb configuration
    pub convolution_reverb: ConvolutionReverbConfig,
    
    /// Stereo widener configuration (NEW: Haas + Mid-Side)
    pub stereo_widener: StereoWidenerConfig,
    
    /// Ensemble effect configuration
    pub ensemble: EnsembleConfig,
}

impl PipelineConfig {
    /// # Responsibility
    /// Create default pipeline configuration for given sample rate.
    ///
    /// Uses sensible defaults for orchestral 8D audio processing:
    /// - Intensity: 250ms windows with 50% overlap
    /// - Transient Shaper: 0 → +12dB attack, 0 → -6dB sustain (NEW)
    /// - Frequency Boost: Default 8D EQ profile
    /// - Psychoacoustic Bass: 20-150Hz fundamental extraction
    /// - Convolution Reverb: Synthetic IR fallback
    /// - Stereo Widener: 5ms → 35ms Haas, 1.0x → 2.0x width (NEW)
    /// - Ensemble: 5-13 voices, humanized mode
    pub fn new(sample_rate: u32) -> Result<Self> {
        Ok(Self {
            sample_rate,
            intensity: IntensityAnalyzerConfig::new(sample_rate),
            transient_shaper: TransientShaperConfig::new(
                (0.0, 12.0),      // Attack: 0dB → +12dB (punch at high intensity)
                (-6.0, 0.0),      // Sustain: -6dB → 0dB (clarity at low intensity)
                256,              // Envelope window: 5.3ms @ 48kHz (fast transient detection)
                15.0,             // Attack threshold: 15 dB/s (HIGH SENSITIVITY - fixes 0.00 transient density)
                2048,             // Release: 42ms @ 48kHz (smooth transitions)
                sample_rate,
            )?,
            frequency_boost: FrequencyBoosterConfig::default_8d(sample_rate),
            harmonic_exciter: HarmonicExciterConfig::new(sample_rate)?,
            psychoacoustic_bass: PsychoacousticBassConfig::new(sample_rate)?,
            convolution_reverb: ConvolutionReverbConfig::new(sample_rate)?,
            stereo_widener: StereoWidenerConfig::new(
                (5.0, 35.0),      // Haas delay: 5ms → 35ms (dramatic at high intensity)
                (1.0, 2.0),       // Width: 100% → 200% (double side content)
                8000.0,           // Low-pass for Haas: 8kHz (prevent harsh artifacts)
                sample_rate,
            )?,
            ensemble: EnsembleConfig::new(
                EnsembleMode::Humanized,
                None,   // No tempo for humanized mode
                (5, 13), // Dynamic voice count range
                15.0,   // Max delay ms
                5.0,    // Max pitch shift cents
                (60.0, 120.0), // Dynamic spatial spread range
                sample_rate,
            )?,
        })
    }
}

/// # Responsibility
/// Centralized audio processing pipeline aggregating all effects.
///
/// ---
///
/// **Composition Root Pattern**: Single instantiation point for entire
/// processor dependency graph, simplifying main.rs and enabling
/// easy testing/mocking of full pipeline.
///
/// **CORRECTED Processing Chain**:
/// 1. Intensity Analysis (dynamic parameter extraction)
/// 2. **Transient Shaper** (percussive clarity: attack boost + sustain reduction) [NEW]
/// 3. Frequency Boost (EQ with intensity modulation)
/// 4. Harmonic Exciter (presence/air enhancement)
/// 5. Psychoacoustic Bass (missing fundamental illusion)
/// 6. Convolution Reverb (acoustic space simulation)
/// 7. **Stereo Widener** (Haas effect + Mid-Side processing) [NEW]
/// 8. Ensemble Effect (voice generation with spatial distribution)
pub struct AudioProcessingPipeline {
    intensity_analyzer: IntensityAnalyzer,
    transient_shaper: TransientShaper,
    frequency_booster: FrequencyBooster,
    harmonic_exciter: HarmonicExciter,
    psychoacoustic_bass: PsychoacousticBass,
    convolution_reverb: ConvolutionReverb,
    stereo_widener: StereoWidener,
    ensemble_effect: EnsembleEffect,
}

impl AudioProcessingPipeline {
    /// # Responsibility
    /// Create new audio processing pipeline from configuration.
    ///
    /// Instantiates all processors and validates configuration compatibility.
    pub fn new(config: PipelineConfig) -> Result<Self> {
        Ok(Self {
            intensity_analyzer: IntensityAnalyzer::new(config.intensity)
                .context("Failed to create IntensityAnalyzer")?,
            transient_shaper: TransientShaper::new(config.transient_shaper),
            frequency_booster: FrequencyBooster::new(config.frequency_boost)
                .context("Failed to create FrequencyBooster")?,
            harmonic_exciter: HarmonicExciter::new(config.harmonic_exciter)
                .context("Failed to create HarmonicExciter")?,
            psychoacoustic_bass: PsychoacousticBass::new(config.psychoacoustic_bass)
                .context("Failed to create PsychoacousticBass")?,
            convolution_reverb: ConvolutionReverb::new(config.convolution_reverb)
                .context("Failed to create ConvolutionReverb")?,
            stereo_widener: StereoWidener::new(config.stereo_widener),
            ensemble_effect: EnsembleEffect::new(config.ensemble),
        })
    }
    
    /// # Responsibility
    /// Generate Hann window for overlap-add processing.
    ///
    /// ---
    ///
    /// Hann window formula: w[n] = 0.5 * (1 - cos(2π * n / (N - 1)))
    /// This provides smooth tapering at window edges to minimize spectral leakage.
    ///
    /// For 50% overlap (hop_size = window_size / 2), Hann window provides
    /// perfect reconstruction with normalization factor of 2/3.
    fn generate_hann_window(size: usize) -> Vec<f32> {
        (0..size)
            .map(|n| {
                0.5 * (1.0 - (2.0 * std::f32::consts::PI * n as f32 / (size - 1) as f32).cos())
            })
            .collect()
    }
    
    /// # Responsibility
    /// Apply Hann window to audio chunk in-place.
    ///
    /// Multiplies each sample by corresponding window coefficient.
    fn apply_hann_window(chunk: &mut [f32], window: &[f32]) {
        for (sample, &window_val) in chunk.iter_mut().zip(window.iter()) {
            *sample *= window_val;
        }
    }
    
    /// # Responsibility
    /// Apply full effects chain to a single audio chunk with given intensity.
    ///
    /// ---
    ///
    /// **CORRECTED Processing Chain**:
    /// 1. Transient Shaper (percussive clarity) [NEW]
    /// 2. Frequency Boost (EQ)
    /// 3. Harmonic Exciter (presence/air)
    /// 4. Psychoacoustic Bass (missing fundamental)
    /// 5. Convolution Reverb (acoustic space)
    /// 6. **HEADROOM NORMALIZATION** [DIRECTIVE 1: Gain staging guardian]
    ///
    /// Note: Stereo Widener + Ensemble applied AFTER overlap-add reconstruction.
    fn apply_effects_chain(&mut self, chunk: &[f32], intensity: f32) -> Result<Vec<f32>> {
        let shaped = self.transient_shaper.process(chunk, intensity)
            .context("Transient shaper failed")?;
        let boosted = self.frequency_booster.process(&shaped, intensity)
            .context("Frequency boost failed")?;
        let excited = self.harmonic_exciter.process(&boosted, intensity)
            .context("Harmonic exciter failed")?;
        let bass = self.psychoacoustic_bass.process(&excited, intensity)
            .context("Psychoacoustic bass failed")?;
        let reverb = self.convolution_reverb.process(&bass, intensity)
            .context("Convolution reverb failed")?;
        
        // === DIRECTIVA 1: GLOBAL HEADROOM NORMALIZATION ===
        // Calculates peak and reduces gain if exceeding -6dBFS (0.5) headroom target.
        // CRITICAL: Stricter than initial -3dBFS to account for downstream HRTF
        // convolution + spatial mixing which introduce ~+3-6dB peaks.
        // This GUARANTEES safe signal level for downstream ensemble/mixer, preventing
        // limiter overload regardless of upstream effect chain aggressiveness.
        const TARGET_HEADROOM: f32 = 0.5; // -6dBFS safety margin (accounting for spatial processing gain)
        
        let peak_level = reverb.iter()
            .map(|&x| x.abs())
            .fold(0.0f32, f32::max);
        
        if peak_level > TARGET_HEADROOM {
            let reduction_gain = TARGET_HEADROOM / peak_level;
            tracing::debug!(
                peak_level = peak_level,
                reduction_db = 20.0 * reduction_gain.log10(),
                "Headroom guardian: Reducing gain to prevent saturation"
            );
            Ok(reverb.iter().map(|&x| x * reduction_gain).collect())
        } else {
            Ok(reverb)
        }
    }
    
    /// # Responsibility
    /// Process audio through entire pipeline with GLOBAL intensity (legacy method).
    ///
    /// ---
    ///
    /// **DEPRECATED**: Use `process_time_varying()` for dynamic temporal modulation.
    /// This method uses a single intensity value for the entire audio, which loses
    /// temporal dynamics. Kept for backward compatibility.
    ///
    /// **Arguments**:
    /// - `audio`: Mono input samples
    /// - `intensity`: Global intensity [0.0, 1.0] for dynamic parameter scaling
    ///
    /// **Returns**:
    /// - Vector of independent voice outputs ready for spatial mixing
    pub fn process(&mut self, audio: &[f32], intensity: f32) -> Result<Vec<VoiceOutput>> {
        // Stage 1: Transient shaper (percussive clarity) [NEW]
        let shaped_audio = self.transient_shaper.process(audio, intensity)
            .context("Transient shaper failed")?;
        
        // Stage 2: Frequency boost with intensity modulation
        let boosted_audio = self.frequency_booster.process(&shaped_audio, intensity)
            .context("Frequency boost failed")?;
        
        // Stage 3: Harmonic exciter (presence & air)
        let excited_audio = self.harmonic_exciter.process(&boosted_audio, intensity)
            .context("Harmonic exciter failed")?;
        
        // Stage 4: Psychoacoustic bass enhancement
        let bass_enhanced = self.psychoacoustic_bass.process(&excited_audio, intensity)
            .context("Psychoacoustic bass failed")?;
        
        // Stage 5: Convolution reverb (acoustic space simulation)
        let reverb_audio = self.convolution_reverb.process(&bass_enhanced, intensity)
            .context("Convolution reverb failed")?;
        
        // Stage 6: Stereo widener (Haas + Mid-Side) [NEW]
        // Split mono to pseudo-stereo for widener input
        let (widened_left, widened_right) = self.stereo_widener.process(
            &reverb_audio, 
            &reverb_audio, // Duplicate mono as L/R for widening
            intensity
        ).context("Stereo widener failed")?;
        
        // Merge back to mono for ensemble (average L+R)
        let widened_mono: Vec<f32> = widened_left.iter()
            .zip(&widened_right)
            .map(|(l, r)| (l + r) * 0.5)
            .collect();
        
        // Stage 7: Ensemble effect (generate independent voices with spatial distribution)
        let voices = self.ensemble_effect.process_dynamic(&widened_mono, intensity)
            .context("Ensemble effect failed")?;
        
        Ok(voices)
    }
    
    /// # Responsibility
    /// Process audio with TIME-VARYING intensity modulation using PER-VOICE OVERLAP-ADD.
    ///
    /// ---
    ///
    /// **CORRECTED ARCHITECTURE (DIRECTIVA 1.1 COMPLIANCE)**:
    /// Single-pass pipeline with per-window dynamic ensemble processing.
    /// Each window generates independent voice outputs that are accumulated
    /// into per-voice buffers using overlap-add.
    ///
    /// **Arguments**:
    /// - `audio`: Mono input samples
    /// - `intensity_curve`: Per-frame intensity values [0.0, 1.0] from analyze_intensity()
    ///
    /// **Returns**:
    /// - Vector of independent voice outputs with time-varying processing
    ///
    /// **Processing Strategy**:
    /// 1. For EACH window in intensity_curve:
    ///    a. Window audio with Hann function
    ///    b. Apply effects chain with window-specific intensity
    ///    c. Apply stereo widener (Haas + Mid-Side) [NEW]
    ///    d. Merge widened stereo back to mono
    ///    e. Generate Vec<VoiceOutput> via ensemble.process_dynamic() with that intensity
    ///    f. Accumulate each voice into its own buffer via overlap-add
    /// 2. Voice buffer count grows dynamically (high intensity → more voices)
    /// 3. Normalize by overlap factor (2/3 for 50% overlap)
    /// 4. Return final voice outputs with accumulated samples
    ///
    /// **CRITICAL**: NO intermediate processed_audio buffer. NO avg_intensity.
    /// Ensemble effect "breathes" with the music via per-window intensity.
    pub fn process_time_varying(
        &mut self, 
        audio: &[f32], 
        intensity_curve: &[f32]
    ) -> Result<Vec<VoiceOutput>> {
        if audio.is_empty() || intensity_curve.is_empty() {
            return Ok(Vec::new());
        }
        
        let hop_size = self.intensity_analyzer.config().hop_samples();
        let window_size = self.intensity_analyzer.config().window_samples();
        
        // Generate Hann window ONCE (reuse for all chunks)
        let hann_window = Self::generate_hann_window(window_size);
        
        // Per-voice accumulation buffers (grows dynamically)
        // Structure: voice_buffers[voice_idx][sample_idx]
        let mut voice_buffers: Vec<Vec<f32>> = Vec::new();
        
        // Track spatial metadata for each voice (for final VoiceOutput construction)
        let mut voice_metadata: Vec<(f32, f32)> = Vec::new(); // (spatial_offset_deg, gain)
        
        // === MAIN PROCESSING LOOP: Per-window dynamic ensemble processing ===
        for (window_idx, &intensity) in intensity_curve.iter().enumerate() {
            let start = window_idx * hop_size;
            if start >= audio.len() {
                break;
            }
            
            let end = (start + window_size).min(audio.len());
            let chunk_len = end - start;
            
            // Extract chunk with zero-padding if at end
            let mut chunk = vec![0.0; window_size];
            chunk[..chunk_len].copy_from_slice(&audio[start..end]);
            
            // 1. Apply Hann window
            Self::apply_hann_window(&mut chunk, &hann_window);
            
            // 2. Apply effects chain with THIS window's intensity
            let processed_chunk = self.apply_effects_chain(&chunk, intensity)?;
            
            // 3. Apply stereo widener (Haas + Mid-Side) [NEW]
            let (widened_left, widened_right) = self.stereo_widener.process(
                &processed_chunk,
                &processed_chunk, // Duplicate mono as L/R
                intensity
            ).context(format!("Stereo widener failed at window {}", window_idx))?;
            
            // 4. Merge widened stereo back to mono (average L+R)
            let widened_mono: Vec<f32> = widened_left.iter()
                .zip(&widened_right)
                .map(|(l, r)| (l + r) * 0.5)
                .collect();
            
            // 5. Generate voice outputs for THIS window with THIS intensity
            let window_voices = self.ensemble_effect.process_dynamic(&widened_mono, intensity)
                .context(format!("Ensemble effect failed at window {}", window_idx))?;
            
            // 6. Accumulate into per-voice buffers via OVERLAP-ADD
            for (voice_idx, voice_output) in window_voices.iter().enumerate() {
                // Grow voice buffer array if this is a new voice (high intensity moments)
                if voice_idx >= voice_buffers.len() {
                    voice_buffers.push(vec![0.0; audio.len() + window_size]);
                    voice_metadata.push((
                        voice_output.spatial_offset_deg,
                        voice_output.gain,
                    ));
                }
                
                // OVERLAP-ADD: Accumulate this voice's samples into its buffer
                let voice_buffer = &mut voice_buffers[voice_idx];
                for (i, &sample) in voice_output.samples.iter().enumerate() {
                    voice_buffer[start + i] += sample;
                }
            }
        }
        
        // 7. Normalize by overlap factor (Hann @ 50% overlap = 2/3)
        let norm_factor = 2.0 / 3.0;
        for voice_buffer in voice_buffers.iter_mut() {
            for sample in voice_buffer.iter_mut() {
                *sample *= norm_factor;
            }
        }
        
        // 8. Trim to original length and construct final VoiceOutput vector
        let final_voices: Vec<VoiceOutput> = voice_buffers
            .into_iter()
            .zip(voice_metadata.iter())
            .map(|(mut buffer, &(spatial_offset_deg, gain))| {
                buffer.truncate(audio.len());
                VoiceOutput {
                    samples: buffer,
                    spatial_offset_deg,
                    gain,
                }
            })
            .collect();
        
        Ok(final_voices)
    }
    
    /// # Responsibility
    /// Analyze intensity curve from audio for dynamic parameter scaling.
    ///
    /// This is a convenience method that wraps the intensity analyzer.
    pub fn analyze_intensity(&mut self, audio: &[f32]) -> Result<Vec<f32>> {
        self.intensity_analyzer.analyze(audio)
            .context("Intensity analysis failed")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipeline_config_creation() {
        let config = PipelineConfig::new(48000).unwrap();
        assert_eq!(config.sample_rate, 48000);
        assert_eq!(config.intensity.sample_rate, 48000);
        assert_eq!(config.frequency_boost.sample_rate, 48000);
        assert_eq!(config.psychoacoustic_bass.sample_rate, 48000);
        assert_eq!(config.convolution_reverb.sample_rate, 48000);
        assert_eq!(config.ensemble.sample_rate, 48000);
    }
    
    #[test]
    fn test_pipeline_creation() {
        let config = PipelineConfig::new(48000).unwrap();
        let pipeline = AudioProcessingPipeline::new(config);
        assert!(pipeline.is_ok(), "Pipeline creation should succeed");
    }
    
    #[test]
    fn test_pipeline_process_low_intensity() {
        let config = PipelineConfig::new(48000).unwrap();
        let mut pipeline = AudioProcessingPipeline::new(config).unwrap();
        
        // Generate 440Hz sine wave
        let input: Vec<f32> = (0..4800)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        // Process with low intensity (0.2)
        let voices = pipeline.process(&input, 0.2).unwrap();
        
        // Low intensity (0.2) should generate ~7 voices: 5 + 0.2 * (13 - 5) = 5 + 1.6 = 6.6 → 7
        assert!(voices.len() >= 6 && voices.len() <= 7, 
            "Low intensity should use ~6-7 voices, got {}", voices.len());
        
        // Verify voice outputs have signal energy
        for voice in &voices {
            let rms: f32 = voice.samples.iter().map(|&x| x * x).sum::<f32>() 
                / voice.samples.len() as f32;
            assert!(rms > 0.001, "Voice should have signal energy");
        }
    }
    
    #[test]
    fn test_pipeline_process_high_intensity() {
        let config = PipelineConfig::new(48000).unwrap();
        let mut pipeline = AudioProcessingPipeline::new(config).unwrap();
        
        // Generate 440Hz sine wave
        let input: Vec<f32> = (0..4800)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        // Process with high intensity (0.9)
        let voices = pipeline.process(&input, 0.9).unwrap();
        
        // High intensity (0.9) should generate ~12 voices: 5 + 0.9 * (13 - 5) = 5 + 7.2 = 12.2 → 12
        assert!(voices.len() >= 12 && voices.len() <= 13, 
            "High intensity should use ~12-13 voices, got {}", voices.len());
        
        // Verify spatial distribution is wider at high intensity
        let min_offset = voices.iter().map(|v| v.spatial_offset_deg).fold(f32::INFINITY, f32::min);
        let max_offset = voices.iter().map(|v| v.spatial_offset_deg).fold(f32::NEG_INFINITY, f32::max);
        let spread = max_offset - min_offset;
        
        // High intensity (0.9) should give ~114° spread (60° + 0.9 * (120° - 60°))
        assert!(spread > 100.0, "High intensity should produce wide spatial spread: {} degrees", spread);
    }
    
    #[test]
    fn test_pipeline_analyze_intensity() {
        let config = PipelineConfig::new(48000).unwrap();
        let mut pipeline = AudioProcessingPipeline::new(config).unwrap();
        
        // Generate longer audio with varying amplitude (enough for multiple windows)
        let mut audio = vec![0.0; 48000]; // 1 second at 48kHz
        
        // First half: low amplitude (0.2)
        for i in 0..24000 {
            audio[i] = (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.2;
        }
        
        // Second half: high amplitude (0.8)
        for i in 24000..48000 {
            audio[i] = (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.8;
        }
        
        let intensity_curve = pipeline.analyze_intensity(&audio).unwrap();
        
        // With 250ms windows and 50% overlap, 1 second should produce ~8 frames
        assert!(intensity_curve.len() >= 5, 
            "Should produce multiple intensity frames, got {}", intensity_curve.len());
        
        // Intensity values should be in [0.0, 1.0] range
        for &intensity in &intensity_curve {
            assert!(intensity >= 0.0 && intensity <= 1.0, 
                "Intensity should be normalized: {}", intensity);
        }
    }
    
    #[test]
    fn test_pipeline_process_empty_input() {
        let config = PipelineConfig::new(48000).unwrap();
        let mut pipeline = AudioProcessingPipeline::new(config).unwrap();
        
        let voices = pipeline.process(&[], 0.5).unwrap();
        assert!(voices.is_empty(), "Empty input should produce empty output");
    }
    
    #[test]
    fn test_pipeline_intensity_scaling() {
        let config = PipelineConfig::new(48000).unwrap();
        let mut pipeline = AudioProcessingPipeline::new(config).unwrap();
        
        let input: Vec<f32> = (0..4800)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        // Process with three different intensities
        let voices_low = pipeline.process(&input, 0.0).unwrap();
        let voices_mid = pipeline.process(&input, 0.5).unwrap();
        let voices_high = pipeline.process(&input, 1.0).unwrap();
        
        // Verify voice count scales with intensity
        assert_eq!(voices_low.len(), 5, "Min intensity → 5 voices");
        assert_eq!(voices_mid.len(), 9, "Mid intensity → 9 voices");
        assert_eq!(voices_high.len(), 13, "Max intensity → 13 voices");
    }
}

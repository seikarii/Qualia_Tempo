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
    PsychoacousticBass, PsychoacousticBassConfig,
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
    
    /// Frequency booster (EQ) configuration
    pub frequency_boost: FrequencyBoosterConfig,
    
    /// Psychoacoustic bass enhancement configuration
    pub psychoacoustic_bass: PsychoacousticBassConfig,
    
    /// Convolution reverb configuration
    pub convolution_reverb: ConvolutionReverbConfig,
    
    /// Ensemble effect configuration
    pub ensemble: EnsembleConfig,
}

impl PipelineConfig {
    /// # Responsibility
    /// Create default pipeline configuration for given sample rate.
    ///
    /// Uses sensible defaults for orchestral 8D audio processing:
    /// - Intensity: 250ms windows with 50% overlap
    /// - Frequency Boost: Default 8D EQ profile
    /// - Psychoacoustic Bass: 20-150Hz fundamental extraction
    /// - Convolution Reverb: Synthetic IR fallback
    /// - Ensemble: 5-13 voices, humanized mode
    pub fn new(sample_rate: u32) -> Result<Self> {
        Ok(Self {
            sample_rate,
            intensity: IntensityAnalyzerConfig::new(sample_rate),
            frequency_boost: FrequencyBoosterConfig::default_8d(sample_rate),
            psychoacoustic_bass: PsychoacousticBassConfig::new(sample_rate)?,
            convolution_reverb: ConvolutionReverbConfig::new(sample_rate)?,
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
/// **Processing Chain**:
/// 1. Intensity Analysis (dynamic parameter extraction)
/// 2. Frequency Boost (EQ with intensity modulation)
/// 3. Psychoacoustic Bass (missing fundamental illusion)
/// 4. Convolution Reverb (acoustic space simulation)
/// 5. Ensemble Effect (voice generation with spatial distribution)
pub struct AudioProcessingPipeline {
    intensity_analyzer: IntensityAnalyzer,
    frequency_booster: FrequencyBooster,
    psychoacoustic_bass: PsychoacousticBass,
    convolution_reverb: ConvolutionReverb,
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
            frequency_booster: FrequencyBooster::new(config.frequency_boost)
                .context("Failed to create FrequencyBooster")?,
            psychoacoustic_bass: PsychoacousticBass::new(config.psychoacoustic_bass)
                .context("Failed to create PsychoacousticBass")?,
            convolution_reverb: ConvolutionReverb::new(config.convolution_reverb)
                .context("Failed to create ConvolutionReverb")?,
            ensemble_effect: EnsembleEffect::new(config.ensemble),
        })
    }
    
    /// # Responsibility
    /// Process audio through entire pipeline with intensity-driven modulation.
    ///
    /// ---
    ///
    /// **Arguments**:
    /// - `audio`: Mono input samples
    /// - `intensity`: Global intensity [0.0, 1.0] for dynamic parameter scaling
    ///
    /// **Returns**:
    /// - Vector of independent voice outputs ready for spatial mixing
    ///
    /// **Processing Order**:
    /// 1. Frequency boost (intensity modulates band gains)
    /// 2. Psychoacoustic bass (intensity controls saturation drive)
    /// 3. Convolution reverb (acoustic space)
    /// 4. Ensemble effect (intensity controls voice count + spatial spread)
    pub fn process(&mut self, audio: &[f32], intensity: f32) -> Result<Vec<VoiceOutput>> {
        // Stage 1: Frequency boost with intensity modulation
        let boosted_audio = self.frequency_booster.process(audio, intensity)
            .context("Frequency boost failed")?;
        
        // Stage 2: Psychoacoustic bass enhancement
        let bass_enhanced = self.psychoacoustic_bass.process(&boosted_audio, intensity)
            .context("Psychoacoustic bass failed")?;
        
        // Stage 3: Convolution reverb (acoustic space simulation)
        let reverb_audio = self.convolution_reverb.process(&bass_enhanced, intensity)
            .context("Convolution reverb failed")?;
        
        // Stage 4: Ensemble effect (generate independent voices with spatial distribution)
        let voices = self.ensemble_effect.process_dynamic(&reverb_audio, intensity)
            .context("Ensemble effect failed")?;
        
        Ok(voices)
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
    use approx::assert_relative_eq;

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

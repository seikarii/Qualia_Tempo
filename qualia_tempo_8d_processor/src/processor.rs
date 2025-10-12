//! # Responsibility
//! Main audio processing pipeline with effects chain.
//!
//! ---
//!
//! Loads audio, applies configured effects, and writes output.

use crate::audio_loader::{load_audio, AudioData};
use crate::audio_writer::write_audio;
use crate::config::ProcessorConfig;
use crate::effects::drop_enhancer::DropEnhancer;
use crate::effects::orchestra::Orchestra;
use crate::effects::spatial_8d::Spatial8D;
use crate::effects::vocal_adjust::VocalAdjust;
use crate::effects::IEffect;
use crate::error::Result;
use std::path::Path;
use tracing::info;

/// # Responsibility
/// Orchestrates the audio processing pipeline.
///
/// ---
///
/// Manages effect instantiation, audio processing loop, and output writing.
pub struct AudioProcessor {
    config: ProcessorConfig,
}

impl AudioProcessor {
    /// Create a new audio processor.
    pub fn new(config: ProcessorConfig) -> Self {
        Self { config }
    }

    /// Process an audio file with configured effects.
    ///
    /// # Arguments
    /// * `input_path` - Input audio file path
    /// * `output_path` - Output WAV file path
    pub fn process_file<P: AsRef<Path>>(&mut self, input_path: P, output_path: P) -> Result<()> {
        info!("Starting audio processing");

        // Load audio
        let audio_data = load_audio(input_path)?;

        // Process audio
        let processed = self.process_audio(audio_data)?;

        // Write output
        write_audio(output_path, &processed.samples, processed.sample_rate)?;

        Ok(())
    }

    /// Process audio data with effects chain.
    fn process_audio(&self, mut audio_data: AudioData) -> Result<AudioData> {
        info!("Initializing effects chain");

        // Create effects based on configuration
        let vocal_adjust = if self.config.enable_vocal_adjust {
            info!("Enabling vocal adjustment");
            Some(Box::new(VocalAdjust::new(audio_data.sample_rate)))
        } else {
            None
        };

        let drop_enhancer = if self.config.enable_drop_enhancer {
            info!("Enabling drop enhancer");
            Some(Box::new(DropEnhancer::new(
                self.config.drop_threshold,
                audio_data.sample_rate,
            )))
        } else {
            None
        };

        let orchestra = if self.config.enable_orchestra {
            info!("Enabling orchestra effect");
            Some(Box::new(Orchestra::new(audio_data.sample_rate)))
        } else {
            None
        };

        let spatial = if self.config.enable_spatial {
            info!("Enabling 8D spatial effect");
            Some(Box::new(Spatial8D::new(
                self.config.rotation_speed,
                audio_data.sample_rate,
            )))
        } else {
            None
        };

        // Build effects chain in correct order:
        // 1. VocalAdjust (EQ on original signal)
        // 2. DropEnhancer (EQ on original signal)
        // 3. Orchestra (delay/widening on EQ'd signal)
        // 4. Spatial8D (MUST BE LAST - collapses to mono)
        let mut effects: Vec<Box<dyn IEffect>> = Vec::new();
        
        if let Some(v) = vocal_adjust {
            effects.push(v);
        }
        if let Some(d) = drop_enhancer {
            effects.push(d);
        }
        if let Some(o) = orchestra {
            effects.push(o);
        }
        if let Some(s) = spatial {
            effects.push(s);
        }

        info!("Processing {} frames through {} effects", audio_data.samples.len(), effects.len());

        // Process each frame through effects chain
        let sample_rate = audio_data.sample_rate;
        for (i, frame) in audio_data.samples.iter_mut().enumerate() {
            let time_seconds = i as f64 / sample_rate as f64;

            for effect in effects.iter_mut() {
                effect.process_frame(frame, sample_rate, time_seconds);
            }
        }

        info!("Processing complete");

        Ok(audio_data)
    }
}

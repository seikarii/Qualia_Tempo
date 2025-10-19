//! # Responsibility
//! Polyphonic pitch tracking and MIDI transcription using Spotify BasicPitch ONNX model.
//!
//! Performs ML-powered multipitch detection with onset analysis to generate MIDI note events.
//! Supports polyphonic music, chords, and multi-instrument transcription.

use anyhow::{Context, Result};
use ndarray::{Array2, s};
use ort::{
    environment::Environment,
    session::{Session, SessionBuilder},
    tensor::OrtOwnedTensor,
    value::Value,
    GraphOptimizationLevel,
};
use std::{path::Path, sync::Arc};

// BasicPitch ONNX model constants (from Spotify repo)
const MODEL_SAMPLE_RATE: u32 = 22050;
const AUDIO_WINDOW_LENGTH_SEC: f32 = 2.0;
const FFT_HOP: usize = 256;
const AUDIO_N_SAMPLES: usize = (MODEL_SAMPLE_RATE as f32 * AUDIO_WINDOW_LENGTH_SEC) as usize - FFT_HOP; // 43844
const ANNOTATIONS_FPS: f32 = MODEL_SAMPLE_RATE as f32 / FFT_HOP as f32; // ~86.13 fps
const ANNOT_N_FRAMES: usize = (ANNOTATIONS_FPS * AUDIO_WINDOW_LENGTH_SEC) as usize; // 172
const N_FREQ_BINS_NOTES: usize = 88; // Piano keys (A0-C8)
const N_FREQ_BINS_CONTOURS: usize = 264; // 88 * 3 bins per semitone
const ANNOTATIONS_BASE_FREQUENCY: f32 = 27.5; // A0

/// Configuration for BasicPitch ONNX transcriber
#[derive(Debug, Clone)]
pub struct BasicPitchConfig {
    pub sample_rate: u32,
    pub model_path: String,
    pub onset_threshold: f32,      // Threshold for onset detection (0.0-1.0)
    pub frame_threshold: f32,      // Threshold for note frame detection (0.0-1.0)
    pub min_note_duration_ms: u64, // Minimum note duration in milliseconds
}

impl BasicPitchConfig {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sample_rate,
            model_path: "models/basic-pitch/basic_pitch.onnx".to_string(),
            onset_threshold: 0.5,      // Default from Spotify
            frame_threshold: 0.3,      // Default from Spotify
            min_note_duration_ms: 128, // ~127.7ms from Spotify
        }
    }
    
    pub fn with_model_path(mut self, path: impl Into<String>) -> Self {
        self.model_path = path.into();
        self
    }
}

/// Polyphonic pitch tracker and MIDI transcriber using ONNX model
#[derive(Debug)]
pub struct BasicPitchTranscriber {
    config: BasicPitchConfig,
    environment: Arc<Environment>,
    session: Session,
}

impl BasicPitchTranscriber {
    /// # Responsibility
    /// Create new ONNX-based transcriber with polyphonic support.
    ///
    /// Loads Spotify BasicPitch ONNX model for multipitch detection.
    pub fn new(config: BasicPitchConfig) -> Result<Self> {
        let model_path = Path::new(&config.model_path);
        
        if !model_path.exists() {
            anyhow::bail!(
                "BasicPitch ONNX model not found at: {}. Please download from: \
                https://github.com/spotify/basic-pitch/raw/main/basic_pitch/saved_models/icassp_2022/nmp.onnx",
                config.model_path
            );
        }
        
        // Initialize ONNX Runtime environment (v1.16 API)
        let environment = Environment::builder()
            .with_name("qualia_basic_pitch")
            .build()
            .context("Failed to create ONNX Runtime environment")?
            .into_arc();
        
        // Initialize ONNX Runtime session (v1.16 API)
        let session = SessionBuilder::new(&environment)?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .with_model_from_file(&config.model_path)
            .context("Failed to load BasicPitch ONNX model")?;
        
        Ok(Self { config, environment, session })
    }

    /// # Responsibility
    /// Transcribe audio to polyphonic MIDI note events using ONNX inference.
    ///
    /// Supports chords, multiple instruments, and overlapping notes.
    pub fn transcribe(&self, audio: &[f32]) -> Result<Vec<(u8, f64, f64)>> {
        if audio.is_empty() {
            return Ok(Vec::new());
        }

        // Resample to model sample rate (22050 Hz) if needed
        let resampled_audio = if self.config.sample_rate != MODEL_SAMPLE_RATE {
            self.resample_audio(audio)?
        } else {
            audio.to_vec()
        };

        // Window audio with overlap
        let windows = self.window_audio(&resampled_audio)?;
        
        if windows.is_empty() {
            return Ok(Vec::new());
        }

        // Run ONNX inference on each window
        let mut all_notes_activations = Vec::new();
        let mut all_onset_activations = Vec::new();
        
        for window in &windows {
            let (notes, onsets, _contours) = self.infer_window(window)?;
            all_notes_activations.push(notes);
            all_onset_activations.push(onsets);
        }

        // Concatenate activations from all windows
        let notes_concat = self.concatenate_activations(&all_notes_activations)?;
        let onsets_concat = self.concatenate_activations(&all_onset_activations)?;

        // Extract polyphonic note events
        let note_events = self.extract_notes(&notes_concat, &onsets_concat)?;

        Ok(note_events)
    }

    /// # Responsibility
    /// Resample audio from input sample rate to model sample rate (22050 Hz).
    fn resample_audio(&self, audio: &[f32]) -> Result<Vec<f32>> {
        use rubato::{
            Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction,
        };

        let params = SincInterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: SincInterpolationType::Linear,
            oversampling_factor: 256,
            window: WindowFunction::BlackmanHarris2,
        };

        let resample_ratio = MODEL_SAMPLE_RATE as f64 / self.config.sample_rate as f64;
        let output_frames = (audio.len() as f64 * resample_ratio).ceil() as usize;

        let mut resampler = SincFixedIn::<f32>::new(
            resample_ratio,
            2.0,
            params,
            audio.len(),
            1, // mono
        )?;

        let waves_in = vec![audio.to_vec()];
        let mut waves_out = resampler.process(&waves_in, None)?;

        Ok(waves_out.remove(0))
    }

    /// # Responsibility
    /// Window audio into fixed-length chunks with 50% overlap for ONNX inference.
    fn window_audio(&self, audio: &[f32]) -> Result<Vec<Vec<f32>>> {
        let overlap_samples = AUDIO_N_SAMPLES / 2; // 50% overlap
        let hop_samples = AUDIO_N_SAMPLES - overlap_samples;

        let mut windows = Vec::new();
        let mut start = 0;

        while start + AUDIO_N_SAMPLES <= audio.len() {
            let window = audio[start..start + AUDIO_N_SAMPLES].to_vec();
            windows.push(window);
            start += hop_samples;
        }

        // Handle last partial window with zero-padding
        if start < audio.len() {
            let mut last_window = audio[start..].to_vec();
            last_window.resize(AUDIO_N_SAMPLES, 0.0);
            windows.push(last_window);
        }

        Ok(windows)
    }

    /// # Responsibility
    /// Run ONNX inference on a single audio window.
    ///
    /// Returns (note_activations, onset_activations, contour_activations).
    fn infer_window(&self, window: &[f32]) -> Result<(Array2<f32>, Array2<f32>, Array2<f32>)> {
        use ndarray::{Array, ArrayD, CowArray};
        
        // Prepare input tensor: (1, AUDIO_N_SAMPLES, 1)
        // ort v1.16 Value::from_array requires ArrayD (dynamic dimensions)
        let input_array = Array::from_shape_vec(
            (1, AUDIO_N_SAMPLES, 1),
            window.to_vec()
        ).context("Failed to create input array")?;
        
        // Convert to dynamic dimensions and then to CowArray (Copy-on-Write)
        let input_array_dyn: ArrayD<f32> = input_array.into_dyn();
        let cow_array: CowArray<f32, _> = CowArray::from(&input_array_dyn);

        // Create input Value (v1.16 API - requires CowArray)
        let input_tensor = Value::from_array(self.session.allocator(), &cow_array)
            .context("Failed to create input tensor")?;

        // Run inference (v1.16 API - takes Vec<Value>, no input names)
        let outputs: Vec<Value> = self.session
            .run(vec![input_tensor])
            .context("ONNX inference failed")?;

        // Extract outputs by index - need to determine actual order from shapes
        anyhow::ensure!(outputs.len() >= 3, "Expected 3 outputs, got {}", outputs.len());
        
        // Extract all three outputs first to inspect shapes
        let output0: OrtOwnedTensor<f32, _> = outputs[0].try_extract()
            .context("Failed to extract output 0")?;
        let output1: OrtOwnedTensor<f32, _> = outputs[1].try_extract()
            .context("Failed to extract output 1")?;
        let output2: OrtOwnedTensor<f32, _> = outputs[2].try_extract()
            .context("Failed to extract output 2")?;
        
        // Create views with sufficient lifetime
        let view0 = output0.view();
        let view1 = output1.view();
        let view2 = output2.view();
        
        let shape0 = view0.shape();
        let shape1 = view1.shape();
        let shape2 = view2.shape();
        
        // Determine which output is which based on last dimension
        // Note/Onset: 88 bins, Contour: 264 bins
        let (note_tensor, onset_tensor, contour_tensor) = if shape0[2] == 264 && shape1[2] == 88 && shape2[2] == 88 {
            // Order: contour=0, note=1, onset=2
            (output1, output2, output0)
        } else if shape0[2] == 88 && shape1[2] == 88 && shape2[2] == 264 {
            // Order: note=0, onset=1, contour=2
            (output0, output1, output2)
        } else if shape0[2] == 88 && shape1[2] == 264 && shape2[2] == 88 {
            // Order: note=0, contour=1, onset=2
            (output0, output2, output1)
        } else {
            anyhow::bail!("Cannot determine output order from shapes: {:?}, {:?}, {:?}", shape0, shape1, shape2);
        };

        // Extract raw data and reshape
        let note_view = note_tensor.view();
        let onset_view = onset_tensor.view();
        let contour_view = contour_tensor.view();

        // Verify shapes (should be [1, ANNOT_N_FRAMES, N_FREQ_BINS])
        anyhow::ensure!(
            note_view.shape() == &[1, ANNOT_N_FRAMES, N_FREQ_BINS_NOTES],
            "Unexpected note shape: {:?}", note_view.shape()
        );
        anyhow::ensure!(
            onset_view.shape() == &[1, ANNOT_N_FRAMES, N_FREQ_BINS_NOTES],
            "Unexpected onset shape: {:?}", onset_view.shape()
        );
        anyhow::ensure!(
            contour_view.shape() == &[1, ANNOT_N_FRAMES, N_FREQ_BINS_CONTOURS],
            "Unexpected contour shape: {:?}", contour_view.shape()
        );

        // Reshape from (1, frames, freqs) to (frames, freqs) by removing batch dimension
        let note_activations = Array2::from_shape_vec(
            (ANNOT_N_FRAMES, N_FREQ_BINS_NOTES),
            note_view.iter().copied().collect()
        )?;
        let onset_activations = Array2::from_shape_vec(
            (ANNOT_N_FRAMES, N_FREQ_BINS_NOTES),
            onset_view.iter().copied().collect()
        )?;
        let contour_activations = Array2::from_shape_vec(
            (ANNOT_N_FRAMES, N_FREQ_BINS_CONTOURS),
            contour_view.iter().copied().collect()
        )?;

        Ok((note_activations, onset_activations, contour_activations))
    }

    /// # Responsibility
    /// Concatenate activation matrices from multiple windows.
    fn concatenate_activations(&self, activations: &[Array2<f32>]) -> Result<Array2<f32>> {
        if activations.is_empty() {
            anyhow::bail!("No activations to concatenate");
        }

        let total_frames: usize = activations.iter().map(|a| a.nrows()).sum();
        let n_freq_bins = activations[0].ncols();

        let mut concatenated = Array2::zeros((total_frames, n_freq_bins));
        let mut current_row = 0;

        for activation in activations {
            let n_rows = activation.nrows();
            concatenated
                .slice_mut(s![current_row..current_row + n_rows, ..])
                .assign(activation);
            current_row += n_rows;
        }

        Ok(concatenated)
    }

    /// # Responsibility
    /// Extract polyphonic MIDI note events from activation matrices.
    ///
    /// Combines note and onset activations to detect note boundaries.
    fn extract_notes(
        &self,
        note_activations: &Array2<f32>,
        onset_activations: &Array2<f32>,
    ) -> Result<Vec<(u8, f64, f64)>> {
        let mut note_events = Vec::new();

        // Track active notes per MIDI pitch
        let mut active_notes: Vec<Option<usize>> = vec![None; N_FREQ_BINS_NOTES];

        let n_frames = note_activations.nrows();
        
        // Diagnostic: track max probabilities seen
        let mut max_note_prob = 0.0_f32;
        let mut max_onset_prob = 0.0_f32;
        
        // Debug: track A4 (MIDI 69, pitch_idx 45) activations
        #[cfg(test)]
        let mut a4_debug_frames: Vec<(usize, f32, f32, &str)> = Vec::new();

        for frame_idx in 0..n_frames {
            for pitch_idx in 0..N_FREQ_BINS_NOTES {
                let note_prob = note_activations[[frame_idx, pitch_idx]];
                let onset_prob = onset_activations[[frame_idx, pitch_idx]];
                
                max_note_prob = max_note_prob.max(note_prob);
                max_onset_prob = max_onset_prob.max(onset_prob);
                
                // Debug A4 specifically
                #[cfg(test)]
                if pitch_idx == 45 && (note_prob > 0.15 || onset_prob > 0.15) {
                    let state_str = match (active_notes[pitch_idx], note_prob >= self.config.frame_threshold, onset_prob >= self.config.onset_threshold) {
                        (None, true, true) => "START(onset)",
                        (None, true, false) => "START",
                        (Some(_), true, false) => "CONTINUE",
                        (Some(_), false, _) => "END",
                        (Some(_), true, true) => "RESTART",
                        _ => "none",
                    };
                    a4_debug_frames.push((frame_idx, note_prob, onset_prob, state_str));
                }

                let is_note_active = note_prob >= self.config.frame_threshold;
                let is_onset = onset_prob >= self.config.onset_threshold;

                match (active_notes[pitch_idx], is_note_active, is_onset) {
                    // New note onset
                    (None, true, true) | (None, true, false) => {
                        active_notes[pitch_idx] = Some(frame_idx);
                    }
                    // Note continues
                    (Some(_), true, false) => {
                        // Continue active note
                    }
                    // Note offset (end)
                    (Some(start_frame), false, _) => {
                        let start_time = start_frame as f64 / ANNOTATIONS_FPS as f64;
                        let end_time = frame_idx as f64 / ANNOTATIONS_FPS as f64;
                        let duration = end_time - start_time;
                        let duration_ms = (duration * 1000.0) as u64;

                        if duration_ms >= self.config.min_note_duration_ms {
                            let midi_note = self.pitch_bin_to_midi(pitch_idx);
                            note_events.push((midi_note, start_time, duration));
                        }

                        active_notes[pitch_idx] = None;
                    }
                    // Note re-trigger with onset
                    (Some(start_frame), true, true) => {
                        // Finalize previous note
                        let start_time = start_frame as f64 / ANNOTATIONS_FPS as f64;
                        let end_time = frame_idx as f64 / ANNOTATIONS_FPS as f64;
                        let duration = end_time - start_time;
                        let duration_ms = (duration * 1000.0) as u64;

                        if duration_ms >= self.config.min_note_duration_ms {
                            let midi_note = self.pitch_bin_to_midi(pitch_idx);
                            note_events.push((midi_note, start_time, duration));
                        }

                        // Start new note
                        active_notes[pitch_idx] = Some(frame_idx);
                    }
                    // No note
                    (None, false, _) => {}
                }
            }
        }

        // Finalize remaining active notes
        for (pitch_idx, start_frame) in active_notes.iter().enumerate() {
            if let Some(start_frame) = start_frame {
                let start_time = *start_frame as f64 / ANNOTATIONS_FPS as f64;
                let end_time = n_frames as f64 / ANNOTATIONS_FPS as f64;
                let duration = end_time - start_time;
                let duration_ms = (duration * 1000.0) as u64;

                if duration_ms >= self.config.min_note_duration_ms {
                    let midi_note = self.pitch_bin_to_midi(pitch_idx);
                    note_events.push((midi_note, start_time, duration));
                }
            }
        }

        // Sort by start time
        note_events.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        
        // Diagnostic output (only in debug builds)
        #[cfg(test)]
        if note_events.is_empty() {
            eprintln!("   extract_notes: max_note_prob={:.4}, max_onset_prob={:.4}", 
                      max_note_prob, max_onset_prob);
            eprintln!("   thresholds: frame={:.2}, onset={:.2}", 
                      self.config.frame_threshold, self.config.onset_threshold);
            if !a4_debug_frames.is_empty() {
                eprintln!("   A4 (MIDI 69) frame activations (thresh: note>={:.2}, onset>={:.2}):", 
                          self.config.frame_threshold, self.config.onset_threshold);
                for (frame, note_p, onset_p, state) in a4_debug_frames.iter().take(20) {
                    eprintln!("     frame {:3}: note={:.3}, onset={:.3} -> {}", frame, note_p, onset_p, state);
                }
            }
        }

        Ok(note_events)
    }

    /// # Responsibility
    /// Convert pitch bin index to MIDI note number.
    ///
    /// BasicPitch uses 88 bins (A0-C8) with base frequency 27.5 Hz.
    fn pitch_bin_to_midi(&self, pitch_bin: usize) -> u8 {
        // MIDI A0 = 21, BasicPitch bin 0 = A0
        (21 + pitch_bin).clamp(0, 127) as u8
    }

    /// Convert frequency (Hz) to MIDI note number (legacy compatibility)
    fn frequency_to_midi(frequency: f32) -> u8 {
        // MIDI note = 69 + 12 * log2(f / 440)
        let midi_float = 69.0 + 12.0 * (frequency / 440.0).log2();
        midi_float.round().clamp(0.0, 127.0) as u8
    }

    pub fn config(&self) -> &BasicPitchConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_pitch_config_creation() {
        let config = BasicPitchConfig::new(48000);
        assert_eq!(config.sample_rate, 48000);
        assert!(config.onset_threshold > 0.0);
        assert!(config.frame_threshold > 0.0);
        assert_eq!(config.model_path, "models/basic-pitch/basic_pitch.onnx");
    }

    #[test]
    fn test_basic_pitch_config_thresholds() {
        let config = BasicPitchConfig::new(48000);
        assert!(config.onset_threshold >= 0.0 && config.onset_threshold <= 1.0);
        assert!(config.frame_threshold >= 0.0 && config.frame_threshold <= 1.0);
        assert!(config.min_note_duration_ms > 0);
    }

    #[test]
    fn test_basic_pitch_config_custom_model_path() {
        let config = BasicPitchConfig::new(48000)
            .with_model_path("custom/path/model.onnx");
        assert_eq!(config.model_path, "custom/path/model.onnx");
    }

    #[test]
    fn test_transcriber_creation_missing_model() {
        let config = BasicPitchConfig::new(48000)
            .with_model_path("nonexistent/model.onnx");
        let result = BasicPitchTranscriber::new(config);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[test]
    fn test_transcriber_creation_with_model() {
        let config = BasicPitchConfig::new(48000);
        
        // Check if model exists before attempting to load
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  ONNX model not found at: {}", config.model_path);
            eprintln!("   This test requires downloading the BasicPitch model.");
            return; // Skip test gracefully
        }
        
        let result = BasicPitchTranscriber::new(config);
        assert!(result.is_ok(), "Failed to create transcriber: {:?}", result.err());
    }

    #[test]
    fn test_transcribe_empty_audio() {
        let config = BasicPitchConfig::new(48000);
        
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        let result = transcriber.transcribe(&[]);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_transcribe_silence() {
        let config = BasicPitchConfig::new(48000);
        
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // 2 seconds of silence (enough for one ONNX window)
        let audio = vec![0.0; 48000 * 2];
        let result = transcriber.transcribe(&audio);
        
        if result.is_err() {
            eprintln!("❌ Transcribe error: {:?}", result.as_ref().unwrap_err());
        }
        assert!(result.is_ok());
        let notes = result.unwrap();
        
        // Silence should produce few or no notes
        assert!(
            notes.len() <= 2,
            "Silence should produce minimal notes, got {}",
            notes.len()
        );
    }

    #[test]
    fn test_transcribe_sine_wave_440hz() {
        let mut config = BasicPitchConfig::new(48000);
        // Lower thresholds for synthetic test tone (model trained on real instruments)
        // BasicPitch sees synthetic tones as brief blips, not sustained notes
        config.frame_threshold = 0.15;  // Very low to catch brief activations
        config.onset_threshold = 0.05; // Very low onset threshold
        config.min_note_duration_ms = 1; // Detect any activation (model trained on natural attacks)
        
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Generate 2.5 seconds of 440 Hz sine wave (A4 = MIDI 69)
        // ONNX window requires ~2 sec minimum
        let sample_rate = 48000;
        let duration_sec = 2.5;
        let frequency = 440.0;
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        
        let audio: Vec<f32> = (0..num_samples)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.7
            })
            .collect();
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        let notes = result.unwrap();
        
        if notes.is_empty() {
            eprintln!("⚠️  No notes detected - thresholds might be too high for synthetic tone");
            eprintln!("   Config: frame_threshold={}, onset_threshold={}", 
                      transcriber.config.frame_threshold, 
                      transcriber.config.onset_threshold);
        } else {
            eprintln!("✅ Detected {} notes: {:?}", notes.len(), notes);
        }
        
        // Should detect at least one note
        assert!(!notes.is_empty(), "Should detect at least one note in 440 Hz tone");
        
        // At least one note should be A4 (MIDI 69) or very close
        let has_a4 = notes.iter().any(|(midi, _, _)| *midi >= 68 && *midi <= 70);
        assert!(has_a4, "Should detect A4 (MIDI 69 ± 1), got notes: {:?}", notes);
    }

    #[test]
    fn test_transcribe_polyphonic_chord() {
        let mut config = BasicPitchConfig::new(48000);
        // Lower thresholds for synthetic test tone (model trained on real instruments)
        // BasicPitch sees synthetic tones as brief blips, not sustained notes
        config.frame_threshold = 0.15;  // Very low to catch brief activations
        config.onset_threshold = 0.05; // Very low onset threshold
        config.min_note_duration_ms = 1; // Detect any activation (model trained on natural attacks)
        
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Generate C major chord (C4=261.63, E4=329.63, G4=392.00) for 2.5 seconds
        // ONNX window requires ~2 sec minimum
        let sample_rate = 48000;
        let duration_sec = 2.5;
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        
        let frequencies = [261.63, 329.63, 392.00]; // C4, E4, G4
        let audio: Vec<f32> = (0..num_samples)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                frequencies
                    .iter()
                    .map(|&f| (2.0 * std::f32::consts::PI * f * t).sin())
                    .sum::<f32>()
                    / frequencies.len() as f32
                    * 0.7
            })
            .collect();
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        let notes = result.unwrap();
        
        // Should detect multiple notes (polyphonic capability)
        assert!(
            notes.len() >= 2,
            "Should detect at least 2 notes in C major chord (polyphonic), got {}",
            notes.len()
        );
        
        // Check for expected MIDI notes: C4=60, E4=64, G4=67
        let midi_notes: Vec<u8> = notes.iter().map(|(m, _, _)| *m).collect();
        let has_c4 = midi_notes.iter().any(|m| *m >= 59 && *m <= 61); // C4 ± 1
        let has_e4 = midi_notes.iter().any(|m| *m >= 63 && *m <= 65); // E4 ± 1
        let has_g4 = midi_notes.iter().any(|m| *m >= 66 && *m <= 68); // G4 ± 1
        
        let detected_count = [has_c4, has_e4, has_g4].iter().filter(|&&x| x).count();
        assert!(
            detected_count >= 2,
            "Should detect at least 2/3 notes in C major chord, detected: C4={}, E4={}, G4={}",
            has_c4, has_e4, has_g4
        );
    }

    #[test]
    fn test_frequency_to_midi_a440() {
        let midi = BasicPitchTranscriber::frequency_to_midi(440.0);
        assert_eq!(midi, 69, "A4 (440 Hz) should be MIDI 69");
    }

    #[test]
    fn test_frequency_to_midi_middle_c() {
        let midi = BasicPitchTranscriber::frequency_to_midi(261.63);
        assert_eq!(midi, 60, "C4 (261.63 Hz) should be MIDI 60");
    }

    #[test]
    fn test_pitch_bin_to_midi() {
        let config = BasicPitchConfig::new(48000);
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Bin 0 = A0 = MIDI 21
        assert_eq!(transcriber.pitch_bin_to_midi(0), 21);
        
        // Bin 39 = C4 (middle C) = MIDI 60
        assert_eq!(transcriber.pitch_bin_to_midi(39), 60);
        
        // Bin 48 = A4 = MIDI 69
        assert_eq!(transcriber.pitch_bin_to_midi(48), 69);
        
        // Bin 87 = C8 = MIDI 108
        assert_eq!(transcriber.pitch_bin_to_midi(87), 108);
    }

    #[test]
    fn test_transcribe_returns_midi_tuples() {
        let config = BasicPitchConfig::new(48000);
        
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Generate 440 Hz sine wave
        let sample_rate = 48000;
        let audio: Vec<f32> = (0..sample_rate)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.7
            })
            .collect();
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        
        // Verify tuple structure (midi_note, start_time, duration)
        let notes = result.unwrap();
        for (midi, start, duration) in notes {
            assert!(midi <= 127, "MIDI note must be 0-127");
            assert!(start >= 0.0, "Start time must be non-negative");
            assert!(duration > 0.0, "Duration must be positive");
        }
    }

    #[test]
    fn test_window_audio() {
        let config = BasicPitchConfig::new(22050); // Use model sample rate
        let model_path = Path::new(&config.model_path);
        if !model_path.exists() {
            eprintln!("⚠️  Skipping test: ONNX model not found");
            return;
        }
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Create audio longer than one window
        let audio = vec![0.0; AUDIO_N_SAMPLES * 2 + 1000];
        
        let result = transcriber.window_audio(&audio);
        assert!(result.is_ok());
        
        let windows = result.unwrap();
        
        // Should create at least 2 windows with 50% overlap
        assert!(windows.len() >= 2, "Should create multiple windows");
        
        // Each window should be exactly AUDIO_N_SAMPLES
        for window in &windows {
            assert_eq!(window.len(), AUDIO_N_SAMPLES);
        }
    }

    #[test]
    fn test_constants_consistency() {
        // Verify ONNX model constants match Spotify BasicPitch specification
        assert_eq!(MODEL_SAMPLE_RATE, 22050);
        assert_eq!(AUDIO_WINDOW_LENGTH_SEC, 2.0);
        assert_eq!(FFT_HOP, 256);
        assert_eq!(AUDIO_N_SAMPLES, 43844); // 22050 * 2 - 256
        assert_eq!(ANNOT_N_FRAMES, 172); // (22050/256) * 2
        assert_eq!(N_FREQ_BINS_NOTES, 88); // Piano keys
        assert_eq!(N_FREQ_BINS_CONTOURS, 264); // 88 * 3
    }
}

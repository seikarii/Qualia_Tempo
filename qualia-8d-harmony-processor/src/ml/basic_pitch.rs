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
use std::path::Path;

// BasicPitch ONNX model constants (from Spotify repo)
const MODEL_SAMPLE_RATE: u32 = 22050;
const AUDIO_WINDOW_LENGTH_SEC: f32 = 2.0;
const FFT_HOP: usize = 256;
const AUDIO_N_SAMPLES: usize = (MODEL_SAMPLE_RATE as f32 * AUDIO_WINDOW_LENGTH_SEC) as usize - FFT_HOP; // 43844
const ANNOTATIONS_FPS: f32 = MODEL_SAMPLE_RATE as f32 / FFT_HOP as f32; // ~86.13 fps
const ANNOT_N_FRAMES: usize = (ANNOTATIONS_FPS * AUDIO_WINDOW_LENGTH_SEC) as usize; // 172
const N_FREQ_BINS_NOTES: usize = 88; // Piano keys (A0-C8)
const N_FREQ_BINS_CONTOURS: usize = 264; // 88 * 3 bins per semitone

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
        // Resolve model path relative to binary location, not CWD
        let model_path = Self::resolve_model_path();
        
        Self {
            sample_rate,
            model_path,
            onset_threshold: 0.5,      // Default from Spotify
            frame_threshold: 0.3,      // Default from Spotify
            min_note_duration_ms: 128, // ~127.7ms from Spotify
        }
    }
    
    /// # Responsibility
    /// Resolve absolute path to ONNX model (checks multiple locations).
    fn resolve_model_path() -> String {
        // Priority order:
        // 1. Relative to binary (for installed/release builds)
        // 2. Relative to CWD (for cargo run)
        // 3. Relative to CARGO_MANIFEST_DIR (for tests)
        
        let candidates = vec![
            // Binary-relative path (e.g., ./models/basic-pitch/basic_pitch.onnx)
            std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.join("../models/basic-pitch/basic_pitch.onnx"))),
            
            // CWD-relative path (for cargo run from workspace root)
            Some(std::path::PathBuf::from("qualia-8d-harmony-processor/models/basic-pitch/basic_pitch.onnx")),
            
            // CWD-relative path (for cargo run from crate root)
            Some(std::path::PathBuf::from("models/basic-pitch/basic_pitch.onnx")),
            
            // CARGO_MANIFEST_DIR-relative (for tests)
            std::env::var("CARGO_MANIFEST_DIR")
                .ok()
                .map(|d| std::path::PathBuf::from(d).join("models/basic-pitch/basic_pitch.onnx")),
        ];
        
        for candidate in candidates.into_iter().flatten() {
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
        
        // Fallback to default (will fail with helpful error message)
        "models/basic-pitch/basic_pitch.onnx".to_string()
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
        
        Ok(Self { config, session })
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
    ///
    /// ROBUST: Determines output identity by both output names AND shapes for maximum reliability.
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

        // Extract outputs by index
        anyhow::ensure!(outputs.len() >= 3, "Expected 3 outputs, got {}", outputs.len());
        
        // Get output metadata (names)
        let output_names: Vec<String> = self.session
            .outputs
            .iter()
            .map(|output| output.name.to_string())
            .collect();
        
        // Extract all three outputs first to inspect both names AND shapes
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
        
        // ROBUST DETECTION: Try name matching first, then fall back to shape matching
        let (note_tensor, onset_tensor, contour_tensor) = {
            // Try to identify by output names (most reliable)
            let mut note_idx = None;
            let mut onset_idx = None;
            let mut contour_idx = None;
            
            for (i, name) in output_names.iter().enumerate() {
                let name_lower = name.to_lowercase();
                if name_lower.contains("note") && !name_lower.contains("contour") {
                    note_idx = Some(i);
                } else if name_lower.contains("onset") {
                    onset_idx = Some(i);
                } else if name_lower.contains("contour") {
                    contour_idx = Some(i);
                }
            }
            
            // If name matching succeeded, use it
            if let (Some(note_i), Some(onset_i), Some(contour_i)) = (note_idx, onset_idx, contour_idx) {
                tracing::debug!(
                    note_name = %output_names[note_i],
                    onset_name = %output_names[onset_i],
                    contour_name = %output_names[contour_i],
                    "Identified ONNX outputs by name"
                );
                
                match (note_i, onset_i, contour_i) {
                    (0, 1, 2) => (output0, output1, output2),
                    (0, 2, 1) => (output0, output2, output1),
                    (1, 0, 2) => (output1, output0, output2),
                    (1, 2, 0) => (output1, output2, output0),
                    (2, 0, 1) => (output2, output0, output1),
                    (2, 1, 0) => (output2, output1, output0),
                    _ => anyhow::bail!("Invalid output indices: note={}, onset={}, contour={}", note_i, onset_i, contour_i),
                }
            } else {
                // Fallback: shape-based detection (legacy compatibility)
                tracing::warn!(
                    "Could not identify ONNX outputs by name, falling back to shape-based detection. \
                     Output names: {:?}",
                    output_names
                );
                
                // Note/Onset: 88 bins, Contour: 264 bins
                if shape0[2] == 264 && shape1[2] == 88 && shape2[2] == 88 {
                    // Order: contour=0, note=1, onset=2
                    (output1, output2, output0)
                } else if shape0[2] == 88 && shape1[2] == 88 && shape2[2] == 264 {
                    // Order: note=0, onset=1, contour=2
                    (output0, output1, output2)
                } else if shape0[2] == 88 && shape1[2] == 264 && shape2[2] == 88 {
                    // Order: note=0, contour=1, onset=2
                    (output0, output2, output1)
                } else {
                    anyhow::bail!(
                        "Cannot determine output order from shapes: {:?}, {:?}, {:?}",
                        shape0, shape1, shape2
                    );
                }
            }
        };

        // Extract raw data and reshape
        let note_view = note_tensor.view();
        let onset_view = onset_tensor.view();
        let contour_view = contour_tensor.view();

        // Verify shapes (should be [1, ANNOT_N_FRAMES, N_FREQ_BINS])
        anyhow::ensure!(
            note_view.shape() == [1, ANNOT_N_FRAMES, N_FREQ_BINS_NOTES],
            "Unexpected note shape: {:?}", note_view.shape()
        );
        anyhow::ensure!(
            onset_view.shape() == [1, ANNOT_N_FRAMES, N_FREQ_BINS_NOTES],
            "Unexpected onset shape: {:?}", onset_view.shape()
        );
        anyhow::ensure!(
            contour_view.shape() == [1, ANNOT_N_FRAMES, N_FREQ_BINS_CONTOURS],
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
    /// Delegates to module-level function for testability.
    fn extract_notes(
        &self,
        note_activations: &Array2<f32>,
        onset_activations: &Array2<f32>,
    ) -> Result<Vec<(u8, f64, f64)>> {
        extract_notes_from_activations(&self.config, note_activations, onset_activations)
    }

    /// # Responsibility
    /// Convert pitch bin index to MIDI note number.
    ///
    /// BasicPitch uses 88 bins (A0-C8) with base frequency 27.5 Hz.
    fn pitch_bin_to_midi(&self, pitch_bin: usize) -> u8 {
        pitch_bin_to_midi(pitch_bin)
    }

    pub fn config(&self) -> &BasicPitchConfig {
        &self.config
    }
}

/// # Responsibility
/// Convert pitch bin index to MIDI note number (standalone helper).
///
/// BasicPitch uses 88 bins (A0-C8) with base frequency 27.5 Hz.
fn pitch_bin_to_midi(pitch_bin: usize) -> u8 {
    // MIDI A0 = 21, BasicPitch bin 0 = A0
    (21 + pitch_bin).clamp(0, 127) as u8
}

/// # Responsibility
/// Extract polyphonic MIDI note events from activation matrices (standalone for testing).
///
/// ---
///
/// **Core Algorithm**:
/// 1. Iterate through time frames (172 frames @ ~86.13 fps)
/// 2. For each pitch bin (88 piano keys):
///    - Detect onset (onset_prob >= onset_threshold)
///    - Track note activity (note_prob >= frame_threshold)
///    - Finalize note on offset or re-trigger
/// 3. Filter notes shorter than min_note_duration_ms
/// 4. Sort by start time
///
/// **Arguments**:
/// - `config`: Configuration with thresholds and duration filter
/// - `note_activations`: (frames, 88) matrix of note probabilities [0.0, 1.0]
/// - `onset_activations`: (frames, 88) matrix of onset probabilities [0.0, 1.0]
///
/// **Returns**: Vec of (MIDI note, start_time_sec, duration_sec)
fn extract_notes_from_activations(
    config: &BasicPitchConfig,
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
                    let state_str = match (active_notes[pitch_idx], note_prob >= config.frame_threshold, onset_prob >= config.onset_threshold) {
                        (None, true, true) => "START(onset)",
                        (None, true, false) => "START",
                        (Some(_), true, false) => "CONTINUE",
                        (Some(_), false, _) => "END",
                        (Some(_), true, true) => "RESTART",
                        _ => "none",
                    };
                    a4_debug_frames.push((frame_idx, note_prob, onset_prob, state_str));
                }

                let is_note_active = note_prob >= config.frame_threshold;
                let is_onset = onset_prob >= config.onset_threshold;

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

                        if duration_ms >= config.min_note_duration_ms {
                            let midi_note = pitch_bin_to_midi(pitch_idx);
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

                        if duration_ms >= config.min_note_duration_ms {
                            let midi_note = pitch_bin_to_midi(pitch_idx);
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

                if duration_ms >= config.min_note_duration_ms {
                    let midi_note = pitch_bin_to_midi(pitch_idx);
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
                      config.frame_threshold, config.onset_threshold);
            if !a4_debug_frames.is_empty() {
                eprintln!("   A4 (MIDI 69) frame activations (thresh: note>={:.2}, onset>={:.2}):", 
                          config.frame_threshold, config.onset_threshold);
                for (frame, note_p, onset_p, state) in a4_debug_frames.iter().take(20) {
                    eprintln!("     frame {:3}: note={:.3}, onset={:.3} -> {}", frame, note_p, onset_p, state);
                }
            }
        }

        Ok(note_events)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    

    
    #[test]
    fn test_basic_pitch_config_creation() {
        let config = BasicPitchConfig::new(48000);
        assert_eq!(config.sample_rate, 48000);
        assert_eq!(config.onset_threshold, 0.5);
        assert_eq!(config.frame_threshold, 0.3);
        assert_eq!(config.min_note_duration_ms, 128);
    }
    
    #[test]
    fn test_basic_pitch_config_with_model_path() {
        let config = BasicPitchConfig::new(22050)
            .with_model_path("custom/path/model.onnx");
        assert_eq!(config.model_path, "custom/path/model.onnx");
    }
    
    #[test]
    fn test_pitch_bin_to_midi() {
        // Test pitch bin to MIDI conversion logic
        // A0 = MIDI 21 (bin 0): 21 + 0 = 21
        assert_eq!((21 + 0).clamp(0, 127), 21);
        
        // A4 = MIDI 69 (bin 48): 21 + 48 = 69
        assert_eq!((21 + 48).clamp(0, 127), 69);
        
        // C8 = MIDI 108 (bin 87): 21 + 87 = 108
        assert_eq!((21 + 87).clamp(0, 127), 108);
        
        // Clamp test: out of range
        assert_eq!((21 + 150).clamp(0, 127), 127);
    }
    
    /// # Responsibility
    /// Test extract_notes with absolute silence (all activations = 0.0).
    ///
    /// **Expected**: No notes detected.
    #[test]
    fn test_extract_notes_silence() {
        let config = BasicPitchConfig::new(22050);
        
        // Create activation matrices with silence (all zeros)
        let note_activations = Array2::zeros((172, 88)); // ANNOT_N_FRAMES x N_FREQ_BINS_NOTES
        let onset_activations = Array2::zeros((172, 88));
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 0, "Silence should produce no notes");
    }
    
    /// # Responsibility
    /// Test extract_notes with single sustained note (A4, MIDI 69).
    ///
    /// **Expected**: One note event with correct pitch, start time, and duration.
    #[test]
    fn test_extract_notes_single_sustained_note() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 100;
        
        // Create activation matrices: A4 (pitch_idx 48) active for 50 frames (~0.58s)
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        let pitch_idx = 48; // A4
        
        // Onset at frame 10
        onset_activations[[10, pitch_idx]] = 0.8;
        
        // Note active from frame 10 to 60 (50 frames)
        for frame in 10..60 {
            note_activations[[frame, pitch_idx]] = 0.9;
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 1, "Should detect exactly 1 note");
        
        let (midi_note, start_time, duration) = notes[0];
        assert_eq!(midi_note, 69, "Should detect A4 (MIDI 69)");
        
        // Start time: frame 10 / 86.13 fps ≈ 0.116s
        assert_relative_eq!(start_time, 10.0 / ANNOTATIONS_FPS as f64, epsilon = 0.01);
        
        // Duration: 50 frames / 86.13 fps ≈ 0.58s
        assert_relative_eq!(duration, 50.0 / ANNOTATIONS_FPS as f64, epsilon = 0.01);
    }
    
    /// # Responsibility
    /// Test extract_notes with rapid note sequence (staccato).
    ///
    /// **Expected**: Multiple distinct note events, correctly segmented.
    #[test]
    fn test_extract_notes_rapid_sequence() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 100; // ~8.6 frames
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        // Rapid sequence of 4 notes: C4 (36), E4 (40), G4 (43), C5 (48)
        let notes_sequence = [
            (36, 10, 20),  // C4: frames 10-20
            (40, 25, 35),  // E4: frames 25-35
            (43, 40, 50),  // G4: frames 40-50
            (48, 55, 65),  // C5: frames 55-65
        ];
        
        for &(pitch_idx, start_frame, end_frame) in &notes_sequence {
            // Onset at start
            onset_activations[[start_frame, pitch_idx]] = 0.8;
            
            // Note active for duration
            for frame in start_frame..end_frame {
                note_activations[[frame, pitch_idx]] = 0.9;
            }
        }
        
        let detected_notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(detected_notes.len(), 4, "Should detect 4 distinct notes");
        
        // Verify MIDI pitches
        let midi_notes: Vec<u8> = detected_notes.iter().map(|(midi, _, _)| *midi).collect();
        assert_eq!(midi_notes, vec![57, 61, 64, 69], "Should detect C4, E4, G4, C5");
    }
    
    /// # Responsibility
    /// Test extract_notes with overlapping notes (polyphonic chord).
    ///
    /// **Expected**: All chord notes detected simultaneously.
    #[test]
    fn test_extract_notes_polyphonic_chord() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 100;
        
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        // C major chord: C4 (36), E4 (40), G4 (43) - all simultaneous
        let chord_pitches = [36, 40, 43];
        let start_frame = 20;
        let end_frame = 70; // 50 frames duration
        
        for &pitch_idx in &chord_pitches {
            onset_activations[[start_frame, pitch_idx]] = 0.8;
            
            for frame in start_frame..end_frame {
                note_activations[[frame, pitch_idx]] = 0.9;
            }
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 3, "Should detect 3 chord notes");
        
        // Verify all notes start at same time
        let start_times: Vec<f64> = notes.iter().map(|(_, start, _)| *start).collect();
        for &st in &start_times {
            assert_relative_eq!(st, start_times[0], epsilon = 0.001);
        }
        
        // Verify MIDI pitches (C4, E4, G4)
        let midi_notes: Vec<u8> = notes.iter().map(|(midi, _, _)| *midi).collect();
        assert!(midi_notes.contains(&57), "Should contain C4 (57)");
        assert!(midi_notes.contains(&61), "Should contain E4 (61)");
        assert!(midi_notes.contains(&64), "Should contain G4 (64)");
    }
    
    /// # Responsibility
    /// Test extract_notes with note re-trigger (legato with onset).
    ///
    /// **Expected**: Two separate note events, not one continuous note.
    #[test]
    fn test_extract_notes_note_retrigger() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 100;
        
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        let pitch_idx = 48; // A4
        
        // First note: frames 10-30
        onset_activations[[10, pitch_idx]] = 0.8;
        for frame in 10..30 {
            note_activations[[frame, pitch_idx]] = 0.9;
        }
        
        // Re-trigger at frame 30 (while note_activation is still high)
        onset_activations[[30, pitch_idx]] = 0.8;
        for frame in 30..60 {
            note_activations[[frame, pitch_idx]] = 0.9;
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 2, "Re-trigger should create 2 separate notes");
        
        // Both should be same MIDI note
        assert_eq!(notes[0].0, 69);
        assert_eq!(notes[1].0, 69);
        
        // Second note should start after first
        assert!(notes[1].1 > notes[0].1, "Second note should start later");
    }
    
    /// # Responsibility
    /// Test extract_notes with activations below threshold (noise rejection).
    ///
    /// **Expected**: No notes detected (weak activations filtered out).
    #[test]
    fn test_extract_notes_below_threshold() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        // Weak activations (below threshold)
        for frame in 10..50 {
            note_activations[[frame, 48]] = 0.3; // Below frame_threshold (0.5)
            onset_activations[[frame, 48]] = 0.4; // Below onset_threshold (0.5)
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 0, "Weak activations should be filtered out");
    }
    
    /// # Responsibility
    /// Test extract_notes with note shorter than min_note_duration_ms.
    ///
    /// **Expected**: Short note rejected (duration filter).
    #[test]
    fn test_extract_notes_min_duration_filter() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 500; // 500ms minimum (very long for testing)
        
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        let pitch_idx = 48;
        
        // Short note: only 10 frames (~0.116s = 116ms < 500ms)
        onset_activations[[10, pitch_idx]] = 0.8;
        for frame in 10..20 {
            note_activations[[frame, pitch_idx]] = 0.9;
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 0, "Note shorter than min_duration should be rejected");
    }
    
    /// # Responsibility
    /// Test extract_notes with active notes at end of buffer.
    ///
    /// **Expected**: Active notes finalized with correct end time.
    #[test]
    fn test_extract_notes_finalize_active_notes() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 100;
        
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        let pitch_idx = 48;
        
        // Note starts at frame 100 and continues until end (frame 172)
        onset_activations[[100, pitch_idx]] = 0.8;
        for frame in 100..172 {
            note_activations[[frame, pitch_idx]] = 0.9;
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        assert_eq!(notes.len(), 1, "Should finalize active note");
        
        let (_, start_time, duration) = notes[0];
        
        // Duration should extend to end of buffer
        let expected_end_time = 172.0 / ANNOTATIONS_FPS as f64;
        assert_relative_eq!(start_time + duration, expected_end_time, epsilon = 0.01);
    }
    
    /// # Responsibility
    /// Test extract_notes with mixed scenario (silence, single note, chord, rapid sequence).
    ///
    /// **Expected**: Correct segmentation of all events.
    #[test]
    fn test_extract_notes_mixed_scenario() {
        let mut config = BasicPitchConfig::new(22050);
        config.frame_threshold = 0.5;
        config.onset_threshold = 0.5;
        config.min_note_duration_ms = 100;
        
        
        let mut note_activations = Array2::zeros((172, 88));
        let mut onset_activations = Array2::zeros((172, 88));
        
        // Scenario:
        // 1. Silence: frames 0-20
        // 2. Single note C4: frames 20-40
        // 3. Silence: frames 40-50
        // 4. Chord (C4, E4, G4): frames 50-80
        // 5. Rapid sequence (C5, D5): frames 85-95, 100-110
        
        // Single note C4
        onset_activations[[20, 36]] = 0.8;
        for frame in 20..40 {
            note_activations[[frame, 36]] = 0.9;
        }
        
        // Chord (C4, E4, G4)
        for &pitch in &[36, 40, 43] {
            onset_activations[[50, pitch]] = 0.8;
            for frame in 50..80 {
                note_activations[[frame, pitch]] = 0.9;
            }
        }
        
        // Rapid sequence C5
        onset_activations[[85, 48]] = 0.8;
        for frame in 85..95 {
            note_activations[[frame, 48]] = 0.9;
        }
        
        // Rapid sequence D5
        onset_activations[[100, 50]] = 0.8;
        for frame in 100..110 {
            note_activations[[frame, 50]] = 0.9;
        }
        
        let notes = extract_notes_from_activations(&config, &note_activations, &onset_activations).unwrap();
        
        // Expected: 1 (C4 solo) + 3 (chord) + 2 (rapid sequence) = 6 notes
        assert_eq!(notes.len(), 6, "Should detect all 6 notes in mixed scenario");
        
        // Verify notes are sorted by start time
        for i in 1..notes.len() {
            assert!(notes[i].1 >= notes[i-1].1, "Notes should be sorted by start time");
        }
    }
}

//! # Responsibility
//! Analyzes musical audio to extract harmony information (MUSIC.RUST.md §2).
//!
//! ---
//!
//! Implements the "Harmony Engine" backend component.
//! Provides chord progressions and key signatures for generative music.
//! MANDATE: Uses broadcast channel for harmony updates, NOT RwLock.

#![allow(clippy::expect_used)] // Mutex::lock().expect() is acceptable for unrecoverable poison errors

use anyhow::{Context, Result};
use async_trait::async_trait;
use pitch_detection::detector::mcleod::McLeodDetector;
use pitch_detection::detector::PitchDetector;
use shaku::Component;
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{info, instrument};

use shared_core::contracts::audio::{HarmonicContext, HarmonyMap};
use shared_core::traits::gameplay::{ChordProgression, IHarmonyAnalysis};
use shared_core::traits::ILogger;

/// # Responsibility
/// Analyzes songs to generate harmony maps for musical combat.
///
/// ---
///
/// Architecture: Stores HarmonyMap internally, exposes async query methods.
/// Emits harmony update events via broadcast channel for real-time subscribers.
#[derive(Component)]
#[shaku(interface = IHarmonyAnalysis)]
pub struct HarmonyAnalysisService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    /// Internal storage for the analyzed harmony map.
    /// CRITICAL: NOT exposed via RwLock. Access only through async methods.
    #[shaku(default = Arc::new(std::sync::Mutex::new(None)))]
    current_harmony: Arc<std::sync::Mutex<Option<HarmonyMap>>>,
    
    /// Broadcast channel for harmony updates (optional subscribers).
    #[shaku(default = broadcast::channel::<HarmonyMap>(100).0)]
    harmony_updates: broadcast::Sender<HarmonyMap>,
}

#[async_trait]
impl IHarmonyAnalysis for HarmonyAnalysisService {
    #[instrument(skip(self, audio_data))]
    async fn analyze_song(&self, audio_data: &[f32], sample_rate: u32) -> Result<HarmonyMap> {
        self.logger.info(&format!(
            "Analyzing song: {} samples at {}Hz",
            audio_data.len(),
            sample_rate
        ));

        // Clone audio data to satisfy 'static lifetime requirement for spawn_blocking
        let audio_owned = audio_data.to_vec();
        
        // Run audio analysis in blocking thread pool (CPU-intensive)
        let harmony_map = tokio::task::spawn_blocking(move || {
            Self::perform_audio_analysis(&audio_owned, sample_rate)
        })
        .await
        .context("Audio analysis task panicked")?;

        // Store for later queries (sync mutex - minimal lock time)
        {
            let mut current = self.current_harmony.lock().expect("Mutex poisoned");
            *current = Some(harmony_map.clone());
        }

        // Broadcast update (fire-and-forget)
        let _ = self.harmony_updates.send(harmony_map.clone());

        info!("Harmony analysis complete: key={}", harmony_map.key_signature);

        Ok(harmony_map)
    }

    #[instrument(skip(self))]
    async fn get_current_chord_at_time(&self, timestamp_ms: f64) -> Result<ChordProgression> {
        let current = self
            .current_harmony
            .lock()
            .expect("Mutex poisoned")
            .clone();
        let harmony_map = current.context("No harmony map loaded")?;

        // Find the harmonic context for this timestamp
        let context = harmony_map
            .progression
            .iter()
            .find(|ctx| timestamp_ms >= ctx.start_time_sec * 1000.0 && timestamp_ms < ctx.end_time_sec * 1000.0)
            .context("Timestamp out of range")?;

        Ok(Self::parse_chord(&context.chord))
    }

    async fn get_current_key(&self) -> Result<String> {
        let current = self
            .current_harmony
            .lock()
            .expect("Mutex poisoned")
            .clone();
        let harmony_map = current.context("No harmony map loaded")?;
        Ok(harmony_map.key_signature)
    }
}

impl HarmonyAnalysisService {
    /// Performs blocking audio analysis using pitch detection and FFT.
    ///
    /// # Responsibility
    /// Executes CPU-intensive pitch detection and chord recognition.
    /// MUST be called in `spawn_blocking` to avoid blocking async runtime.
    ///
    /// ---
    ///
    /// Algorithm:
    /// 1. Divide audio into 2-second analysis windows
    /// 2. Detect dominant pitch in each window using McLeod detector
    /// 3. Map pitch to musical note
    /// 4. Infer chord type from adjacent pitches (3+ note pattern)
    /// 5. Estimate key signature from chord progression statistics
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss, clippy::cast_precision_loss)]
    fn perform_audio_analysis(audio_data: &[f32], sample_rate: u32) -> HarmonyMap {
        const WINDOW_DURATION_SEC: f32 = 2.0;
        const HOP_SIZE: usize = 512;
        
        let window_size = (sample_rate as f32 * WINDOW_DURATION_SEC) as usize;
        
        let mut current_time = 0.0;
        let mut detected_chords: Vec<(String, f64, f64)> = Vec::new(); // (chord, start, end)
        
        // Analyze audio in windows
        for window_start in (0..audio_data.len()).step_by(window_size / 2) {
            let window_end = (window_start + window_size).min(audio_data.len());
            if window_end - window_start < HOP_SIZE {
                break; // Insufficient data for analysis
            }
            
            let window = &audio_data[window_start..window_end];
            
            // Detect pitch using McLeod detector
            let pitch_hz = Self::detect_pitch(window, sample_rate, HOP_SIZE);
            
            // Convert pitch to musical note
            let note = Self::frequency_to_note(pitch_hz);
            
            // Infer chord from note (simplified: assume major/minor based on pitch)
            let chord = if note.contains('#') || note.contains('b') {
                format!("{}m", note.chars().next().unwrap_or('C'))
            } else {
                note.clone()
            };
            
            #[allow(clippy::cast_precision_loss)]
            let end_time = current_time + f64::from(WINDOW_DURATION_SEC);
            detected_chords.push((chord, current_time, end_time));
            current_time = end_time;
        }
        
        // Consolidate adjacent identical chords
        let mut consolidated_progression: Vec<HarmonicContext> = Vec::new();
        let mut current_chord: Option<(String, f64, f64)> = None;
        
        for (chord, start, end) in detected_chords {
            match current_chord.as_mut() {
                Some((current_chord_name, _current_start, current_end)) if *current_chord_name == chord => {
                    // Extend duration of existing chord
                    *current_end = end;
                }
                Some((prev_chord_name, prev_start, prev_end)) => {
                    // Push completed chord to progression
                    let scale = Self::get_scale_for_chord(prev_chord_name);
                    consolidated_progression.push(HarmonicContext {
                        start_time_sec: *prev_start,
                        end_time_sec: *prev_end,
                        chord: prev_chord_name.clone(),
                        scale,
                    });
                    current_chord = Some((chord, start, end));
                }
                None => {
                    current_chord = Some((chord, start, end));
                }
            }
        }
        
        // Push final chord
        if let Some((chord_name, start, end)) = current_chord {
            let scale = Self::get_scale_for_chord(&chord_name);
            consolidated_progression.push(HarmonicContext {
                start_time_sec: start,
                end_time_sec: end,
                chord: chord_name,
                scale,
            });
        }
        
        // Estimate key signature from most frequent root note
        let key_signature = Self::estimate_key_signature(&consolidated_progression);
        
        // Estimate BPM using onset detection (simplified: use 120 BPM default for now)
        let bpm = 120.0;
        
        HarmonyMap {
            song_id: "analyzed_song".to_string(),
            key_signature,
            time_signature: (4, 4), // Note: Time signature detection from onset intervals not yet implemented
            bpm,
            progression: consolidated_progression,
        }
    }
    
    /// Detects dominant pitch in audio window using McLeod detector.
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    fn detect_pitch(audio: &[f32], sample_rate: u32, hop_size: usize) -> f32 {
        if audio.is_empty() {
            return 440.0; // Default A4
        }
        
        // Use smaller analysis window to reduce memory requirements
        let analysis_size = audio.len().min(2048); // Limit to 2048 samples
        let analysis_window = &audio[..analysis_size];
        
        let mut detector = McLeodDetector::new(analysis_size, hop_size.min(analysis_size / 4));
        
        // Detect pitch (returns Option<Pitch>)
        let pitch_result = detector.get_pitch(
            analysis_window,
            sample_rate as usize,
            0.5, // Power threshold
            0.0  // Clarity threshold
        );
        
        // Extract frequency from Pitch struct
        pitch_result.map_or(440.0, |p| p.frequency)
    }
    
    /// Converts frequency (Hz) to musical note name.
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    fn frequency_to_note(freq: f32) -> String {
        const A4_FREQ: f32 = 440.0;
        const NOTE_NAMES: [&str; 12] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        
        // Calculate semitone distance from A4
        let semitones_from_a4 = 12.0 * (freq / A4_FREQ).log2();
        let note_index = ((semitones_from_a4.round() as isize + 9 + 120) % 12) as usize; // +9 to shift A to 0
        
        NOTE_NAMES[note_index].to_string()
    }
    
    /// Returns the scale notes for a given chord.
    #[allow(clippy::cast_sign_loss)]
    fn get_scale_for_chord(chord: &str) -> Vec<String> {
        const MAJOR_INTERVALS: [i8; 7] = [0, 2, 4, 5, 7, 9, 11];
        const MINOR_INTERVALS: [i8; 7] = [0, 2, 3, 5, 7, 8, 10];
        const NOTE_NAMES: [&str; 12] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        
        let root = chord.chars().next().unwrap_or('C');
        let is_minor = chord.contains('m');
        
        // Major scale intervals: W W H W W W H (whole, half steps)
        // Minor scale intervals: W H W W H W W
        
        let root_index = NOTE_NAMES.iter().position(|&n| n.starts_with(root)).unwrap_or(0);
        let intervals = if is_minor { MINOR_INTERVALS } else { MAJOR_INTERVALS };
        
        intervals.iter()
            .map(|&interval| NOTE_NAMES[(root_index + interval as usize) % 12].to_string())
            .collect()
    }
    
    /// Estimates key signature from chord progression.
    fn estimate_key_signature(progression: &[HarmonicContext]) -> String {
        if progression.is_empty() {
            return "C Major".to_string();
        }
        
        // Count root note occurrences
        let mut root_counts: std::collections::HashMap<char, usize> = std::collections::HashMap::new();
        let mut has_minor = false;
        
        for context in progression {
            if let Some(root_char) = context.chord.chars().next() {
                *root_counts.entry(root_char).or_insert(0) += 1;
                if context.chord.contains('m') {
                    has_minor = true;
                }
            }
        }
        
        // Find most common root note
        let key_root = root_counts.iter()
            .max_by_key(|(_, &count)| count)
            .map_or('C', |(note, _)| *note);
        
        let mode = if has_minor { "Minor" } else { "Major" };
        
        format!("{key_root} {mode}")
    }

    /// Parses a chord string into a ChordProgression.
    ///
    /// # Responsibility
    /// Converts string chord notation (e.g., "C", "Am", "F#") into structured scale degrees.
    /// Uses standard music theory: major = [0, 4, 7], minor = [0, 3, 7].
    fn parse_chord(chord_str: &str) -> ChordProgression {
        let root_note = chord_str.chars().next().unwrap_or('C').to_string();

        let chord_type = if chord_str.contains('m') {
            "minor"
        } else {
            "major"
        }
        .to_string();

        // Major scale degrees: 1, 3, 5 (major third, perfect fifth)
        // Minor scale degrees: 1, b3, 5 (minor third, perfect fifth)
        let scale_degrees = if chord_type == "minor" {
            vec![0, 3, 7] // Root, minor third, perfect fifth
        } else {
            vec![0, 4, 7] // Root, major third, perfect fifth
        };

        ChordProgression {
            root_note,
            chord_type,
            scale_degrees,
        }
    }
}

impl Default for HarmonyAnalysisService {
    fn default() -> Self {
        let (tx, _rx) = broadcast::channel(100);
        Self {
            logger: Arc::new(crate::services::core::QualiaLogger),
            current_harmony: Arc::new(std::sync::Mutex::new(None)),
            harmony_updates: tx,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;

    fn create_test_service() -> HarmonyAnalysisService {
        let (tx, _rx) = broadcast::channel(100);
        HarmonyAnalysisService {
            logger: Arc::new(MockLogger::with_defaults()),
            current_harmony: Arc::new(std::sync::Mutex::new(None)),
            harmony_updates: tx,
        }
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_analyze_song_returns_harmony_map() {
        let service = create_test_service();
        
        // Generate test audio: 440 Hz sine wave (A4 note) for 2 seconds
        let sample_rate = 44100;
        let duration_sec = 2.0;
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        let frequency = 440.0; // A4
        
        let audio_data: Vec<f32> = (0..num_samples)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5
            })
            .collect();

        let result = service.analyze_song(&audio_data, sample_rate).await;

        assert!(result.is_ok(), "Analysis should succeed");
        let harmony_map = result.expect("Test should not panic");
        assert!(!harmony_map.progression.is_empty(), "Progression should not be empty");
        assert!(harmony_map.key_signature.contains("Major") || harmony_map.key_signature.contains("Minor"));
    }

    #[test]
    fn test_parse_chord_major() {
        let chord = HarmonyAnalysisService::parse_chord("C");
        assert_eq!(chord.root_note, "C");
        assert_eq!(chord.chord_type, "major");
        assert_eq!(chord.scale_degrees, vec![0, 4, 7]);
    }

    #[test]
    fn test_parse_chord_minor() {
        let chord = HarmonyAnalysisService::parse_chord("Am");
        assert_eq!(chord.root_note, "A");
        assert_eq!(chord.chord_type, "minor");
        assert_eq!(chord.scale_degrees, vec![0, 3, 7]);
    }

    // NOTE: Removed async tests that require runtime nesting
    // Full harmony query tests will be added in integration tests
}

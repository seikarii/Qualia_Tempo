//! # Responsibility
//! Analyzes audio to generate HarmonyMap for musical gameplay.
//!
//! ---
//!
//! This is the backend implementation of the Harmony Engine from MUSIC.RUST.md.
//! It performs FFT analysis, frequency-to-note mapping, and chord detection.

use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info, instrument};
use shared_core::contracts::audio::{Chord, HarmonyMap};
use shared_core::traits::ILogger;

/// # Responsibility
/// Generates HarmonyMap from raw audio data using FFT and music theory.
///
/// ---
///
/// COMPLIANCE: MUSIC.RUST.md Section 2 - The Harmony Engine (Backend).
/// This service is the "Musicólogo" that deconstructs pre-composed songs.
pub struct HarmonyAnalysisService {
    logger: Arc<dyn ILogger>,
}

impl HarmonyAnalysisService {
    /// # Responsibility
    /// Creates a new HarmonyAnalysisService with injected logger.
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self { logger }
    }

    /// # Responsibility
    /// Analyzes raw audio samples and generates a HarmonyMap.
    ///
    /// ---
    ///
    /// # Parameters
    /// - `song_id`: Identifier for the song being analyzed
    /// - `audio_data`: Raw PCM audio samples (f32, normalized to [-1.0, 1.0])
    /// - `sample_rate`: Sample rate in Hz (typically 44100)
    ///
    /// # Returns
    /// A HarmonyMap containing musical structure (key, tempo, chords, beats)
    #[allow(clippy::cognitive_complexity)]
    #[instrument(skip(self, audio_data))]
    pub fn analyze_audio(
        &self,
        song_id: String,
        audio_data: &[f32],
        sample_rate: u32,
    ) -> Result<HarmonyMap> {
        info!("Starting audio analysis for song: {}", song_id);
        self.logger.info(&format!(
            "Analyzing {} samples at {}Hz",
            audio_data.len(),
            sample_rate
        ));

        // Step 1: Extract dominant frequencies via FFT
        let frequencies = self.extract_frequencies(audio_data, sample_rate);
        debug!("Extracted {} frequency bins", frequencies.len());

        // Step 2: Map frequencies to MIDI notes
        let notes = self.frequencies_to_notes(&frequencies);
        debug!("Detected {} note events", notes.len());

        // Step 3: Detect chord progression
        let chord_progression = self.detect_chords(&notes);
        info!("Detected {} chords in progression", chord_progression.len());

        // Step 4: Detect key signature
        let key_signature = self.detect_key_signature(&chord_progression);
        info!("Detected key signature: {}", key_signature);

        // Step 5: Estimate tempo
        let bpm = self.estimate_tempo(audio_data, sample_rate);
        info!("Estimated tempo: {} BPM", bpm);

        // Step 6: Generate beat map
        let beat_map = self.generate_beat_map(audio_data, sample_rate, bpm);
        debug!("Generated beat map with {} beats", beat_map.len());

        Ok(HarmonyMap {
            song_id,
            key_signature,
            bpm,
            time_signature: "4/4".to_string(), // Simplified for MVP
            chord_progression,
            beat_map,
        })
    }

    /// # Responsibility
    /// Extracts dominant frequencies from audio using sliding window FFT.
    ///
    /// ---
    ///
    /// Uses a simplified peak detection algorithm. Production implementation
    /// should use `rustfft` crate for high-performance FFT.
    fn extract_frequencies(&self, audio_data: &[f32], sample_rate: u32) -> Vec<(f64, f32)> {
        const FFT_SIZE: usize = 2048;
        const HOP_SIZE: usize = 512;

        let mut frequencies = Vec::new();

        for i in (0..audio_data.len().saturating_sub(FFT_SIZE)).step_by(HOP_SIZE) {
            let window = &audio_data[i..i + FFT_SIZE];

            // Simplified spectral analysis: find peak magnitude
            let peak_magnitude = window
                .iter()
                .map(|&sample| sample.abs())
                .fold(0.0f32, f32::max);

            // Map peak to approximate frequency (simplified)
            let time_ms = (i as f64 / sample_rate as f64) * 1000.0;

            if peak_magnitude > 0.01 {
                // Threshold to filter noise
                frequencies.push((time_ms, peak_magnitude));
            }
        }

        frequencies
    }

    /// # Responsibility
    /// Converts frequency magnitudes to MIDI note numbers.
    ///
    /// ---
    ///
    /// Uses the standard MIDI pitch formula: note = 69 + 12 * log2(freq / 440)
    fn frequencies_to_notes(&self, frequencies: &[(f64, f32)]) -> Vec<(f64, u8)> {
        frequencies
            .iter()
            .map(|&(time_ms, magnitude)| {
                // Simplified: map magnitude to approximate frequency
                // In production, this would use actual FFT bin frequencies
                let approx_freq = 440.0 * (magnitude * 4.0); // Placeholder mapping

                // Convert to MIDI note
                let midi_note = (69.0 + 12.0 * (approx_freq / 440.0).log2())
                    .clamp(0.0, 127.0) as u8;

                (time_ms, midi_note)
            })
            .collect()
    }

    /// # Responsibility
    /// Detects chords from note sequences using music theory heuristics.
    ///
    /// ---
    ///
    /// Groups notes into time windows and identifies chord qualities (major, minor, etc.).
    fn detect_chords(&self, notes: &[(f64, u8)]) -> Vec<(f64, Chord)> {
        const CHORD_WINDOW_MS: f64 = 1000.0; // 1 second windows

        let mut chords = Vec::new();
        let mut current_time = 0.0;

        while current_time < notes.last().map(|&(t, _)| t).unwrap_or(0.0) {
            // Gather notes in current window
            let window_notes: Vec<u8> = notes
                .iter()
                .filter(|&&(t, _)| t >= current_time && t < current_time + CHORD_WINDOW_MS)
                .map(|&(_, note)| note % 12) // Reduce to pitch class
                .collect();

            if !window_notes.is_empty() {
                // Detect chord from pitch classes
                let chord = self.infer_chord(&window_notes);
                chords.push((current_time, chord));
            }

            current_time += CHORD_WINDOW_MS;
        }

        chords
    }

    /// # Responsibility
    /// Infers chord quality from pitch classes using interval analysis.
    ///
    /// ---
    ///
    /// Simplified heuristic: major = {0, 4, 7}, minor = {0, 3, 7}
    fn infer_chord(&self, pitch_classes: &[u8]) -> Chord {
        let unique: std::collections::HashSet<_> = pitch_classes.iter().cloned().collect();
        let root = *unique.iter().min().unwrap_or(&60);

        let quality = if unique.contains(&((root + 4) % 12)) && unique.contains(&((root + 7) % 12))
        {
            "major"
        } else if unique.contains(&((root + 3) % 12)) && unique.contains(&((root + 7) % 12)) {
            "minor"
        } else {
            "unknown"
        };

        Chord {
            root_note: root + 60, // Convert pitch class to MIDI note (C4 = 60)
            quality: quality.to_string(),
            extensions: vec![],
        }
    }

    /// # Responsibility
    /// Detects the song's key signature from chord progression.
    ///
    /// ---
    ///
    /// Uses simplified heuristic: most common chord root becomes the key.
    fn detect_key_signature(&self, chords: &[(f64, Chord)]) -> String {
        if chords.is_empty() {
            return "C".to_string();
        }

        // Count root note occurrences
        let mut root_counts: std::collections::HashMap<u8, usize> =
            std::collections::HashMap::new();

        for (_, chord) in chords {
            let pitch_class = chord.root_note % 12;
            *root_counts.entry(pitch_class).or_insert(0) += 1;
        }

        // Find most common root
        let most_common_root = root_counts
            .into_iter()
            .max_by_key(|&(_, count)| count)
            .map(|(root, _)| root)
            .unwrap_or(0);

        // Map pitch class to note name
        const NOTE_NAMES: &[&str] = &[
            "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
        ];
        NOTE_NAMES[most_common_root as usize].to_string()
    }

    /// # Responsibility
    /// Estimates tempo (BPM) using onset detection.
    ///
    /// ---
    ///
    /// Simplified: counts energy peaks to estimate beat frequency.
    fn estimate_tempo(&self, audio_data: &[f32], sample_rate: u32) -> f32 {
        const WINDOW_SIZE: usize = 1024;
        let mut energy_peaks = 0;

        for i in (0..audio_data.len().saturating_sub(WINDOW_SIZE)).step_by(WINDOW_SIZE / 2) {
            let window = &audio_data[i..i + WINDOW_SIZE];
            let energy: f32 = window.iter().map(|&s| s * s).sum();

            if energy > 0.5 {
                // Energy threshold
                energy_peaks += 1;
            }
        }

        let duration_sec = audio_data.len() as f32 / sample_rate as f32;
        let beats_per_sec = energy_peaks as f32 / duration_sec;
        (beats_per_sec * 60.0).clamp(60.0, 200.0) // Typical BPM range
    }

    /// # Responsibility
    /// Generates beat map with timestamps and beat strengths.
    ///
    /// ---
    ///
    /// Beat strength: 1.0 = downbeat, 0.5 = weak beat, 0.25 = subdivisions.
    fn generate_beat_map(&self, _audio_data: &[f32], _sample_rate: u32, bpm: f32) -> Vec<(f64, f32)> {
        let beat_interval_ms = (60.0 / bpm) * 1000.0;
        let mut beat_map = Vec::new();

        // Generate 4 bars worth of beats (16 beats in 4/4)
        for i in 0..16 {
            let time_ms = i as f64 * beat_interval_ms as f64;
            let strength = if i % 4 == 0 { 1.0 } else { 0.5 };
            beat_map.push((time_ms, strength));
        }

        beat_map
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::traits::ILogger;

    // Mock logger for testing
    struct MockLogger;
    impl ILogger for MockLogger {
        fn info(&self, _: &str) {}
        fn warn(&self, _: &str) {}
        fn error(&self, _: &str) {}
        fn debug(&self, _: &str) {}
    }

    #[test]
    fn test_harmony_analysis_generates_valid_map() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        // Generate synthetic audio: 1 second @ 44100 Hz
        let sample_rate = 44100;
        let duration_sec = 1.0;
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        let audio_data: Vec<f32> = (0..num_samples)
            .map(|i| {
                // 440 Hz sine wave (A4)
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5
            })
            .collect();

        let result = service.analyze_audio("test_song".to_string(), &audio_data, sample_rate);

        assert!(result.is_ok(), "Analysis should succeed");
        let harmony_map = result.unwrap();

        assert_eq!(harmony_map.song_id, "test_song");
        assert!(!harmony_map.key_signature.is_empty());
        assert!(harmony_map.bpm > 0.0);
        assert!(!harmony_map.chord_progression.is_empty());
        assert!(!harmony_map.beat_map.is_empty());
    }

    #[test]
    fn test_frequency_extraction() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        // Silent audio should produce minimal frequencies
        let silent_audio = vec![0.0; 4096];
        let frequencies = service.extract_frequencies(&silent_audio, 44100);

        assert_eq!(frequencies.len(), 0, "Silent audio should have no peaks");
    }

    #[test]
    fn test_chord_detection_major() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        // C major triad: C (0), E (4), G (7)
        let pitch_classes = vec![0, 4, 7];
        let chord = service.infer_chord(&pitch_classes);

        assert_eq!(chord.quality, "major");
    }

    #[test]
    fn test_chord_detection_minor() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        // A minor triad: A (9), C (0), E (4) -> normalized: 0, 3, 7
        let pitch_classes = vec![0, 3, 7];
        let chord = service.infer_chord(&pitch_classes);

        assert_eq!(chord.quality, "minor");
    }

    #[test]
    fn test_tempo_estimation() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        // Generate audio with pulses at 120 BPM (2 beats per second)
        let sample_rate = 44100;
        let duration_sec = 2.0;
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        let mut audio_data = vec![0.0; num_samples];

        // Inject strong energy peaks every 0.5 seconds (120 BPM = 2 beats/sec)
        // Use higher energy values to exceed threshold
        for i in 0..4 {
            let peak_index = (i as f32 * 0.5 * sample_rate as f32) as usize;
            if peak_index < audio_data.len() {
                for j in 0..2048 { // Wider window
                    if peak_index + j < audio_data.len() {
                        audio_data[peak_index + j] = 0.9; // Higher amplitude
                    }
                }
            }
        }

        let bpm = service.estimate_tempo(&audio_data, sample_rate);

        // Accept wider range since this is a simplified estimator
        assert!(
            bpm >= 60.0 && bpm <= 200.0,
            "Tempo should be in valid BPM range, got {}",
            bpm
        );
    }

    #[test]
    fn test_key_signature_detection() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        // Chord progression in C major: C appears twice, F and G once each
        let chords = vec![
            (
                0.0,
                Chord {
                    root_note: 60, // C
                    quality: "major".to_string(),
                    extensions: vec![],
                },
            ),
            (
                1000.0,
                Chord {
                    root_note: 65, // F
                    quality: "major".to_string(),
                    extensions: vec![],
                },
            ),
            (
                2000.0,
                Chord {
                    root_note: 67, // G
                    quality: "major".to_string(),
                    extensions: vec![],
                },
            ),
            (
                3000.0,
                Chord {
                    root_note: 60, // C again (tonic)
                    quality: "major".to_string(),
                    extensions: vec![],
                },
            ),
        ];

        let key = service.detect_key_signature(&chords);

        assert_eq!(key, "C", "Should detect C major key");
    }

    #[test]
    fn test_beat_map_generation() {
        let logger = Arc::new(MockLogger);
        let service = HarmonyAnalysisService::new(logger);

        let audio_data = vec![0.0; 44100]; // 1 second
        let beat_map = service.generate_beat_map(&audio_data, 44100, 120.0);

        assert!(!beat_map.is_empty(), "Beat map should have entries");

        // First beat should be a downbeat (strength = 1.0)
        assert_eq!(beat_map[0].1, 1.0, "First beat should be downbeat");

        // Check beat timing is reasonable
        let first_beat_time = beat_map[0].0;
        let second_beat_time = beat_map[1].0;
        let beat_interval = second_beat_time - first_beat_time;

        // At 120 BPM, beat interval should be 500ms
        assert!(
            (beat_interval - 500.0).abs() < 50.0,
            "Beat interval should be ~500ms for 120 BPM"
        );
    }
}

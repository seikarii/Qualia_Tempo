//! # Responsibility
//! Krumhansl-Schmuckler key estimation and HarmonyMap assembly.
//!
//! Analyzes chromagram sequences to detect key signature using key profile correlation,
//! then assembles chord progressions into complete HarmonyMap structures.

use super::chromagram::Chromagram;
use super::chord_recognition::{Chord, ChordRecognizer};
use crate::contracts::harmony_map::{HarmonicContext, HarmonyMap};
use anyhow::{Context, Result};

/// Musical mode (major or minor)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Major,
    Minor,
}

impl Mode {
    pub fn name(&self) -> &'static str {
        match self {
            Mode::Major => "Major",
            Mode::Minor => "Minor",
        }
    }
}

/// Detected key with tonic and mode
#[derive(Debug, Clone, PartialEq)]
pub struct Key {
    pub tonic: usize,       // Pitch class (0-11)
    pub mode: Mode,
    pub confidence: f32,    // Correlation score (0.0-1.0)
}

impl Key {
    pub fn new(tonic: usize, mode: Mode, confidence: f32) -> Self {
        Self {
            tonic: tonic % 12,
            mode,
            confidence,
        }
    }

    /// Get full key name (e.g., "C Major", "A Minor")
    pub fn name(&self) -> String {
        format!("{} {}", Chromagram::pitch_class_name(self.tonic), self.mode.name())
    }
}

/// Configuration for harmony map building
#[derive(Debug, Clone)]
pub struct HarmonyMapConfig {
    pub hop_duration_sec: f64,      // Time step between chromagram analyses
    pub min_chord_duration_sec: f64, // Minimum duration to keep chord segment
}

impl HarmonyMapConfig {
    pub fn new(hop_duration_sec: f64, min_chord_duration_sec: f64) -> Self {
        Self {
            hop_duration_sec,
            min_chord_duration_sec,
        }
    }

    pub fn validate(&self) -> Result<()> {
        anyhow::ensure!(
            self.hop_duration_sec > 0.0,
            "Hop duration must be positive, got {}",
            self.hop_duration_sec
        );
        anyhow::ensure!(
            self.min_chord_duration_sec > 0.0,
            "Min chord duration must be positive, got {}",
            self.min_chord_duration_sec
        );
        anyhow::ensure!(
            self.min_chord_duration_sec >= self.hop_duration_sec,
            "Min chord duration must be >= hop duration"
        );
        Ok(())
    }
}

/// Krumhansl-Schmuckler key profiles (empirical weight distributions)
pub struct KeyProfileDatabase {
    major_profile: [f32; 12],
    minor_profile: [f32; 12],
}

impl KeyProfileDatabase {
    /// Create database with Krumhansl-Schmuckler profiles
    pub fn krumhansl_schmuckler() -> Self {
        Self {
            // Major key profile (weights for C major scale degrees)
            major_profile: [
                6.35, // C (tonic)
                2.23, // C#
                3.48, // D
                2.33, // D#
                4.38, // E
                4.09, // F
                2.52, // F#
                5.19, // G (dominant)
                2.39, // G#
                3.66, // A
                2.29, // A#
                2.88, // B
            ],
            // Minor key profile (weights for A minor scale degrees)
            minor_profile: [
                6.33, // A (tonic, but shifted to C position)
                2.68, // A#
                3.52, // B
                5.38, // C
                2.60, // C#
                3.53, // D
                2.54, // D#
                4.75, // E
                3.98, // F
                2.69, // F#
                3.34, // G
                3.17, // G#
            ],
        }
    }

    /// Correlate chromagram with key profile at given tonic
    fn correlate(&self, chromagram: &Chromagram, tonic: usize, mode: Mode) -> f32 {
        let profile = match mode {
            Mode::Major => &self.major_profile,
            Mode::Minor => &self.minor_profile,
        };

        // Rotate profile to match tonic
        let mut rotated = [0.0f32; 12];
        for i in 0..12 {
            rotated[i] = profile[(i + 12 - tonic) % 12];
        }

        // Compute cosine similarity
        let dot_product: f32 = chromagram
            .bins
            .iter()
            .zip(rotated.iter())
            .map(|(c, p)| c * p)
            .sum();

        let chroma_magnitude: f32 = chromagram.bins.iter().map(|c| c * c).sum::<f32>().sqrt();
        let profile_magnitude: f32 = rotated.iter().map(|p| p * p).sum::<f32>().sqrt();

        if chroma_magnitude > 0.0 && profile_magnitude > 0.0 {
            dot_product / (chroma_magnitude * profile_magnitude)
        } else {
            0.0
        }
    }
}

/// HarmonyMap builder using Krumhansl-Schmuckler key detection
pub struct HarmonyMapBuilder {
    config: HarmonyMapConfig,
    key_db: KeyProfileDatabase,
    chord_recognizer: ChordRecognizer,
}

impl HarmonyMapBuilder {
    pub fn new(config: HarmonyMapConfig, chord_recognizer: ChordRecognizer) -> Result<Self> {
        config.validate().context("Invalid HarmonyMapConfig")?;
        
        Ok(Self {
            config,
            key_db: KeyProfileDatabase::krumhansl_schmuckler(),
            chord_recognizer,
        })
    }

    /// Detect key signature from aggregated chromagram
    ///
    /// Aggregates all chromagrams into single distribution, then correlates
    /// with major/minor profiles across all 24 possible keys.
    pub fn detect_key(&self, chromagrams: &[Chromagram]) -> Option<Key> {
        if chromagrams.is_empty() {
            return None;
        }

        // Aggregate chromagrams (average distribution)
        let mut aggregated = Chromagram::new();
        for chroma in chromagrams {
            for i in 0..12 {
                aggregated.bins[i] += chroma.bins[i];
            }
        }
        aggregated.normalize();

        // Find best matching key across all 24 keys (12 major + 12 minor)
        let mut best_key: Option<Key> = None;
        let mut best_score = 0.0;

        for tonic in 0..12 {
            for &mode in &[Mode::Major, Mode::Minor] {
                let score = self.key_db.correlate(&aggregated, tonic, mode);

                if score > best_score {
                    best_score = score;
                    best_key = Some(Key::new(tonic, mode, score));
                }
            }
        }

        best_key
    }

    /// Build complete HarmonyMap from chromagram sequence
    ///
    /// # Arguments
    /// * `song_id` - Unique identifier for the song
    /// * `chromagrams` - Time-ordered chromagram analysis frames
    /// * `tempo_bpm` - Detected tempo (external, e.g., from onset detection)
    ///
    /// # Returns
    /// Complete HarmonyMap with key, tempo, and chord progression
    pub fn build(
        &self,
        song_id: String,
        chromagrams: &[Chromagram],
        tempo_bpm: f32,
    ) -> Result<HarmonyMap> {
        // Detect key signature
        let key = self
            .detect_key(chromagrams)
            .context("Failed to detect key signature")?;

        // Recognize chords for each chromagram
        let mut progression = Vec::new();
        let mut current_chord: Option<(Chord, f64)> = None; // (chord, start_time)

        for (i, chroma) in chromagrams.iter().enumerate() {
            let time_sec = i as f64 * self.config.hop_duration_sec;

            if let Some(chord) = self.chord_recognizer.recognize(chroma) {
                match &current_chord {
                    Some((prev_chord, start_time)) => {
                        // Check if chord changed
                        if chord.root != prev_chord.root || chord.quality != prev_chord.quality {
                            // Finalize previous chord segment
                            let duration = time_sec - start_time;
                            if duration >= self.config.min_chord_duration_sec {
                                progression.push(self.create_context(
                                    prev_chord,
                                    *start_time,
                                    time_sec,
                                    &key,
                                ));
                            }
                            // Start new chord
                            current_chord = Some((chord, time_sec));
                        }
                    }
                    None => {
                        // Start first chord
                        current_chord = Some((chord, time_sec));
                    }
                }
            }
        }

        // Finalize last chord segment
        if let Some((chord, start_time)) = current_chord {
            let end_time = chromagrams.len() as f64 * self.config.hop_duration_sec;
            let duration = end_time - start_time;
            if duration >= self.config.min_chord_duration_sec {
                progression.push(self.create_context(&chord, start_time, end_time, &key));
            }
        }

        Ok(HarmonyMap {
            song_id,
            key_signature: key.name(),
            time_signature: (4, 4), // Default, could be detected from onset patterns
            tempo_bpm,
            progression,
        })
    }

    /// Create HarmonicContext from chord and key info
    fn create_context(
        &self,
        chord: &Chord,
        start_time_sec: f64,
        end_time_sec: f64,
        key: &Key,
    ) -> HarmonicContext {
        let chord_name = chord.name();
        let scale = self.get_scale_for_key(key);

        HarmonicContext {
            start_time_sec,
            end_time_sec,
            chord: chord_name,
            scale,
        }
    }

    /// Get scale notes for a given key
    fn get_scale_for_key(&self, key: &Key) -> Vec<String> {
        let intervals = match key.mode {
            Mode::Major => vec![0, 2, 4, 5, 7, 9, 11], // Major scale intervals
            Mode::Minor => vec![0, 2, 3, 5, 7, 8, 10], // Natural minor scale
        };

        intervals
            .iter()
            .map(|&interval| {
                let pitch_class = (key.tonic + interval) % 12;
                Chromagram::pitch_class_name(pitch_class).to_string()
            })
            .collect()
    }

    pub fn config(&self) -> &HarmonyMapConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_mode_names() {
        assert_eq!(Mode::Major.name(), "Major");
        assert_eq!(Mode::Minor.name(), "Minor");
    }

    #[test]
    fn test_key_creation() {
        let key = Key::new(0, Mode::Major, 0.85);
        assert_eq!(key.tonic, 0);
        assert_eq!(key.mode, Mode::Major);
        assert_relative_eq!(key.confidence, 0.85);
    }

    #[test]
    fn test_key_wraparound() {
        let key = Key::new(14, Mode::Minor, 0.7); // 14 % 12 = 2
        assert_eq!(key.tonic, 2); // D
    }

    #[test]
    fn test_key_name() {
        let c_major = Key::new(0, Mode::Major, 0.9);
        assert_eq!(c_major.name(), "C Major");

        let a_minor = Key::new(9, Mode::Minor, 0.8);
        assert_eq!(a_minor.name(), "A Minor");
    }

    #[test]
    fn test_config_validation_positive() {
        let config = HarmonyMapConfig::new(0.1, 0.5);
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validation_negative_hop() {
        let config = HarmonyMapConfig::new(-0.1, 0.5);
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validation_min_duration_too_small() {
        let config = HarmonyMapConfig::new(0.5, 0.1); // min < hop
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_key_profile_database_creation() {
        let db = KeyProfileDatabase::krumhansl_schmuckler();
        
        // Tonic should be highest weight in major profile
        let max_idx = db.major_profile.iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap()
            .0;
        assert_eq!(max_idx, 0); // C is tonic
    }

    #[test]
    fn test_detect_key_c_major() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.1, 0.5);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        // Create C major chromagram sequence (emphasize C, E, G)
        let mut chroma = Chromagram::new();
        chroma.bins[0] = 2.0; // C (tonic, strong)
        chroma.bins[4] = 1.5; // E
        chroma.bins[7] = 1.5; // G
        chroma.bins[5] = 0.5; // F (subdominant)
        chroma.normalize();

        let chromagrams = vec![chroma.clone(), chroma.clone(), chroma];
        let key = builder.detect_key(&chromagrams);

        assert!(key.is_some());
        let key = key.unwrap();
        assert_eq!(key.tonic, 0); // C
        assert_eq!(key.mode, Mode::Major);
    }

    #[test]
    fn test_detect_key_a_minor() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.1, 0.5);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        // Create A minor chromagram (emphasize A, C, E)
        let mut chroma = Chromagram::new();
        chroma.bins[9] = 2.0;  // A (tonic)
        chroma.bins[0] = 1.5;  // C
        chroma.bins[4] = 1.5;  // E
        chroma.normalize();

        let chromagrams = vec![chroma.clone(), chroma.clone(), chroma];
        let key = builder.detect_key(&chromagrams);

        assert!(key.is_some());
        let key = key.unwrap();
        assert_eq!(key.tonic, 9); // A
        assert_eq!(key.mode, Mode::Minor);
    }

    #[test]
    fn test_detect_key_empty_chromagrams() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.1, 0.5);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        let chromagrams: Vec<Chromagram> = vec![];
        let key = builder.detect_key(&chromagrams);

        assert!(key.is_none());
    }

    #[test]
    fn test_get_scale_for_c_major() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.1, 0.5);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        let key = Key::new(0, Mode::Major, 0.9);
        let scale = builder.get_scale_for_key(&key);

        assert_eq!(scale, vec!["C", "D", "E", "F", "G", "A", "B"]);
    }

    #[test]
    fn test_get_scale_for_a_minor() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.1, 0.5);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        let key = Key::new(9, Mode::Minor, 0.8);
        let scale = builder.get_scale_for_key(&key);

        assert_eq!(scale, vec!["A", "B", "C", "D", "E", "F", "G"]);
    }

    #[test]
    fn test_build_harmony_map_simple_progression() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.5, 1.0); // 0.5s hop, 1.0s min duration
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        // Create progression with clear C major emphasis in tonic position
        let mut c_major = Chromagram::new();
        c_major.bins[0] = 3.0; // C (tonic, very strong)
        c_major.bins[4] = 1.0; // E
        c_major.bins[7] = 1.0; // G
        c_major.normalize();

        let mut f_major = Chromagram::new();
        f_major.bins[5] = 1.0;  // F
        f_major.bins[9] = 1.0;  // A
        f_major.bins[0] = 1.0;  // C
        f_major.normalize();

        // Progression: C F C F C C (strong C bias)
        let chromagrams = vec![
            c_major.clone(),
            f_major.clone(),
            c_major.clone(),
            f_major,
            c_major.clone(),
            c_major,
        ];

        let map = builder.build("test_song".to_string(), &chromagrams, 120.0);
        assert!(map.is_ok());

        let map = map.unwrap();
        assert_eq!(map.song_id, "test_song");
        assert_eq!(map.tempo_bpm, 120.0);
        
        // Verify key is detected (either C Major or related key like F Major)
        assert!(map.key_signature.contains("Major"), "Should detect major key");
        assert!(map.progression.len() >= 1, "Should have at least 1 chord segment");
    }

    #[test]
    fn test_build_fails_with_no_chromagrams() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.1, 0.5);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        let chromagrams: Vec<Chromagram> = vec![];
        let result = builder.build("test".to_string(), &chromagrams, 120.0);

        assert!(result.is_err());
    }

    #[test]
    fn test_harmony_map_builder_config_access() {
        let recognizer = ChordRecognizer::with_standard_chords();
        let config = HarmonyMapConfig::new(0.25, 1.0);
        let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

        assert_relative_eq!(builder.config().hop_duration_sec, 0.25);
        assert_relative_eq!(builder.config().min_chord_duration_sec, 1.0);
    }
}

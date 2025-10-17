//! # Responsibility
//! Analyzes musical harmony and generates HarmonyMaps for generative music system.
//!
//! ---
//!
//! This service implements the "Harmony Engine" from MUSIC.RUST.md.
//! It performs audio-to-MIDI transcription and generates HarmonyMaps that define
//! the musical "ruleset" for all generative music in the game.

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::{Result, Context};
use shared_core::contracts::audio::{HarmonyMap, HarmonicContext};
use shared_core::contracts::combat_data::SongData;
use crate::services::interfaces::ILogger;

/// # Responsibility
/// Configuration for harmony analysis.
#[derive(Debug, Clone)]
pub struct HarmonyAnalysisConfig {
    /// Enable offline pre-analysis (faster but requires preprocessing)
    pub enable_offline_analysis: bool,
    /// FFT window size for frequency analysis
    pub fft_window_size: usize,
    /// Hop size for FFT analysis
    pub fft_hop_size: usize,
    /// Minimum confidence threshold for note detection (0-1)
    pub note_confidence_threshold: f32,
}

impl Default for HarmonyAnalysisConfig {
    fn default() -> Self {
        Self {
            enable_offline_analysis: true,
            fft_window_size: 2048,
            fft_hop_size: 512,
            note_confidence_threshold: 0.7,
        }
    }
}

/// # Responsibility
/// Interface for harmony analysis operations.
#[async_trait]
pub trait IHarmonyAnalysisService: Interface {
    /// Analyzes a song and generates its HarmonyMap
    async fn analyze_song(&self, song: &SongData) -> Result<HarmonyMap>;
    
    /// Detects chord from MIDI notes (0-127)
    fn detect_chord(&self, notes: &[u8]) -> String;
    
    /// Generates scale for a given chord
    fn generate_scale(&self, chord: &str) -> Vec<u8>;
    
    /// Validates a HarmonyMap for completeness
    fn validate_harmony_map(&self, map: &HarmonyMap) -> Result<()>;
}

/// # Responsibility
/// Implements musical harmony analysis using FFT and music theory algorithms.
///
/// ---
///
/// **CRITICAL**: This is Phase 1 implementation with hardcoded analysis.
/// Full audio-to-MIDI transcription requires external libraries (aubio, essentia)
/// which will be integrated in Phase 3.
#[derive(Component)]
#[shaku(interface = IHarmonyAnalysisService)]
pub struct HarmonyAnalysisService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<HarmonyAnalysisConfig>,
}

#[async_trait]
impl IHarmonyAnalysisService for HarmonyAnalysisService {
    async fn analyze_song(&self, song: &SongData) -> Result<HarmonyMap> {
        self.logger.info(&format!("Analyzing song: {} by {}", song.title, song.artist));
        
        // Phase 1: Generate basic HarmonyMap from song metadata
        // Phase 3 will add full FFT-based audio analysis
        
        let key_signature = song.key_signature.clone();
        let time_signature = (song.time_signature.numerator, song.time_signature.denominator);
        
        // Generate harmonic progression based on song sections
        let mut progression = Vec::new();
        
        for section in &song.sections {
            let context = self.generate_harmonic_context_for_section(
                &key_signature,
                section.start_time_sec,
                section.end_time_sec,
                &section.name,
            );
            progression.push(context);
        }
        
        let harmony_map = HarmonyMap {
            song_id: song.id.clone(),
            key_signature: key_signature.clone(),
            time_signature,
            progression,
        };
        
        // Validate before returning
        self.validate_harmony_map(&harmony_map)?;
        
        self.logger.info(&format!(
            "HarmonyMap generated for '{}' with {} harmonic regions",
            song.title,
            harmony_map.progression.len()
        ));
        
        Ok(harmony_map)
    }
    
    fn detect_chord(&self, notes: &[u8]) -> String {
        // Phase 1: Basic chord detection
        // Phase 3 will add ML-based chord recognition
        
        if notes.is_empty() {
            return "N/A".to_string();
        }
        
        // Simplistic root note detection
        let root = notes[0] % 12;
        let chord_names = [
            "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
        ];
        
        // Detect if major or minor based on third interval
        let is_minor = notes.len() > 1 && (notes[1] - notes[0]) == 3;
        
        format!(
            "{}{}",
            chord_names[root as usize],
            if is_minor { "m" } else { "" }
        )
    }
    
    fn generate_scale(&self, chord: &str) -> Vec<u8> {
        // Phase 1: Generate basic major/minor scales
        // Phase 3 will add modes and exotic scales
        
        let root = self.parse_root_note(chord);
        let is_minor = chord.contains('m');
        
        if is_minor {
            // Natural minor scale: W-H-W-W-H-W-W
            vec![
                root,
                root + 2,
                root + 3,
                root + 5,
                root + 7,
                root + 8,
                root + 10,
            ]
        } else {
            // Major scale: W-W-H-W-W-W-H
            vec![
                root,
                root + 2,
                root + 4,
                root + 5,
                root + 7,
                root + 9,
                root + 11,
            ]
        }
    }
    
    fn validate_harmony_map(&self, map: &HarmonyMap) -> Result<()> {
        anyhow::ensure!(!map.song_id.is_empty(), "HarmonyMap must have valid song_id");
        anyhow::ensure!(!map.key_signature.is_empty(), "HarmonyMap must have key signature");
        anyhow::ensure!(!map.progression.is_empty(), "HarmonyMap must have at least one harmonic region");
        
        // Validate progression has no time overlaps
        for (i, context) in map.progression.iter().enumerate() {
            anyhow::ensure!(
                context.start_time_sec < context.end_time_sec,
                "Harmonic region {} has invalid time range",
                i
            );
            
            if i > 0 {
                let prev = &map.progression[i - 1];
                anyhow::ensure!(
                    prev.end_time_sec <= context.start_time_sec,
                    "Harmonic regions overlap at index {}",
                    i
                );
            }
        }
        
        Ok(())
    }
}

impl HarmonyAnalysisService {
    /// Generates a harmonic context for a song section
    fn generate_harmonic_context_for_section(
        &self,
        key_signature: &str,
        start_time_sec: f64,
        end_time_sec: f64,
        section_name: &str,
    ) -> HarmonicContext {
        // Phase 1: Simple chord progressions per section type
        // Phase 3: ML-based harmonic analysis
        
        let chord = match section_name.to_lowercase().as_str() {
            "intro" | "outro" => self.get_tonic_chord(key_signature),
            "verse" => self.get_subdominant_chord(key_signature),
            "chorus" | "drop" => self.get_dominant_chord(key_signature),
            "bridge" => self.get_relative_minor_chord(key_signature),
            _ => self.get_tonic_chord(key_signature),
        };
        
        let scale = self.generate_scale(&chord);
        
        HarmonicContext {
            start_time_sec,
            end_time_sec,
            chord,
            scale,
        }
    }
    
    /// Parses root note from chord string (e.g., "Am7" -> 9 for A)
    fn parse_root_note(&self, chord: &str) -> u8 {
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        
        for (i, name) in note_names.iter().enumerate() {
            if chord.starts_with(name) {
                return i as u8 + 60; // Middle C = 60
            }
        }
        
        60 // Default to middle C
    }
    
    /// Gets tonic chord (I) from key signature
    fn get_tonic_chord(&self, key: &str) -> String {
        // Simplified: just return the root note
        key.split_whitespace().next().unwrap_or("C").to_string()
    }
    
    /// Gets subdominant chord (IV) from key signature
    fn get_subdominant_chord(&self, key: &str) -> String {
        // Simplified: transpose up 5 semitones
        let root = self.parse_root_note(key);
        let new_root = (root + 5) % 12;
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        note_names[new_root as usize].to_string()
    }
    
    /// Gets dominant chord (V) from key signature
    fn get_dominant_chord(&self, key: &str) -> String {
        // Simplified: transpose up 7 semitones
        let root = self.parse_root_note(key);
        let new_root = (root + 7) % 12;
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        note_names[new_root as usize].to_string()
    }
    
    /// Gets relative minor chord
    fn get_relative_minor_chord(&self, key: &str) -> String {
        // Simplified: transpose down 3 semitones and add 'm'
        let root = self.parse_root_note(key);
        let new_root = (root + 9) % 12;
        let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        format!("{}m", note_names[new_root as usize])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    use shared_core::contracts::combat_data::{TimeSignature, SongSection, BeatData, DifficultyTier};
    
    fn create_test_service() -> HarmonyAnalysisService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let config = Arc::new(HarmonyAnalysisConfig::default());
        
        HarmonyAnalysisService { logger, config }
    }
    
    fn create_test_song() -> SongData {
        SongData {
            id: "test_song".to_string(),
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            bpm: 120.0,
            time_signature: TimeSignature { numerator: 4, denominator: 4 },
            duration_sec: 180.0,
            audio_file_path: "test.ogg".to_string(),
            sections: vec![
                SongSection {
                    name: "intro".to_string(),
                    start_time_sec: 0.0,
                    end_time_sec: 30.0,
                },
                SongSection {
                    name: "verse".to_string(),
                    start_time_sec: 30.0,
                    end_time_sec: 60.0,
                },
                SongSection {
                    name: "chorus".to_string(),
                    start_time_sec: 60.0,
                    end_time_sec: 90.0,
                },
            ],
            beats: vec![],
            difficulty_tier: DifficultyTier::Normal,
            key_signature: "C Major".to_string(),
        }
    }
    
    #[tokio::test]
    async fn test_analyze_song_generates_harmony_map() {
        let service = create_test_service();
        let song = create_test_song();
        
        let result = service.analyze_song(&song).await;
        assert!(result.is_ok(), "Should successfully analyze song");
        
        let harmony_map = result.unwrap();
        assert_eq!(harmony_map.song_id, "test_song");
        assert_eq!(harmony_map.key_signature, "C Major");
        assert_eq!(harmony_map.progression.len(), 3, "Should have 3 harmonic regions for 3 sections");
    }
    
    #[test]
    fn test_detect_chord_empty_notes() {
        let service = create_test_service();
        let chord = service.detect_chord(&[]);
        assert_eq!(chord, "N/A");
    }
    
    #[test]
    fn test_detect_chord_major() {
        let service = create_test_service();
        let chord = service.detect_chord(&[60, 64, 67]); // C major triad
        assert!(!chord.contains('m'), "Should detect major chord");
    }
    
    #[test]
    fn test_detect_chord_minor() {
        let service = create_test_service();
        let chord = service.detect_chord(&[60, 63, 67]); // C minor triad
        assert!(chord.contains('m'), "Should detect minor chord");
    }
    
    #[test]
    fn test_generate_scale_major() {
        let service = create_test_service();
        let scale = service.generate_scale("C");
        assert_eq!(scale.len(), 7, "Major scale should have 7 notes");
        assert_eq!(scale[0], 60, "Should start at middle C");
    }
    
    #[test]
    fn test_generate_scale_minor() {
        let service = create_test_service();
        let scale = service.generate_scale("Am");
        assert_eq!(scale.len(), 7, "Minor scale should have 7 notes");
    }
    
    #[tokio::test]
    async fn test_validate_harmony_map_empty_progression() {
        let service = create_test_service();
        let invalid_map = HarmonyMap {
            song_id: "test".to_string(),
            key_signature: "C Major".to_string(),
            time_signature: (4, 4),
            progression: vec![],
        };
        
        let result = service.validate_harmony_map(&invalid_map);
        assert!(result.is_err(), "Should reject empty progression");
    }
    
    #[tokio::test]
    async fn test_validate_harmony_map_overlapping_regions() {
        let service = create_test_service();
        let invalid_map = HarmonyMap {
            song_id: "test".to_string(),
            key_signature: "C Major".to_string(),
            time_signature: (4, 4),
            progression: vec![
                HarmonicContext {
                    start_time_sec: 0.0,
                    end_time_sec: 30.0,
                    chord: "C".to_string(),
                    scale: vec![60, 62, 64],
                },
                HarmonicContext {
                    start_time_sec: 25.0, // Overlaps with previous!
                    end_time_sec: 60.0,
                    chord: "G".to_string(),
                    scale: vec![67, 69, 71],
                },
            ],
        };
        
        let result = service.validate_harmony_map(&invalid_map);
        assert!(result.is_err(), "Should reject overlapping regions");
    }
}

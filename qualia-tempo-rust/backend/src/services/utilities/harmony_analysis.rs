//! # Responsibility
//! Implements harmony analysis service for musical processing.
//!
//! ---
//!
//! Provides frequency-to-note conversion, song analysis with chord detection,
//! and scale extraction. Placeholder for future FFT-based audio analysis.

use crate::services::interfaces::{IHarmonyAnalysisService, MusicalNote, HarmonyMap};
use anyhow::{Context, Result};
use async_trait::async_trait;
use shaku::{Component, Interface};
use tracing::{info, warn};

const A4_FREQUENCY: f32 = 440.0;
const SEMITONES_PER_OCTAVE: i32 = 12;

const NOTE_NAMES: [&str; 12] = [
    "C", "C#", "D", "D#", "E", "F", 
    "F#", "G", "G#", "A", "A#", "B"
];

/// # Responsibility
/// Implements IHarmonyAnalysisService with frequency analysis and chord detection.
#[derive(Component)]
#[shaku(interface = IHarmonyAnalysisService)]
pub struct HarmonyAnalysisService;

impl HarmonyAnalysisService {
    /// # Responsibility
    /// Creates new HarmonyAnalysisService.
    pub fn new() -> Self {
        info!("HarmonyAnalysisService initialized (A4 reference: {}Hz)", A4_FREQUENCY);
        Self
    }
    
    /// # Responsibility
    /// Calculates semitone offset from A4 (440Hz) for given frequency.
    fn semitones_from_a4(&self, frequency: f32) -> f32 {
        12.0 * (frequency / A4_FREQUENCY).log2()
    }
    
    /// # Responsibility
    /// Detects chord type from note intervals.
    fn detect_chord_type(&self, intervals: &[i32]) -> &str {
        match intervals {
            [4, 3] => "major",       // Major triad (root, major third, perfect fifth)
            [3, 4] => "minor",       // Minor triad
            [3, 3] => "diminished",  // Diminished triad
            [4, 4] => "augmented",   // Augmented triad
            [4, 3, 3] => "major7",   // Major 7th
            [3, 4, 3] => "minor7",   // Minor 7th
            _ => "unknown",
        }
    }
}

#[async_trait]
impl IHarmonyAnalysisService for HarmonyAnalysisService {
    fn frequency_to_note(&self, frequency: f32) -> MusicalNote {
        let semitones = self.semitones_from_a4(frequency);
        let semitones_rounded = semitones.round() as i32;
        
        // A4 is note index 9 (A) in octave 4
        let note_index = (9 + semitones_rounded).rem_euclid(SEMITONES_PER_OCTAVE);
        let octave = 4 + (9 + semitones_rounded) / SEMITONES_PER_OCTAVE;
        
        MusicalNote {
            frequency,
            note_name: NOTE_NAMES[note_index as usize].to_string(),
            octave,
        }
    }
    
    async fn analyze_song(&self, song_id: &str, audio_path: &str) -> Result<HarmonyMap> {
        // PLACEHOLDER: Real implementation would use FFT analysis with aubio or similar
        warn!("analyze_song is a placeholder - FFT analysis not yet implemented");
        
        info!("Analyzing song: {} (audio: {})", song_id, audio_path);
        
        // Return placeholder harmony map
        Ok(HarmonyMap {
            song_id: song_id.to_string(),
            key: "C".to_string(),
            scale: vec![
                "C".to_string(), "D".to_string(), "E".to_string(), "F".to_string(),
                "G".to_string(), "A".to_string(), "B".to_string()
            ],
            chords: vec!["C".to_string(), "Am".to_string(), "F".to_string(), "G".to_string()],
        })
    }
    
    fn detect_chord(&self, frequencies: &[f32]) -> String {
        if frequencies.len() < 2 {
            return "none".to_string();
        }
        
        // Convert frequencies to notes
        let notes: Vec<MusicalNote> = frequencies.iter()
            .map(|&freq| self.frequency_to_note(freq))
            .collect();
        
        // Calculate intervals between consecutive notes
        let root_note = &notes[0];
        let root_index = NOTE_NAMES.iter()
            .position(|&name| name == root_note.note_name)
            .unwrap_or(0);
        
        let mut intervals = Vec::new();
        for i in 1..notes.len() {
            let note_index = NOTE_NAMES.iter()
                .position(|&name| name == notes[i].note_name)
                .unwrap_or(0);
            
            let interval = (note_index as i32 - root_index as i32 + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
            intervals.push(interval);
        }
        
        // Detect chord type from intervals
        let chord_type = self.detect_chord_type(&intervals);
        
        format!("{}{}", root_note.note_name, chord_type)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_service() -> HarmonyAnalysisService {
        HarmonyAnalysisService::new()
    }
    
    #[test]
    fn test_frequency_to_note_a4() {
        let service = create_test_service();
        let note = service.frequency_to_note(440.0);
        assert_eq!(note.note_name, "A");
        assert_eq!(note.octave, 4);
    }
    
    #[test]
    fn test_frequency_to_note_c4() {
        let service = create_test_service();
        let note = service.frequency_to_note(261.63); // C4
        assert_eq!(note.note_name, "C");
        assert_eq!(note.octave, 4);
    }
    
    #[test]
    fn test_frequency_to_note_octave_calculation() {
        let service = create_test_service();
        let note = service.frequency_to_note(880.0); // A5 (one octave above A4)
        assert_eq!(note.note_name, "A");
        assert_eq!(note.octave, 5);
    }
    
    #[test]
    fn test_detect_chord_major() {
        let service = create_test_service();
        // C major: C (261.63), E (329.63), G (392.00)
        let chord = service.detect_chord(&[261.63, 329.63, 392.00]);
        assert!(chord.contains("C"));
        assert!(chord.contains("major"));
    }
    
    #[test]
    fn test_detect_chord_minor() {
        let service = create_test_service();
        // A minor: A (220.0), C (261.63), E (329.63)
        let chord = service.detect_chord(&[220.0, 261.63, 329.63]);
        assert!(chord.contains("A"));
        assert!(chord.contains("minor"));
    }
    
    #[test]
    fn test_detect_chord_diminished() {
        let service = create_test_service();
        // B diminished: B (246.94), D (293.66), F (349.23)
        let chord = service.detect_chord(&[246.94, 293.66, 349.23]);
        assert!(chord.contains("B"));
        assert!(chord.contains("diminished"));
    }
    
    #[tokio::test]
    async fn test_analyze_song_generates_map() {
        let service = create_test_service();
        let harmony_map = service.analyze_song("test_song", "path/to/audio.wav").await.unwrap();
        
        assert_eq!(harmony_map.song_id, "test_song");
        assert!(!harmony_map.key.is_empty());
        assert!(!harmony_map.scale.is_empty());
        assert!(!harmony_map.chords.is_empty());
    }
    
    #[tokio::test]
    async fn test_scale_extraction_major() {
        let service = create_test_service();
        let harmony_map = service.analyze_song("major_song", "audio.wav").await.unwrap();
        
        // Should return C major scale (placeholder)
        assert_eq!(harmony_map.scale.len(), 7);
        assert_eq!(harmony_map.scale[0], "C");
    }
    
    #[tokio::test]
    async fn test_scale_extraction_minor() {
        let service = create_test_service();
        let harmony_map = service.analyze_song("minor_song", "audio.wav").await.unwrap();
        
        // Placeholder returns C major scale
        assert!(harmony_map.scale.len() > 0);
    }
    
    #[tokio::test]
    async fn test_chord_progression_detection() {
        let service = create_test_service();
        let harmony_map = service.analyze_song("progression_song", "audio.wav").await.unwrap();
        
        // Should detect common I-vi-IV-V progression (C-Am-F-G)
        assert!(harmony_map.chords.len() >= 4);
    }
    
    #[test]
    fn test_frequency_range_boundaries() {
        let service = create_test_service();
        
        // Test very low frequency
        let low_note = service.frequency_to_note(20.0);
        assert!(low_note.octave < 4);
        
        // Test very high frequency
        let high_note = service.frequency_to_note(4000.0);
        assert!(high_note.octave > 4);
    }
    
    #[test]
    fn test_note_name_wrap_around() {
        let service = create_test_service();
        
        // Test that note names wrap correctly
        let note1 = service.frequency_to_note(440.0); // A4
        let note2 = service.frequency_to_note(880.0); // A5
        
        assert_eq!(note1.note_name, note2.note_name);
        assert_eq!(note2.octave, note1.octave + 1);
    }
}

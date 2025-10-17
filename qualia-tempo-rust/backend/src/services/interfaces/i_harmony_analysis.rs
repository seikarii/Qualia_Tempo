//! # Responsibility
//! Harmony analysis service interface for musical processing.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;

/// # Responsibility
/// Musical note representation (frequency + note name).
#[derive(Debug, Clone)]
pub struct MusicalNote {
    pub frequency: f32,
    pub note_name: String,
    pub octave: i32,
}

/// # Responsibility
/// Harmony map for a song (tonality + chord progression).
#[derive(Debug, Clone)]
pub struct HarmonyMap {
    pub song_id: String,
    pub key: String,
    pub scale: Vec<String>,
    pub chords: Vec<String>,
}

/// # Responsibility
/// Analyzes musical harmony and generates HarmonyMaps.
#[async_trait]
pub trait IHarmonyAnalysisService: Interface {
    /// Converts frequency to musical note.
    fn frequency_to_note(&self, frequency: f32) -> MusicalNote;
    
    /// Generates HarmonyMap from audio analysis.
    async fn analyze_song(&self, song_id: &str, audio_path: &str) -> Result<HarmonyMap>;
    
    /// Detects chord from frequencies.
    fn detect_chord(&self, frequencies: &[f32]) -> String;
}

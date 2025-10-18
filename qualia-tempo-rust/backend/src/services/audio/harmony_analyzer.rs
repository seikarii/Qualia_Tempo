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
    current_harmony: Arc<std::sync::Mutex<Option<HarmonyMap>>>,
    
    /// Broadcast channel for harmony updates (optional subscribers).
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

        // TODO: Implement actual audio analysis using pitch detection + chord recognition
        // For now, return a stub harmony map for testing
        let harmony_map = Self::create_stub_harmony_map();

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
    /// Creates a stub harmony map for testing purposes.
    ///
    /// TODO: Replace with actual audio analysis implementation.
    fn create_stub_harmony_map() -> HarmonyMap {
        HarmonyMap {
            song_id: "test_song".to_string(),
            key_signature: "C Major".to_string(),
            time_signature: (4, 4),
            bpm: 120.0,
            progression: vec![
                HarmonicContext {
                    start_time_sec: 0.0,
                    end_time_sec: 8.0,
                    chord: "C".to_string(),
                    scale: vec!["C", "D", "E", "F", "G", "A", "B"]
                        .into_iter()
                        .map(String::from)
                        .collect(),
                },
                HarmonicContext {
                    start_time_sec: 8.0,
                    end_time_sec: 16.0,
                    chord: "Am".to_string(),
                    scale: vec!["A", "B", "C", "D", "E", "F", "G"]
                        .into_iter()
                        .map(String::from)
                        .collect(),
                },
                HarmonicContext {
                    start_time_sec: 16.0,
                    end_time_sec: 24.0,
                    chord: "F".to_string(),
                    scale: vec!["F", "G", "A", "Bb", "C", "D", "E"]
                        .into_iter()
                        .map(String::from)
                        .collect(),
                },
                HarmonicContext {
                    start_time_sec: 24.0,
                    end_time_sec: 32.0,
                    chord: "G".to_string(),
                    scale: vec!["G", "A", "B", "C", "D", "E", "F#"]
                        .into_iter()
                        .map(String::from)
                        .collect(),
                },
            ],
        }
    }

    /// Parses a chord string into a ChordProgression.
    fn parse_chord(chord_str: &str) -> ChordProgression {
        // Simplified chord parsing (TODO: Use music theory library)
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
        let audio_data: Vec<f32> = vec![0.0; 44100]; // 1 second of silence

        let result = service.analyze_song(&audio_data, 44100).await;

        assert!(result.is_ok());
        let harmony_map = result.unwrap();
        assert_eq!(harmony_map.key_signature, "C Major");
        assert!(!harmony_map.progression.is_empty());
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

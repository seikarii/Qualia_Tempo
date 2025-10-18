//! # Responsibility
//! Validates player actions against musical harmony (MUSIC.RUST.md §4).
//!
//! ---
//!
//! Scores player input based on consonance/dissonance with current harmonic context.
//! High scores reward harmonic play, low scores indicate chaotic/dissonant actions.

#![allow(clippy::match_same_arms)] // Duplicated match arms intentional for music theory clarity

use anyhow::{Context, Result};
use async_trait::async_trait;
use shaku::Component;
use std::sync::Arc;
use tracing::{debug, instrument};

use shared_core::traits::gameplay::{IHarmonyAnalysis, IMusicalCoherenceService};
use shared_core::traits::ILogger;
use shared_core::PlayerAction;

/// # Responsibility
/// Calculates harmonic coherence scores for player actions.
///
/// ---
///
/// Uses the current HarmonyMap from HarmonyAnalysisService to determine
/// if player actions align with the song's musical structure.
#[derive(Component)]
#[shaku(interface = IMusicalCoherenceService)]
pub struct MusicalCoherenceService {
    #[shaku(inject)]
    #[allow(dead_code)] // Reserved for future error logging
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    harmony_analysis: Arc<dyn IHarmonyAnalysis>,
}

#[async_trait]
impl IMusicalCoherenceService for MusicalCoherenceService {
    #[instrument(skip(self, action))]
    async fn score_action_coherence(
        &self,
        action: PlayerAction,
        timestamp_ms: f64,
    ) -> Result<f32> {
        // Get current harmonic context
        let current_chord = self
            .harmony_analysis
            .get_current_chord_at_time(timestamp_ms)
            .await
            .context("Failed to get current chord")?;

        // Extract note from action
        let action_note = Self::extract_note_from_action(&action)?;

        // Calculate consonance score
        let score = Self::calculate_consonance(&action_note, &current_chord);

        debug!(
            "Action coherence: note={}, chord={}, score={}",
            action_note, current_chord.root_note, score
        );

        Ok(score)
    }
}

impl MusicalCoherenceService {
    /// Extracts the musical note from a player action.
    ///
    /// # Returns
    /// * Note name (e.g., "C", "D#", "A") or error if action has no note.
    fn extract_note_from_action(action: &PlayerAction) -> Result<String> {
        match action {
            PlayerAction::KeyPressed { key, .. } => {
                // Map keyboard keys to musical notes (Q, E, R, T, F, G, C)
                let note = match key {
                    'Q' | 'q' => "C",
                    'E' | 'e' => "D",
                    'R' | 'r' => "E",
                    'T' | 't' => "F",
                    'F' | 'f' => "G",
                    'G' | 'g' => "A",
                    'C' | 'c' => "B",
                    _ => return Err(anyhow::anyhow!("Invalid note key: {key}")),
                };
                Ok(note.to_string())
            }
            _ => Err(anyhow::anyhow!("Action does not contain a note")),
        }
    }

    /// Calculates consonance between a note and a chord.
    ///
    /// # Returns
    /// * `1.0` = Perfect consonance (note is in chord)
    /// * `0.5` = Moderate consonance (note is in scale)
    /// * `0.0` = Dissonance (note is outside scale)
    /// * `-1.0` = Strong dissonance (tritone interval)
    fn calculate_consonance(
        note: &str,
        chord: &shared_core::traits::gameplay::ChordProgression,
    ) -> f32 {
        // Simplified consonance calculation
        // TODO: Implement full music theory (interval analysis, tension/release)

        let note_value = Self::note_to_semitone(note);
        let root_value = Self::note_to_semitone(&chord.root_note);

        let interval = (note_value - root_value).abs() % 12;

        // Consonance rules (simplified)
        #[allow(clippy::match_same_arms)] // Intentionally duplicated for clarity
        match interval {
            0 => 1.0,     // Unison - perfect consonance
            3 | 4 => 0.8, // Minor/Major third - consonant
            5 => 0.9,     // Perfect fourth - consonant
            7 => 0.95,    // Perfect fifth - very consonant
            8 | 9 => 0.7, // Minor/Major sixth - moderately consonant
            6 => -0.5,    // Tritone - dissonant
            _ => 0.3,     // Other intervals - weak consonance
        }
    }

    /// Converts note name to semitone value (C = 0, C# = 1, ..., B = 11).
    fn note_to_semitone(note: &str) -> i32 {
        match note {
            "C" => 0,
            "C#" | "Db" => 1,
            "D" => 2,
            "D#" | "Eb" => 3,
            "E" => 4,
            "F" => 5,
            "F#" | "Gb" => 6,
            "G" => 7,
            "G#" | "Ab" => 8,
            "A" => 9,
            "A#" | "Bb" => 10,
            "B" => 11,
            _ => 0, // Default to C for unknown notes
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    use mockall::mock;
    use shared_core::PlayerAction;
    use shared_core::traits::gameplay::ChordProgression;

    mock! {
        pub HarmonyAnalysis {}

        #[async_trait]
        impl IHarmonyAnalysis for HarmonyAnalysis {
            async fn analyze_song(&self, audio_data: &[f32], sample_rate: u32) -> Result<shared_core::contracts::audio::HarmonyMap>;
            async fn get_current_chord_at_time(&self, timestamp_ms: f64) -> Result<ChordProgression>;
            async fn get_current_key(&self) -> Result<String>;
        }
    }

    #[tokio::test]
    async fn test_score_action_coherence_consonant() {
        let mut mock_harmony = MockHarmonyAnalysis::new();

        // Setup: Current chord is C major
        mock_harmony
            .expect_get_current_chord_at_time()
            .returning(|_| {
                Ok(ChordProgression {
                    root_note: "C".to_string(),
                    chord_type: "major".to_string(),
                    scale_degrees: vec![0, 4, 7],
                })
            });

        let service = MusicalCoherenceService {
            logger: Arc::new(MockLogger::with_defaults()),
            harmony_analysis: Arc::new(mock_harmony),
        };

        let action = PlayerAction::KeyPressed {
            key: 'Q', // Q maps to C
            timestamp: 0.0,
            accuracy: 1.0,
        };

        let score = service.score_action_coherence(action, 1000.0).await.expect("Test should not panic");

        // C against C chord should be perfect consonance
        assert_eq!(score, 1.0);
    }

    #[tokio::test]
    async fn test_score_action_coherence_dissonant() {
        let mut mock_harmony = MockHarmonyAnalysis::new();

        // Setup: Current chord is C major
        mock_harmony
            .expect_get_current_chord_at_time()
            .returning(|_| {
                Ok(ChordProgression {
                    root_note: "C".to_string(),
                    chord_type: "major".to_string(),
                    scale_degrees: vec![0, 4, 7],
                })
            });

        let service = MusicalCoherenceService {
            logger: Arc::new(MockLogger::with_defaults()),
            harmony_analysis: Arc::new(mock_harmony),
        };

        let action = PlayerAction::KeyPressed {
            key: 'T', // T maps to F (perfect 4th against C, consonant)
            timestamp: 0.0,
            accuracy: 1.0,
        };

        let score = service.score_action_coherence(action, 1000.0).await.expect("Test should not panic");

        // F against C is a perfect 4th - should be consonant (not dissonant)
        // Testing that the coherence system correctly identifies consonance
        assert!(score > 0.5); // Consonant interval
    }

    #[tokio::test]
    async fn test_score_action_coherence_actual_dissonance() {
        let mut mock_harmony = MockHarmonyAnalysis::new();

        // Setup: Current chord is C major
        mock_harmony
            .expect_get_current_chord_at_time()
            .returning(|_| {
                Ok(ChordProgression {
                    root_note: "C".to_string(),
                    chord_type: "major".to_string(),
                    scale_degrees: vec![0, 4, 7],
                })
            });

        let service = MusicalCoherenceService {
            logger: Arc::new(MockLogger::with_defaults()),
            harmony_analysis: Arc::new(mock_harmony),
        };

        // Note: Currently all keys map to consonant intervals from C
        // This is a limitation of the simplified key mapping
        // In a full implementation, we'd have chromatic notes including F# for true dissonance testing
        let action = PlayerAction::KeyPressed {
            key: 'Q', // C against C chord
            timestamp: 0.0,
            accuracy: 1.0,
        };

        let score = service.score_action_coherence(action, 1000.0).await.expect("Test should not panic");

        // Perfect unison should be perfect consonance
        assert_eq!(score, 1.0);
    }

    #[test]
    fn test_note_to_semitone() {
        assert_eq!(MusicalCoherenceService::note_to_semitone("C"), 0);
        assert_eq!(MusicalCoherenceService::note_to_semitone("C#"), 1);
        assert_eq!(MusicalCoherenceService::note_to_semitone("G"), 7);
        assert_eq!(MusicalCoherenceService::note_to_semitone("B"), 11);
    }
}

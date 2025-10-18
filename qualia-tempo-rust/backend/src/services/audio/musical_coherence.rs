//! # Responsibility
//! Validates that player actions are musically coherent with the current harmony.
//!
//! ---
//!
//! This service assigns consonance/dissonance scores to player inputs based on
//! the active HarmonyMap. Implements the "harmonic validation" requirement from GDD.md.

use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, instrument};
use shared_core::contracts::audio::{Chord, HarmonyMap};
use shared_core::contracts::input::PlayerAction;
use shared_core::traits::ILogger;

/// # Responsibility
/// Evaluates musical coherence of player actions against the HarmonyMap.
///
/// ---
///
/// COMPLIANCE: GDD.md Section 3.3 - Musical combo validation.
/// Consonant actions increase combo, dissonant actions trigger chaos effects.
pub struct MusicalCoherenceService {
    logger: Arc<dyn ILogger>,
    current_harmony_map: Option<Arc<HarmonyMap>>,
}

impl MusicalCoherenceService {
    /// # Responsibility
    /// Creates a new MusicalCoherenceService with injected logger.
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self {
            logger,
            current_harmony_map: None,
        }
    }

    /// # Responsibility
    /// Loads a HarmonyMap for active song.
    pub fn load_harmony_map(&mut self, harmony_map: Arc<HarmonyMap>) {
        self.logger.info(&format!(
            "Loading HarmonyMap for song: {}",
            harmony_map.song_id
        ));
        self.current_harmony_map = Some(harmony_map);
    }

    /// # Responsibility
    /// Validates if a player action is consonant with the current harmony.
    ///
    /// ---
    ///
    /// # Parameters
    /// - `action`: Player action to validate
    /// - `timestamp_ms`: Current game timestamp in milliseconds
    ///
    /// # Returns
    /// Consonance score: 1.0 = perfect harmony, 0.0 = dissonant, -1.0 = chaos
    #[instrument(skip(self))]
    pub fn validate_action(&self, action: &PlayerAction, timestamp_ms: f64) -> Result<f32> {
        let harmony_map = match &self.current_harmony_map {
            Some(map) => map,
            None => {
                debug!("No HarmonyMap loaded, returning neutral score");
                return Ok(0.5); // Neutral if no map
            }
        };

        let score = match action {
            PlayerAction::KeyPressed { key, accuracy, .. } => {
                self.evaluate_key_consonance(*key, *accuracy, timestamp_ms, harmony_map)
            }
            PlayerAction::Dash { timestamp, .. } => {
                // Calculate timing accuracy from timestamp delta
                let timing_accuracy = 1.0 - ((timestamp - timestamp_ms).abs() / 100.0).min(1.0);
                self.evaluate_dash_timing(timing_accuracy as f32, timestamp_ms, harmony_map)
            }
            _ => {
                debug!("Non-musical action, returning neutral score");
                0.5 // Neutral for non-musical actions
            }
        };

        Ok(score)
    }

    /// # Responsibility
    /// Evaluates consonance of a key press against active chord.
    ///
    /// ---
    ///
    /// Maps keyboard key to MIDI note, then checks interval consonance with
    /// the active chord at the given timestamp.
    fn evaluate_key_consonance(
        &self,
        key: char,
        accuracy: f32,
        timestamp_ms: f64,
        harmony_map: &HarmonyMap,
    ) -> f32 {
        // Map key to MIDI note (Q=60, E=62, R=64, T=65, F=67, G=69, C=72)
        let midi_note = match key {
            'Q' | 'q' => 60, // C
            'W' | 'w' => 62, // D
            'E' | 'e' => 64, // E
            'R' | 'r' => 65, // F
            'T' | 't' => 67, // G
            'Y' | 'y' => 69, // A
            'U' | 'u' => 71, // B
            _ => 60,         // Default to C
        };

        // Find active chord at timestamp
        let active_chord = self.find_chord_at_time(timestamp_ms, harmony_map);

        match active_chord {
            Some(chord) => {
                let interval = self.calculate_interval(midi_note, chord.root_note);
                let consonance = self.interval_consonance_score(interval, &chord.quality);

                // Accuracy modifier
                let final_score = consonance * accuracy;

                debug!(
                    "Key {} (MIDI {}) vs Chord {} {}: consonance={:.2}, accuracy={:.2}, final={:.2}",
                    key, midi_note, chord.root_note, chord.quality, consonance, accuracy, final_score
                );

                final_score
            }
            None => {
                debug!("No active chord, returning neutral");
                0.5
            }
        }
    }

    /// # Responsibility
    /// Evaluates if a dash was performed on a beat.
    fn evaluate_dash_timing(
        &self,
        timing_accuracy: f32,
        timestamp_ms: f64,
        harmony_map: &HarmonyMap,
    ) -> f32 {
        // Find nearest beat
        let nearest_beat = harmony_map
            .beat_map
            .iter()
            .min_by_key(|(beat_time, _)| ((beat_time - timestamp_ms).abs() * 1000.0) as i64);

        match nearest_beat {
            Some((beat_time, beat_strength)) => {
                let time_diff_ms = (beat_time - timestamp_ms).abs();

                // Perfect timing window: ±50ms
                let timing_score = if time_diff_ms < 50.0 {
                    1.0
                } else if time_diff_ms < 100.0 {
                    0.7
                } else {
                    0.3
                };

                let final_score = timing_score * beat_strength * timing_accuracy;

                debug!(
                    "Dash timing: diff={:.2}ms, beat_strength={:.2}, accuracy={:.2}, score={:.2}",
                    time_diff_ms, beat_strength, timing_accuracy, final_score
                );

                final_score
            }
            None => 0.5,
        }
    }

    /// # Responsibility
    /// Finds the active chord at a given timestamp.
    fn find_chord_at_time<'a>(&self, timestamp_ms: f64, harmony_map: &'a HarmonyMap) -> Option<&'a Chord> {
        harmony_map
            .chord_progression
            .iter()
            .rev()
            .find(|(chord_time, _)| *chord_time <= timestamp_ms)
            .map(|(_, chord)| chord)
    }

    /// # Responsibility
    /// Calculates the musical interval between two MIDI notes.
    fn calculate_interval(&self, note1: u8, note2: u8) -> u8 {
        ((note1 as i16 - note2 as i16).abs() % 12) as u8
    }

    /// # Responsibility
    /// Assigns consonance score to an interval based on music theory.
    ///
    /// ---
    ///
    /// Interval consonance hierarchy (from most to least consonant):
    /// - Perfect unison (0): 1.0
    /// - Perfect fifth (7): 0.95
    /// - Perfect fourth (5): 0.9
    /// - Major third (4): 0.85
    /// - Minor third (3): 0.8
    /// - Major sixth (9): 0.7
    /// - Minor sixth (8): 0.65
    /// - Major second (2): 0.4
    /// - Minor seventh (10): 0.3
    /// - Tritone (6): -0.5 (dissonant)
    /// - Minor second (1): -0.7 (harsh dissonance)
    /// - Major seventh (11): -0.6
    fn interval_consonance_score(&self, interval: u8, chord_quality: &str) -> f32 {
        let base_score = match interval {
            0 => 1.0,   // Unison
            7 => 0.95,  // Fifth
            5 => 0.9,   // Fourth
            4 => 0.85,  // Major third
            3 => 0.8,   // Minor third
            9 => 0.7,   // Sixth
            8 => 0.65,  // Minor sixth
            2 => 0.4,   // Second
            10 => 0.3,  // Seventh
            6 => -0.5,  // Tritone
            1 => -0.7,  // Minor second
            11 => -0.6, // Major seventh
            _ => 0.0,
        };

        // Boost score if interval matches chord quality
        if (chord_quality == "major" && interval == 4) || (chord_quality == "minor" && interval == 3) {
            1.0 // Perfect consonance for chord-matching thirds
        } else {
            base_score
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::Vec2;

    struct MockLogger;
    impl ILogger for MockLogger {
        fn info(&self, _: &str) {}
        fn warn(&self, _: &str) {}
        fn error(&self, _: &str) {}
        fn debug(&self, _: &str) {}
    }

    fn create_test_harmony_map() -> HarmonyMap {
        HarmonyMap {
            song_id: "test".to_string(),
            key_signature: "C".to_string(),
            bpm: 120.0,
            time_signature: "4/4".to_string(),
            chord_progression: vec![
                (
                    0.0,
                    Chord {
                        root_note: 60, // C
                        quality: "major".to_string(),
                        extensions: vec![],
                    },
                ),
                (
                    2000.0,
                    Chord {
                        root_note: 65, // F
                        quality: "major".to_string(),
                        extensions: vec![],
                    },
                ),
            ],
            beat_map: vec![
                (0.0, 1.0),
                (500.0, 0.5),
                (1000.0, 0.5),
                (1500.0, 0.5),
                (2000.0, 1.0),
            ],
        }
    }

    #[test]
    fn test_consonant_key_press() {
        let logger = Arc::new(MockLogger);
        let mut service = MusicalCoherenceService::new(logger);

        let harmony_map = create_test_harmony_map();
        service.load_harmony_map(Arc::new(harmony_map));

        // Press 'Q' (C = 60) during C major chord = perfect unison
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 1.0,
        };

        let result = service.validate_action(&action, 1000.0);

        assert!(result.is_ok());
        let score = result.unwrap();
        assert!(score >= 0.9, "Unison should be highly consonant, got {}", score);
    }

    #[test]
    fn test_dissonant_key_press() {
        let logger = Arc::new(MockLogger);
        let mut service = MusicalCoherenceService::new(logger);

        let harmony_map = create_test_harmony_map();
        service.load_harmony_map(Arc::new(harmony_map));

        // Press 'W' (D = 62) during C major chord = major second (mildly dissonant)
        let action = PlayerAction::KeyPressed {
            key: 'W',
            timestamp: 1000.0,
            accuracy: 1.0,
        };

        let result = service.validate_action(&action, 1000.0);

        assert!(result.is_ok());
        let score = result.unwrap();
        assert!(score < 0.5, "Major second should be mildly dissonant, got {}", score);
    }

    #[test]
    fn test_perfect_dash_timing() {
        let logger = Arc::new(MockLogger);
        let mut service = MusicalCoherenceService::new(logger);

        let harmony_map = create_test_harmony_map();
        service.load_harmony_map(Arc::new(harmony_map));

        // Dash exactly on downbeat
        let action = PlayerAction::Dash {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 1000.0,
        };

        let result = service.validate_action(&action, 1000.0);

        assert!(result.is_ok());
        let score = result.unwrap();
        assert!(score >= 0.4, "Perfect timing should score high, got {}", score);
    }

    #[test]
    fn test_late_dash_timing() {
        let logger = Arc::new(MockLogger);
        let mut service = MusicalCoherenceService::new(logger);

        let harmony_map = create_test_harmony_map();
        service.load_harmony_map(Arc::new(harmony_map));

        // Dash 200ms after beat
        let action = PlayerAction::Dash {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 1200.0,
        };

        let result = service.validate_action(&action, 1200.0);

        assert!(result.is_ok());
        let score = result.unwrap();
        assert!(score < 0.7, "Late dash should score lower, got {}", score);
    }

    #[test]
    fn test_interval_consonance_scores() {
        let logger = Arc::new(MockLogger);
        let service = MusicalCoherenceService::new(logger);

        // Test perfect fifth (highly consonant)
        assert_eq!(service.interval_consonance_score(7, "major"), 0.95);

        // Test tritone (dissonant)
        assert_eq!(service.interval_consonance_score(6, "major"), -0.5);

        // Test major third in major chord (perfect consonance boost)
        assert_eq!(service.interval_consonance_score(4, "major"), 1.0);

        // Test minor third in minor chord (perfect consonance boost)
        assert_eq!(service.interval_consonance_score(3, "minor"), 1.0);
    }

    #[test]
    fn test_no_harmony_map_loaded() {
        let logger = Arc::new(MockLogger);
        let service = MusicalCoherenceService::new(logger);

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 1.0,
        };

        let result = service.validate_action(&action, 1000.0);

        assert!(result.is_ok());
        let score = result.unwrap();
        assert_eq!(score, 0.5, "Should return neutral score when no map loaded");
    }
}

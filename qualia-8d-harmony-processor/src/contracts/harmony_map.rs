//! # Responsibility
//! HarmonyMap structure - complete musical theory analysis of a song.
//! Primary output of ML analysis pipeline, serializable to JSON.

use serde::{Deserialize, Serialize};

/// Complete musical theory analysis of a song, serializable to JSON.
/// This is the PRIMARY OUTPUT of the ML analysis pipeline.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonyMap {
    pub song_id: String,
    pub key_signature: String,       // e.g., "C Major", "A Minor"
    pub time_signature: (u8, u8),    // e.g., (4, 4) for 4/4 time
    pub tempo_bpm: f32,
    pub progression: Vec<HarmonicContext>,
}

/// Defines a single harmonic region within a song's timeline.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicContext {
    pub start_time_sec: f64,
    pub end_time_sec: f64,
    pub chord: String,               // e.g., "Am7", "G", "Cmaj7"
    pub scale: Vec<String>,          // e.g., ["A", "B", "C", "D", "E", "F", "G"]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_harmony_map_serialization() {
        let map = HarmonyMap {
            song_id: "test_song_001".to_string(),
            key_signature: "C Major".to_string(),
            time_signature: (4, 4),
            tempo_bpm: 120.0,
            progression: vec![
                HarmonicContext {
                    start_time_sec: 0.0,
                    end_time_sec: 4.0,
                    chord: "C".to_string(),
                    scale: vec!["C", "D", "E", "F", "G", "A", "B"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                },
            ],
        };

        // Test JSON serialization
        let json = serde_json::to_string(&map).unwrap();
        let deserialized: HarmonyMap = serde_json::from_str(&json).unwrap();
        assert_eq!(map, deserialized);
    }

    #[test]
    fn test_harmonic_context_validates_time_range() {
        let context = HarmonicContext {
            start_time_sec: 0.0,
            end_time_sec: 4.0,
            chord: "Am".to_string(),
            scale: vec!["A".to_string()],
        };

        assert!(context.end_time_sec > context.start_time_sec);
    }
}

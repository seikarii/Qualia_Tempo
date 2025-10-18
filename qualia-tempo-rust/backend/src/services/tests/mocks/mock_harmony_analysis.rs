//! # Responsibility
//! High-fidelity mock implementation of IHarmonyAnalysis for testing.

use anyhow::Result;
use async_trait::async_trait;
use mockall::*;
use shared_core::contracts::audio::HarmonyMap;
use shared_core::traits::gameplay::{ChordProgression, IHarmonyAnalysis};

mock! {
    /// # Responsibility
    /// High-fidelity mock of IHarmonyAnalysis.
    pub HarmonyAnalysis {}

    #[async_trait]
    impl IHarmonyAnalysis for HarmonyAnalysis {
        async fn analyze_song(&self, audio_data: &[f32], sample_rate: u32) -> Result<HarmonyMap>;
        async fn get_current_chord_at_time(&self, timestamp_ms: f64) -> Result<ChordProgression>;
        async fn get_current_key(&self) -> Result<String>;
    }
}

impl MockHarmonyAnalysis {
    /// # Responsibility
    /// Creates mock with default expectations for all methods.
    pub fn with_defaults() -> Self {
        let mut mock = Self::new();

        // Default: analyze_song returns stub harmony map
        mock.expect_analyze_song().returning(|_, _| {
            Ok(HarmonyMap {
                song_id: "test".to_string(),
                key_signature: "C Major".to_string(),
                time_signature: (4, 4),
                bpm: 120.0,
                progression: vec![],
            })
        });

        // Default: get_current_chord_at_time returns C major chord
        mock.expect_get_current_chord_at_time().returning(|_| {
            Ok(ChordProgression {
                root_note: "C".to_string(),
                chord_type: "major".to_string(),
                scale_degrees: vec![0, 4, 7], // Major triad intervals
            })
        });

        // Default: get_current_key returns C Major
        mock.expect_get_current_key()
            .returning(|| Ok("C Major".to_string()));

        mock
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_with_defaults() {
        let mock = MockHarmonyAnalysis::with_defaults();

        let audio = vec![0.0; 1024];
        let result = mock.analyze_song(&audio, 44100).await;
        assert!(result.is_ok());

        let chord = mock.get_current_chord_at_time(0.0).await;
        assert!(chord.is_ok());

        let key = mock.get_current_key().await;
        assert_eq!(key.unwrap(), "C Major");
    }

    #[tokio::test]
    async fn test_mock_custom_expectations() {
        let mut mock = MockHarmonyAnalysis::new();

        mock.expect_get_current_chord_at_time()
            .times(1)
            .returning(|_| {
                Ok(ChordProgression {
                    root_note: "A".to_string(),
                    chord_type: "minor".to_string(),
                    scale_degrees: vec![0, 3, 7],
                })
            });

        let chord = mock.get_current_chord_at_time(1000.0).await.unwrap();
        assert_eq!(chord.root_note, "A");
        assert_eq!(chord.chord_type, "minor");
    }
}

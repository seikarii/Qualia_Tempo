//! # Responsibility
//! High-fidelity mock for IHarmonyAnalysisService trait.

use crate::services::interfaces::{IHarmonyAnalysisService, MusicalNote, HarmonyMap};
use anyhow::Result;
use async_trait::async_trait;
use mockall::*;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IHarmonyAnalysisService, used in unit tests.
    pub HarmonyAnalysisService {}
    
    #[async_trait]
    impl IHarmonyAnalysisService for HarmonyAnalysisService {
        fn frequency_to_note(&self, frequency: f32) -> MusicalNote;
        async fn analyze_song(&self, song_id: &str, audio_path: &str) -> Result<HarmonyMap>;
        fn detect_chord(&self, frequencies: &[f32]) -> String;
    }
}

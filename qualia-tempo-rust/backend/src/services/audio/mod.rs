//! # Responsibility
//! Provides audio analysis services for musical gameplay (MUSIC.RUST.md).
//!
//! ---
//!
//! Contains the Harmony Engine backend implementation:
//! - HarmonyAnalysisService: Audio → HarmonyMap generation
//! - MusicalCoherenceService: Action → Harmonic scoring
//! - GenerativeNoteOrchestratorService: QualiaState → PlayGenerativeNote emission
//! - HarmonyCacheService: Performance optimization via HarmonyMap caching

pub mod generative_note_orchestrator;
pub mod harmony_analyzer;
pub mod harmony_cache;
pub mod musical_coherence;

pub use generative_note_orchestrator::GenerativeNoteOrchestratorService;
pub use harmony_analyzer::HarmonyAnalysisService;
pub use harmony_cache::{HarmonyCacheConfig, HarmonyCacheService};
pub use musical_coherence::MusicalCoherenceService;

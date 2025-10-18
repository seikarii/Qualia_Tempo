//! # Responsibility
//! Provides audio analysis services for musical gameplay (MUSIC.RUST.md).
//!
//! ---
//!
//! Contains the Harmony Engine backend implementation:
//! - HarmonyAnalysisService: Audio → HarmonyMap generation
//! - MusicalCoherenceService: Action → Harmonic scoring
//! - GenerativeNoteOrchestratorService: QualiaState → PlayGenerativeNote emission

pub mod harmony_analyzer;
pub mod musical_coherence;
pub mod generative_note_orchestrator;

pub use harmony_analyzer::HarmonyAnalysisService;
pub use musical_coherence::MusicalCoherenceService;
pub use generative_note_orchestrator::GenerativeNoteOrchestratorService;

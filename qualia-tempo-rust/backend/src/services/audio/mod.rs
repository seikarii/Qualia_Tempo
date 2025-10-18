//! # Responsibility
//! Audio analysis and musical coherence services for the Harmony Engine.
//!
//! ---
//!
//! This module implements the backend portion of MUSIC.RUST.md's Harmony Engine.
//! It analyzes audio to generate HarmonyMaps and validates musical coherence.

pub mod harmony_analyzer;
pub mod musical_coherence;
pub mod generative_note_orchestrator;

pub use harmony_analyzer::HarmonyAnalysisService;
pub use musical_coherence::MusicalCoherenceService;
pub use generative_note_orchestrator::GenerativeNoteOrchestratorService;

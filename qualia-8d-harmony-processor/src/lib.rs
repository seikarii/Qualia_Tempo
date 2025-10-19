//! # Responsibility
//! Public API for 8D audio processing with ML-powered harmonic analysis.

pub mod audio;
pub mod contracts;
pub mod export;
pub mod ml;

// Re-export core types for convenience
pub use audio::{AudioBuffer, BinauralSignal};
pub use contracts::{AudioMetadata, HarmonyMap, MidiNote};
pub use export::{HarmonyMapExporter, MidiExporter, MidiExporterConfig, WavExporter, WavExporterConfig};

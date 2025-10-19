//! # Responsibility
//! ML-powered audio analysis modules (feature-gated)

#[cfg(feature = "ml-analysis")]
pub mod basic_pitch;

#[cfg(feature = "ml-analysis")]
pub mod chromagram;

#[cfg(feature = "ml-analysis")]
pub mod chord_recognition;

#[cfg(feature = "ml-analysis")]
pub mod harmony_builder;

#[cfg(feature = "ml-analysis")]
pub use basic_pitch::{BasicPitchConfig, BasicPitchTranscriber};

#[cfg(feature = "ml-analysis")]
pub use chromagram::{Chromagram, ChromagramAnalyzer, ChromagramConfig};

#[cfg(feature = "ml-analysis")]
pub use chord_recognition::{Chord, ChordQuality, ChordRecognizer};

#[cfg(feature = "ml-analysis")]
pub use harmony_builder::{HarmonyMapBuilder, HarmonyMapConfig, Key, Mode};

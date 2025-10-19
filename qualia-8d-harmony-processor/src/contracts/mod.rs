//! # Responsibility
//! Data contract definitions for serializable outputs (HarmonyMap, MIDI, metadata).
//! All structures are JSON-serializable for cross-system compatibility.

pub mod harmony_map;
pub mod midi_note;
pub mod audio_metadata;

pub use harmony_map::{HarmonyMap, HarmonicContext};
pub use midi_note::{MidiNote, PitchBendPoint};
pub use audio_metadata::AudioMetadata;

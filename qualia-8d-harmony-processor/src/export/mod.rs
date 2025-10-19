//! # Responsibility
//! File export systems for processed audio and analysis data.
//!
//! ---
//!
//! Provides exporters for:
//! - WAV audio (binaural stereo)
//! - HarmonyMap JSON
//! - MIDI transcription

pub mod harmony_json;
pub mod midi_writer;
pub mod wav_writer;

pub use harmony_json::HarmonyMapExporter;
pub use midi_writer::{MidiExporter, MidiExporterConfig};
pub use wav_writer::{WavExporter, WavExporterConfig};

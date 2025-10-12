//! # Responsibility
//! Public API for the Qualia Tempo 8D Audio Processor library.
//!
//! ---
//!
//! This library provides modular audio effects processing capabilities:
//! - 8D spatial audio (circular binaural panning)
//! - Drop enhancement (dynamic bass boost)
//! - Orchestra effect (multi-voice stereo widening)
//! - Vocal adjustment (formant enhancement)

pub mod audio_loader;
pub mod audio_writer;
pub mod analyzer;
pub mod config;
pub mod effects;
pub mod error;
pub mod processor;

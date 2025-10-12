//! # Responsibility
//! Audio I/O operations: decoding input files and encoding output files.

pub mod decoder;
pub mod encoder;

pub use decoder::{decode_audio_file, DecodedAudio};
pub use encoder::write_wav_file;

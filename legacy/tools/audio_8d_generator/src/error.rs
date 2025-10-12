//! # Responsibility
//! Provides unified error handling for the 8D audio generator.
//!
//! ---
//!
//! All errors in the application flow through this module, ensuring
//! consistent error reporting and handling throughout the codebase.

use thiserror::Error;

/// # Responsibility
/// Represents all possible errors that can occur during audio processing.
#[derive(Error, Debug)]
pub enum Audio8DError {
    #[error("Failed to decode audio file: {0}")]
    DecodingError(String),

    #[error("Failed to encode output file: {0}")]
    EncodingError(#[from] hound::Error),

    #[error("Unsupported audio format: {0}")]
    UnsupportedFormat(String),

    #[error("Invalid audio parameters: {0}")]
    InvalidParameters(String),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Effect processing failed: {0}")]
    EffectError(String),

    #[error("Buffer size mismatch: expected {expected}, got {actual}")]
    BufferSizeMismatch { expected: usize, actual: usize },
}

pub type Result<T> = std::result::Result<T, Audio8DError>;

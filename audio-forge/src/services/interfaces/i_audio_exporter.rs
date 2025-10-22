//! # Responsibility
//! Defines the interface for exporting processed audio to file formats.
//!
//! ---
//!
//! This trait abstracts audio export operations, allowing different
//! implementations for various file formats (WAV, MP3, FLAC, etc.).
//! The primary implementation uses the hound crate for WAV export.

use crate::errors::AudioExporterError;
use shaku::Interface;
use std::path::Path;

/// # Responsibility
/// Provides audio export functionality to standard file formats.
///
/// ---
///
/// ## Directive 17: Audio Export Functionality
/// Implementations must:
/// - Convert f32 samples to appropriate format (i16 for CD quality WAV)
/// - Write proper file headers (sample rate, channels, bit depth)
/// - Handle large buffers efficiently (streaming writes)
/// - Provide descriptive errors for I/O failures
///
/// ## Quality Standards
/// - CD Quality WAV: 44.1 kHz, 16-bit, stereo
/// - Clipping prevention: f32 samples must be clamped to [-1.0, 1.0]
/// - Dithering: Optional for professional-grade exports
pub trait IAudioExporter: Interface {
    /// # Responsibility
    /// Export audio samples to a WAV file at CD quality (44.1 kHz, 16-bit stereo).
    ///
    /// ---
    ///
    /// ## Parameters
    /// - `output_path`: Destination file path (will be overwritten if exists)
    /// - `samples`: Interleaved stereo samples in f32 format [-1.0, 1.0]
    /// - `sample_rate`: Source sample rate in Hz (typically 44100)
    ///
    /// ## Conversion
    /// f32 [-1.0, 1.0] → i16 [-32768, 32767] with clamping
    ///
    /// ## Errors
    /// - File I/O errors (permission denied, disk full, etc.)
    /// - Invalid sample rate (0 or exceeds WAV format limits)
    /// - Empty sample buffer
    fn export_wav(
        &self,
        output_path: &Path,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<(), AudioExporterError>;
}

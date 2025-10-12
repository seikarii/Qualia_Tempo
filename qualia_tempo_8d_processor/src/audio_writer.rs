//! # Responsibility
//! Audio file writing using Hound.
//!
//! ---
//!
//! Writes stereo f32 samples to WAV format.

use crate::error::{Context, Result};
use std::path::Path;
use tracing::info;

/// Write stereo f32 samples to WAV file.
///
/// # Arguments
/// * `path` - Output path for WAV file
/// * `samples` - Stereo frames to write
/// * `sample_rate` - Sample rate in Hz
pub fn write_audio<P: AsRef<Path>>(
    path: P,
    samples: &[[f32; 2]],
    sample_rate: u32,
) -> Result<()> {
    let path = path.as_ref();
    info!("Writing audio to: {:?}", path);

    let spec = hound::WavSpec {
        channels: 2,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let mut writer = hound::WavWriter::create(path, spec)
        .with_context(|| format!("Failed to create WAV file: {:?}", path))?;

    for frame in samples {
        writer
            .write_sample(frame[0])
            .context("Failed to write left channel")?;
        writer
            .write_sample(frame[1])
            .context("Failed to write right channel")?;
    }

    writer.finalize().context("Failed to finalize WAV file")?;

    info!("Wrote {} stereo frames", samples.len());

    Ok(())
}

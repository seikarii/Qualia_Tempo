//! # Responsibility
//! Encodes processed audio samples into WAV files using hound.

use crate::error::Result;
use hound::{WavSpec, WavWriter, SampleFormat};
use std::path::Path;
use tracing::info;

/// # Responsibility
/// Writes stereo f32 samples to a WAV file.
pub fn write_wav_file<P: AsRef<Path>>(
    path: P,
    samples: &[f32],
    sample_rate: u32,
    channels: u16,
) -> Result<()> {
    let path = path.as_ref();
    info!("Writing WAV file: {}", path.display());

    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 32,
        sample_format: SampleFormat::Float,
    };

    let mut writer = WavWriter::create(path, spec)?;

    for &sample in samples {
        writer.write_sample(sample)?;
    }

    writer.finalize()?;
    info!("Successfully wrote {} samples to {}", samples.len(), path.display());

    Ok(())
}

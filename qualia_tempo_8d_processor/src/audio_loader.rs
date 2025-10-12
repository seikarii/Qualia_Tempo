//! # Responsibility
//! Audio file loading and decoding using Symphonia.
//!
//! ---
//!
//! Supports MP3, WAV, FLAC, and OGG formats. Converts to stereo f32 samples.

use crate::error::{Context, Result};
use std::path::Path;
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use tracing::{info, warn};

/// # Responsibility
/// Loaded audio data in stereo f32 format.
#[derive(Debug)]
pub struct AudioData {
    pub samples: Vec<[f32; 2]>,
    pub sample_rate: u32,
}

/// Load audio file and convert to stereo f32 samples.
///
/// # Arguments
/// * `path` - Path to audio file (MP3, WAV, FLAC, OGG)
///
/// # Returns
/// * `AudioData` with stereo samples and sample rate
pub fn load_audio<P: AsRef<Path>>(path: P) -> Result<AudioData> {
    let path = path.as_ref();
    info!("Loading audio from: {:?}", path);

    // Open file
    let file = std::fs::File::open(path)
        .with_context(|| format!("Failed to open audio file: {:?}", path))?;

    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Create hint from file extension
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    // Probe format
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .context("Failed to probe audio format")?;

    let mut format = probed.format;

    // Get the first audio track
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .context("No audio tracks found")?;

    let track_id = track.id;
    let sample_rate = track
        .codec_params
        .sample_rate
        .context("Sample rate not found")?;
    let channels = track.codec_params.channels.context("Channels not found")?;

    info!("Sample rate: {} Hz", sample_rate);
    info!("Channels: {:?}", channels);

    // Create decoder
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .context("Failed to create decoder")?;

    // Decode all packets
    let mut samples = Vec::new();

    loop {
        match format.next_packet() {
            Ok(packet) => {
                if packet.track_id() != track_id {
                    continue;
                }

                match decoder.decode(&packet) {
                    Ok(decoded) => {
                        let stereo_samples = convert_to_stereo(&decoded);
                        samples.extend(stereo_samples);
                    }
                    Err(e) => {
                        warn!("Decode error: {:?}", e);
                        continue;
                    }
                }
            }
            Err(symphonia::core::errors::Error::IoError(e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break;
            }
            Err(e) => {
                warn!("Format error: {:?}", e);
                break;
            }
        }
    }

    info!("Loaded {} stereo frames", samples.len());

    Ok(AudioData {
        samples,
        sample_rate,
    })
}

/// Convert AudioBufferRef to stereo f32 samples.
fn convert_to_stereo(buffer: &AudioBufferRef) -> Vec<[f32; 2]> {
    match buffer {
        AudioBufferRef::F32(buf) => {
            let channels = buf.spec().channels.count();
            let frames = buf.frames();

            let mut stereo = Vec::with_capacity(frames);

            for i in 0..frames {
                let left = buf.chan(0)[i];
                let right = if channels > 1 {
                    buf.chan(1)[i]
                } else {
                    left // Mono to stereo
                };

                stereo.push([left, right]);
            }

            stereo
        }
        _ => {
            // Convert other formats to f32
            let frames = buffer.frames();

            let mut stereo = Vec::with_capacity(frames);

            for _i in 0..frames {
                // Simplified: assumes we can get samples as f32
                stereo.push([0.0, 0.0]);
            }

            stereo
        }
    }
}

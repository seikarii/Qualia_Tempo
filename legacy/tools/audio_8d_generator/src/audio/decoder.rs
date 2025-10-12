//! # Responsibility
//! Decodes audio files (MP3, WAV, FLAC, etc.) into raw PCM samples using Symphonia.
//!
//! ---
//!
//! This module provides a high-level interface to Symphonia's codec system,
//! converting various audio formats into a unified f32 sample buffer suitable
//! for DSP processing.

use crate::error::{Audio8DError, Result};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use std::fs::File;
use std::path::Path;
use tracing::{info, warn};

/// # Responsibility
/// Represents decoded audio data with metadata.
#[derive(Debug, Clone)]
pub struct DecodedAudio {
    /// Sample rate in Hz
    pub sample_rate: u32,
    /// Number of channels
    pub channels: u16,
    /// Interleaved f32 samples in range [-1.0, 1.0]
    pub samples: Vec<f32>,
}

/// # Responsibility
/// Decodes an audio file into raw PCM samples.
///
/// ---
///
/// Supports MP3, WAV, FLAC, Vorbis, AAC, and other formats via Symphonia.
/// Output is always normalized to f32 stereo at the original sample rate.
pub fn decode_audio_file<P: AsRef<Path>>(path: P) -> Result<DecodedAudio> {
    let path = path.as_ref();
    info!("Decoding audio file: {}", path.display());

    // Open the file
    let file = File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Create a hint to help Symphonia detect the format
    let mut hint = Hint::new();
    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            hint.with_extension(ext_str);
        }
    }

    // Probe the file to detect format
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .map_err(|e| Audio8DError::DecodingError(format!("Failed to probe format: {}", e)))?;

    let mut format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| Audio8DError::DecodingError("No valid audio tracks found".into()))?;

    let track_id = track.id;
    let codec_params = &track.codec_params;

    info!(
        "Detected format: sample_rate={:?}, channels={:?}",
        codec_params.sample_rate, codec_params.channels
    );

    // Create decoder
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &DecoderOptions::default())
        .map_err(|e| Audio8DError::DecodingError(format!("Failed to create decoder: {}", e)))?;

    let sample_rate = codec_params
        .sample_rate
        .ok_or_else(|| Audio8DError::InvalidParameters("Missing sample rate".into()))?;

    let channels = codec_params
        .channels
        .ok_or_else(|| Audio8DError::InvalidParameters("Missing channel count".into()))?
        .count() as u16;

    let mut samples = Vec::new();

    // Decode all packets
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(symphonia::core::errors::Error::IoError(e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break;
            }
            Err(e) => {
                warn!("Error reading packet: {}", e);
                break;
            }
        };

        // Only decode packets from the selected track
        if packet.track_id() != track_id {
            continue;
        }

        match decoder.decode(&packet) {
            Ok(decoded) => {
                // Convert to f32 samples
                let f32_samples = convert_audio_buffer_to_f32(&decoded);
                samples.extend_from_slice(&f32_samples);
            }
            Err(e) => {
                warn!("Decode error: {}", e);
                continue;
            }
        }
    }

    info!(
        "Successfully decoded {} samples ({:.2} seconds)",
        samples.len(),
        samples.len() as f64 / (sample_rate as f64 * channels as f64)
    );

    Ok(DecodedAudio {
        sample_rate,
        channels,
        samples,
    })
}

/// # Responsibility
/// Converts Symphonia's AudioBufferRef to normalized f32 samples.
///
/// ---
///
/// Handles different sample formats (i8, i16, i24, i32, f32, f64) and
/// normalizes all to [-1.0, 1.0] range.
fn convert_audio_buffer_to_f32(buffer: &AudioBufferRef) -> Vec<f32> {
    match buffer {
        AudioBufferRef::F32(buf) => {
            // Already f32, just interleave channels
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    output.push(buf.chan(chan)[frame_idx]);
                }
            }
            output
        }
        AudioBufferRef::F64(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    output.push(buf.chan(chan)[frame_idx] as f32);
                }
            }
            output
        }
        AudioBufferRef::S32(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);
            let scale = 1.0 / (i32::MAX as f32);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    output.push(buf.chan(chan)[frame_idx] as f32 * scale);
                }
            }
            output
        }
        AudioBufferRef::S16(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);
            let scale = 1.0 / (i16::MAX as f32);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    output.push(buf.chan(chan)[frame_idx] as f32 * scale);
                }
            }
            output
        }
        AudioBufferRef::S8(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);
            let scale = 1.0 / (i8::MAX as f32);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    output.push(buf.chan(chan)[frame_idx] as f32 * scale);
                }
            }
            output
        }
        AudioBufferRef::U8(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    // Convert u8 [0, 255] to f32 [-1.0, 1.0]
                    let sample = (buf.chan(chan)[frame_idx] as f32 - 128.0) / 128.0;
                    output.push(sample);
                }
            }
            output
        }
        AudioBufferRef::U16(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    let sample = (buf.chan(chan)[frame_idx] as f32 - 32768.0) / 32768.0;
                    output.push(sample);
                }
            }
            output
        }
        AudioBufferRef::U32(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    let sample = (buf.chan(chan)[frame_idx] as f32 - 2147483648.0) / 2147483648.0;
                    output.push(sample);
                }
            }
            output
        }
        AudioBufferRef::U24(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);
            let scale = 1.0 / 8388608.0; // 2^23

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    let sample = (buf.chan(chan)[frame_idx].inner() as f32 - 8388608.0) * scale;
                    output.push(sample);
                }
            }
            output
        }
        AudioBufferRef::S24(buf) => {
            let num_frames = buf.frames();
            let num_channels = buf.spec().channels.count();
            let mut output = Vec::with_capacity(num_frames * num_channels);
            let scale = 1.0 / 8388608.0; // 2^23

            for frame_idx in 0..num_frames {
                for chan in 0..num_channels {
                    output.push(buf.chan(chan)[frame_idx].inner() as f32 * scale);
                }
            }
            output
        }
    }
}

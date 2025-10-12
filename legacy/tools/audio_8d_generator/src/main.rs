//! # Responsibility
//! CLI entry point for the 8D audio generator.
//!
//! ---
//!
//! Provides command-line interface for converting standard audio files
//! to 8D audio with optional effects (drop-enhancer, orchestra, voice-adjuster).

use anyhow::Context;
use clap::Parser;
use std::path::PathBuf;
use tracing::{error, info};
use tracing_subscriber;

mod audio;
mod dsp;
mod effects;
mod error;

use audio::{decode_audio_file, write_wav_file};
use effects::{apply_8d_effect, mono_to_stereo, Spatial8DConfig};

/// # Responsibility
/// CLI arguments for the 8D audio generator.
#[derive(Parser, Debug)]
#[command(name = "audio_8d_generator")]
#[command(about = "Convert audio files to immersive 8D audio", long_about = None)]
struct Args {
    /// Input audio file path (MP3, WAV, FLAC, etc.)
    #[arg(short, long)]
    input: PathBuf,

    /// Output WAV file path
    #[arg(short, long)]
    output: PathBuf,

    /// Rotation speed in Hz (revolutions per second)
    #[arg(long, default_value = "0.5")]
    rotation_speed: f32,

    /// Effect intensity (0.0 to 1.0)
    #[arg(long, default_value = "0.8")]
    intensity: f32,

    /// Enable drop-enhancer (bass boost for rhythm drops)
    #[arg(long)]
    drop_enhancer: bool,

    /// Enable orchestra mode (multi-track spatial distribution)
    #[arg(long)]
    orchestra: bool,

    /// Enable voice-adjuster (modify vocals)
    #[arg(long)]
    voice_adjuster: bool,

    /// Disable HRTF-inspired filtering
    #[arg(long)]
    no_hrtf: bool,
}

fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("audio_8d_generator=info".parse()?),
        )
        .init();

    let args = Args::parse();

    info!("8D Audio Generator v0.1.0");
    info!("Input: {}", args.input.display());
    info!("Output: {}", args.output.display());

    // Step 1: Decode audio file
    let mut decoded = decode_audio_file(&args.input)
        .context("Failed to decode input file")?;

    // Step 2: Convert to stereo if mono
    if decoded.channels == 1 {
        info!("Converting mono to stereo");
        decoded.samples = mono_to_stereo(&decoded.samples);
        decoded.channels = 2;
    } else if decoded.channels > 2 {
        info!("Downmixing {} channels to stereo", decoded.channels);
        decoded.samples = downmix_to_stereo(&decoded.samples, decoded.channels);
        decoded.channels = 2;
    }

    // Step 3: Apply 8D effect
    let config = Spatial8DConfig {
        rotation_speed: args.rotation_speed,
        intensity: args.intensity,
        enable_hrtf: !args.no_hrtf,
    };

    let processed = apply_8d_effect(
        &decoded.samples,
        decoded.sample_rate,
        decoded.channels,
        &config,
    )
    .context("Failed to apply 8D effect")?;

    // Step 4: Apply optional effects (placeholder for future effects)
    let _effects_applied = args.drop_enhancer || args.orchestra || args.voice_adjuster;
    
    if args.drop_enhancer {
        info!("Drop enhancer is not yet implemented");
        // processed = apply_drop_enhancer(&processed, decoded.sample_rate)?;
    }

    if args.orchestra {
        info!("Orchestra mode is not yet implemented");
        // processed = apply_orchestra_effect(&processed, decoded.sample_rate)?;
    }

    if args.voice_adjuster {
        info!("Voice adjuster is not yet implemented");
        // processed = apply_voice_adjustment(&processed, decoded.sample_rate)?;
    }

    // Step 5: Write output file
    write_wav_file(&args.output, &processed, decoded.sample_rate, 2)
        .context("Failed to write output file")?;

    info!("✓ Successfully generated 8D audio!");
    info!("Output: {}", args.output.display());

    Ok(())
}

/// # Responsibility
/// Downmixes multi-channel audio to stereo by averaging channels.
fn downmix_to_stereo(samples: &[f32], channels: u16) -> Vec<f32> {
    let num_frames = samples.len() / channels as usize;
    let mut stereo = Vec::with_capacity(num_frames * 2);

    for frame_idx in 0..num_frames {
        let mut left_sum = 0.0;
        let mut right_sum = 0.0;

        for chan in 0..channels as usize {
            let sample = samples[frame_idx * channels as usize + chan];
            if chan % 2 == 0 {
                left_sum += sample;
            } else {
                right_sum += sample;
            }
        }

        let left_channels = (channels as usize + 1) / 2;
        let right_channels = channels as usize / 2;

        stereo.push(left_sum / left_channels as f32);
        stereo.push(right_sum / right_channels.max(1) as f32);
    }

    stereo
}

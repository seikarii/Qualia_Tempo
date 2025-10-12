//! # Responsibility
//! Entry point for the Qualia Tempo 8D Audio Processor CLI.
//!
//! ---
//!
//! This application applies advanced audio effects including 8D spatial
//! processing, drop enhancement, orchestral layering, and vocal adjustment
//! to input audio files. It follows QUALIA.CODE.RUST architectural standards.

use anyhow::Result;
use clap::Parser;
use qualia_tempo_8d_processor::{
    config::{ProcessorConfig, ProcessorConfigV2},
    processor::{AudioProcessor, AudioProcessorV2},
};
use std::path::PathBuf;
use tracing::info;

/// # Responsibility
/// Command-line arguments for the 8D audio processor.
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Input audio file (MP3, WAV, FLAC, OGG)
    #[arg(short, long)]
    input: PathBuf,

    /// Output audio file (WAV format)
    #[arg(short, long)]
    output: PathBuf,

    /// Enable 8D spatial effect
    #[arg(long, default_value_t = true)]
    spatial: bool,

    /// Enable drop enhancer
    #[arg(long, default_value_t = true)]
    drop_enhancer: bool,

    /// Enable orchestra effect
    #[arg(long, default_value_t = false)]
    orchestra: bool,

    /// Enable vocal adjustment
    #[arg(long, default_value_t = false)]
    vocal_adjust: bool,

    /// 8D rotation speed (cycles per second)
    #[arg(long, default_value_t = 0.2)]
    rotation_speed: f32,

    /// Drop detection threshold (0.0-1.0)
    #[arg(long, default_value_t = 0.7)]
    drop_threshold: f32,

    /// Use Quasar Mixer v2.0 (parallel stem processing)
    #[arg(long, default_value_t = true)]
    quasar: bool,
}

fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let args = Args::parse();

    info!("Starting Qualia Tempo 8D Audio Processor");
    info!("Input: {:?}", args.input);
    info!("Output: {:?}", args.output);

    if args.quasar {
        // QUASAR MIXER V2.0: Parallel stem processing
        info!("Using Quasar Mixer v2.0 (parallel stem processing)");

        // Build v2 configuration with sensible defaults
        // Users can customize via command-line flags in future versions
        let config = ProcessorConfigV2::default();

        info!("Bass stem: drop_enhancer={}, spatial={}, rotation={}", 
            config.bass.enable_drop_enhancer, 
            config.bass.enable_spatial,
            config.bass.rotation_speed
        );
        info!("Drums stem: drop_enhancer={}, spatial={}, rotation={}", 
            config.drums.enable_drop_enhancer,
            config.drums.enable_spatial,
            config.drums.rotation_speed
        );
        info!("Vocals stem: vocal_adjust={}, spatial={}, rotation={}", 
            config.vocals.enable_vocal_adjust,
            config.vocals.enable_spatial,
            config.vocals.rotation_speed
        );
        info!("Presence stem: spatial={}, rotation={}", 
            config.presence.enable_spatial,
            config.presence.rotation_speed
        );

        // Create v2 processor and process audio
        let mut processor = AudioProcessorV2::new(config);
        processor.process_file(&args.input, &args.output)?;
    } else {
        // LEGACY V0.2: Serial effect chain
        info!("Using legacy v0.2 serial processing");

        let config = ProcessorConfig {
            enable_spatial: args.spatial,
            enable_drop_enhancer: args.drop_enhancer,
            enable_orchestra: args.orchestra,
            enable_vocal_adjust: args.vocal_adjust,
            rotation_speed: args.rotation_speed,
            drop_threshold: args.drop_threshold,
        };

        // Create v0.2 processor and process audio
        let mut processor = AudioProcessor::new(config);
        processor.process_file(&args.input, &args.output)?;
    }

    info!("Processing complete! Output written to {:?}", args.output);

    Ok(())
}

//! # Responsibility
//! CLI entry point for 8D audio processor.

use anyhow::Result;
use clap::Parser;
use qualia_8d::{
    AudioBuffer, CircularMotionEngine, Cli, Config, EnsembleEffect, HRTFConvolver, InputHandler,
    RotationDirection, SpatialMixer,
};
use std::path::Path;
use tracing::{info, Level};

fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("Qualia 8D Audio Processor v{}", env!("CARGO_PKG_VERSION"));

    // Parse CLI arguments
    let cli = Cli::parse();

    // Validate arguments
    cli.validate()?;

    // Execute command
    match cli.command {
        qualia_8d::cli::Commands::Process {
            stems,
            input,
            output,
            rotation_speed,
            ensemble_voices,
            spatial_spread,
            config: config_path,
        } => {
            // Load configuration
            let mut config = if let Some(path) = config_path {
                info!("Loading configuration from {:?}", path);
                Config::load(&path)?
            } else {
                Config::default()
            };

            // Override config with CLI parameters
            config.circular_motion.default_speed_rpm = rotation_speed;
            config.ensemble.default_voices = ensemble_voices;
            config.ensemble.spatial_spread_deg = spatial_spread;

            // Determine input source
            if let Some(stem_paths) = stems {
                info!("Processing {} stems with 8D effect", stem_paths.len());
                process_stems(&config, &stem_paths, &output)?;
            } else if let Some(input_path) = input {
                info!("Processing single file: {:?}", input_path);
                process_single_file(&config, &input_path, &output)?;
            }

            info!("✓ Processing complete: {:?}", output);
        }
        qualia_8d::cli::Commands::Test {
            output,
            duration,
            frequency,
        } => {
            info!("Generating test output: {} sec @ {} Hz", duration, frequency);
            let config = Config::default();
            generate_test_output(&config, &output, duration, frequency)?;
            info!("✓ Test file created: {:?}", output);
        }
    }

    Ok(())
}

/// Process multiple stem files with 8D effect
fn process_stems(config: &Config, stems: &[std::path::PathBuf], output: &Path) -> Result<()> {
    let handler = InputHandler::new(config.audio.sample_rate);

    // Load all stems
    info!("Loading stems...");
    let mut audio_buffers = Vec::new();
    for (i, stem_path) in stems.iter().enumerate() {
        info!("  [{}/{}] Loading {:?}", i + 1, stems.len(), stem_path);
        let buffer = handler.load_stem(stem_path)?;
        audio_buffers.push(buffer);
    }

    // Find maximum length
    let max_len = audio_buffers.iter().map(|b| b.samples.len()).max().unwrap_or(0);

    // Process all stems
    info!("Processing with 8D spatial effect...");
    let mut final_mix_left = vec![0.0f32; max_len];
    let mut final_mix_right = vec![0.0f32; max_len];

    for (i, buffer) in audio_buffers.iter().enumerate() {
        info!("  Processing stem {}/{}", i + 1, audio_buffers.len());
        let binaural = process_buffer_8d(config, buffer)?;

        // Mix into final output
        for (j, (left, right)) in binaural
            .left
            .iter()
            .zip(binaural.right.iter())
            .enumerate()
        {
            final_mix_left[j] += left;
            final_mix_right[j] += right;
        }
    }

    // Apply final limiting
    let mixer = SpatialMixer::new(config.mixer.limiter_threshold_db);
    let final_binaural = mixer.mix(&[qualia_8d::BinauralSignal::new(
        final_mix_left,
        final_mix_right,
    )])?;

    // Write output
    write_wav_file(
        output,
        &final_binaural,
        config.audio.sample_rate,
        config.audio.bit_depth,
    )?;

    Ok(())
}

/// Process single audio file with 8D effect
fn process_single_file(config: &Config, input: &Path, output: &Path) -> Result<()> {
    let handler = InputHandler::new(config.audio.sample_rate);

    info!("Loading audio file...");
    let buffer = handler.load_stem(input)?;
    info!(
        "Loaded {:.2}s of audio",
        buffer.samples.len() as f32 / config.audio.sample_rate as f32
    );

    info!("Applying 8D spatial effect...");
    let binaural = process_buffer_8d(config, &buffer)?;

    write_wav_file(output, &binaural, config.audio.sample_rate, config.audio.bit_depth)?;

    Ok(())
}

/// Process audio buffer with full 8D effect
fn process_buffer_8d(config: &Config, input: &AudioBuffer) -> Result<qualia_8d::BinauralSignal> {
    // Initialize processors
    let motion_engine = CircularMotionEngine::new(
        config.circular_motion.default_speed_rpm,
        config.circular_motion.default_radius_m,
        config.circular_motion.default_elevation_deg,
        RotationDirection::Clockwise,
    );

    let hrtf_convolver = HRTFConvolver::new(config.audio.sample_rate)?;

    let ensemble_effect = EnsembleEffect::new(
        config.ensemble.default_voices,
        config.ensemble.delay_range_ms,
        config.ensemble.spatial_spread_deg,
        config.audio.sample_rate,
    );

    let mixer = SpatialMixer::new(config.mixer.limiter_threshold_db);

    // Process in chunks for memory efficiency
    let chunk_size = config.audio.buffer_size;
    let num_chunks = input.samples.len().div_ceil(chunk_size);

    let mut final_left = Vec::new();
    let mut final_right = Vec::new();

    info!("Processing {} chunks...", num_chunks);

    for chunk_idx in 0..num_chunks {
        if chunk_idx % 10 == 0 && chunk_idx > 0 {
            let progress = (chunk_idx as f32 / num_chunks as f32) * 100.0;
            info!("  Progress: {:.0}%", progress);
        }

        let start = chunk_idx * chunk_size;
        let end = (start + chunk_size).min(input.samples.len());
        let chunk = &input.samples[start..end];

        // Calculate time offset for this chunk
        let time_offset = start as f64 / config.audio.sample_rate as f64;

        // Get position for this time
        let base_position = motion_engine.calculate_position(time_offset);

        // Apply ensemble effect
        let voices = ensemble_effect.apply(chunk, &base_position);

        // Process each voice with HRTF
        let mut binaural_stems = Vec::new();
        for voice in voices {
            let binaural = hrtf_convolver.convolve(&voice.samples, &voice.position)?;
            binaural_stems.push(binaural);
        }

        // Mix voices
        let mixed = mixer.mix(&binaural_stems)?;

        final_left.extend_from_slice(&mixed.left);
        final_right.extend_from_slice(&mixed.right);
    }

    Ok(qualia_8d::BinauralSignal::new(final_left, final_right))
}

/// Generate test output file
fn generate_test_output(config: &Config, output: &Path, duration: f32, frequency: f32) -> Result<()> {
    let handler = InputHandler::new(config.audio.sample_rate);
    let test_audio = handler.generate_test_tone(duration, frequency);

    info!("Processing test tone with 8D effect...");
    let binaural = process_buffer_8d(config, &test_audio)?;

    write_wav_file(output, &binaural, config.audio.sample_rate, config.audio.bit_depth)?;

    Ok(())
}

/// Write WAV file
fn write_wav_file(
    path: &Path,
    signal: &qualia_8d::BinauralSignal,
    sample_rate: u32,
    bit_depth: u16,
) -> Result<()> {
    use hound::{WavSpec, WavWriter};

    let spec = WavSpec {
        channels: 2,
        sample_rate,
        bits_per_sample: bit_depth,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = WavWriter::create(path, spec)?;

    // Interleave L/R samples and write
    let scale = 2_f32.powi((bit_depth - 1) as i32);
    for (left, right) in signal.left.iter().zip(signal.right.iter()) {
        let left_int = (left * scale).clamp(-scale, scale - 1.0) as i32;
        let right_int = (right * scale).clamp(-scale, scale - 1.0) as i32;

        writer.write_sample(left_int)?;
        writer.write_sample(right_int)?;
    }

    writer.finalize()?;
    Ok(())
}

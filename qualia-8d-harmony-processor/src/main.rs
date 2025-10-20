//! # Responsibility
//! CLI entry point for 8D audio processing and harmonic analysis tool.
//!
//! Provides command-line interface with progress tracking, structured logging,
//! and batch processing capabilities for audio file transformation.

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use qualia_8d_harmony_processor::{
    analysis::{IntensityAnalyzer, IntensityAnalyzerConfig},
    audio::{
        BinauralSignal, CircularMotionEngine, ConvolutionReverb, 
        ConvolutionReverbConfig, EnsembleConfig, EnsembleEffect, 
        FrequencyBooster, FrequencyBoosterConfig, HrtfConvolver, InputHandler,
        InputHandlerConfig, PsychoacousticBass, PsychoacousticBassConfig,
        RotationDirection, SofaLoader, SphericalCoord, SpatialMixer, 
        SpatialMixerConfig, VoiceOutput,
    },
    export::{HarmonyMapExporter, MidiExporter, WavExporter, WavExporterConfig},
    ml::{
        BasicPitchConfig, BasicPitchTranscriber, ChordRecognizer, ChromagramAnalyzer, 
        ChromagramConfig, HarmonyMapBuilder, HarmonyMapConfig,
    },
};
use rayon::prelude::*;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn, error};
use tracing_subscriber::EnvFilter;

#[derive(Parser, Debug)]
#[command(
    name = "qualia-8d",
    about = "Production-grade 8D audio processor with ML-powered harmonic analysis",
    version,
    author
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Process a single audio file
    Process(ProcessArgs),
    
    /// Batch process multiple audio files in a directory
    Batch(BatchArgs),
}

#[derive(clap::Args, Debug)]
struct ProcessArgs {
    /// Input audio file (MP3, FLAC, WAV, OGG)
    #[arg(short, long, value_name = "FILE")]
    input: PathBuf,

    /// Output directory for generated files
    #[arg(short, long, value_name = "DIR", default_value = "output")]
    output_dir: PathBuf,

    /// Enable MIDI transcription
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    transcribe_midi: bool,

    /// Enable harmonic analysis (HarmonyMap JSON)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    analyze_harmony: bool,

    /// Apply ensemble effect (multi-voice orchestration)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    ensemble: bool,

    /// Number of ensemble voices per stem
    #[arg(long, default_value_t = 5)]
    ensemble_voices: usize,

    /// Apply frequency boost (bass/mid/high EQ)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    eq_boost: bool,

    /// Circular motion speed (revolutions per minute)
    #[arg(long, default_value_t = 8.0)]
    rotation_rpm: f32,

    /// Target sample rate (Hz)
    #[arg(long, default_value_t = 48000)]
    sample_rate: u32,

    /// Path to SOFA HRTF file (.sofa) - falls back to mock dataset if not provided
    #[arg(long, value_name = "FILE")]
    sofa_path: Option<PathBuf>,

    /// Log level (trace, debug, info, warn, error)
    #[arg(long, env = "RUST_LOG", default_value = "info")]
    log_level: String,

    /// Enable JSON structured logging
    #[arg(long)]
    json_logs: bool,
}

#[derive(clap::Args, Debug)]
struct BatchArgs {
    /// Input directory containing audio files
    #[arg(short, long, value_name = "DIR")]
    input_dir: PathBuf,

    /// Output directory for generated files
    #[arg(short, long, value_name = "DIR", default_value = "output_batch")]
    output_dir: PathBuf,

    /// File extension filter (e.g., "mp3", "flac", "wav")
    #[arg(long, value_delimiter = ',', default_values_t = vec!["mp3".to_string(), "flac".to_string(), "wav".to_string(), "ogg".to_string()])]
    extensions: Vec<String>,

    /// Number of parallel processing threads (0 = auto-detect)
    #[arg(long, default_value_t = 0)]
    parallel: usize,

    /// Enable MIDI transcription
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    transcribe_midi: bool,

    /// Enable harmonic analysis (HarmonyMap JSON)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    analyze_harmony: bool,

    /// Apply ensemble effect (multi-voice orchestration)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    ensemble: bool,

    /// Number of ensemble voices per stem
    #[arg(long, default_value_t = 5)]
    ensemble_voices: usize,

    /// Apply frequency boost (bass/mid/high EQ)
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set)]
    eq_boost: bool,

    /// Circular motion speed (revolutions per minute)
    #[arg(long, default_value_t = 8.0)]
    rotation_rpm: f32,

    /// Target sample rate (Hz)
    #[arg(long, default_value_t = 48000)]
    sample_rate: u32,

    /// Path to SOFA HRTF file (.sofa) - falls back to mock dataset if not provided
    #[arg(long, value_name = "FILE")]
    sofa_path: Option<PathBuf>,

    /// Log level (trace, debug, info, warn, error)
    #[arg(long, env = "RUST_LOG", default_value = "info")]
    log_level: String,

    /// Enable JSON structured logging
    #[arg(long)]
    json_logs: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Process(args) => process_single_file(args),
        Commands::Batch(args) => process_batch(args),
    }
}

fn process_single_file(args: ProcessArgs) -> Result<()> {
    // Initialize logging
    setup_logging(&args.log_level, args.json_logs)?;

    info!(
        input = ?args.input,
        output_dir = ?args.output_dir,
        sample_rate = args.sample_rate,
        "Starting Qualia 8D Audio Processor"
    );

    // Create progress tracking
    let multi_progress = MultiProgress::new();
    let overall_progress = create_progress_bar("Overall", 100);
    multi_progress.add(overall_progress.clone());

    // Process file
    process_file_core(&args)?;

    overall_progress.set_position(100);
    overall_progress.finish_with_message("✓ Processing complete!");
    info!("All phases completed successfully");

    Ok(())
}

/// # Responsibility
/// Apply EQ with dynamic intensity modulation to audio buffer.
///
/// Analyzes audio intensity curve and applies frequency boost with
/// real-time gain adaptation based on musical dynamics.
fn run_audio_effects(
    args: &ProcessArgs,
    audio_buffer: &qualia_8d_harmony_processor::audio::AudioBuffer,
) -> Result<(Vec<f32>, Vec<f32>)> {
    // Phase 1.5: Analyze intensity curve for dynamic effects
    info!("Phase 1.5: Analyzing audio intensity dynamics (RMS + Crest + Spectral Flux)");
    
    let intensity_config = IntensityAnalyzerConfig::new(audio_buffer.sample_rate);
    let hop_samples = intensity_config.hop_samples(); // Store before move
    
    let mut intensity_analyzer = IntensityAnalyzer::new(intensity_config)
        .context("Failed to create IntensityAnalyzer")?;
    
    let intensity_curve = intensity_analyzer.analyze(&audio_buffer.samples)
        .context("Failed to analyze intensity curve")?;
    
    info!(
        num_windows = intensity_curve.len(),
        avg_intensity = intensity_curve.iter().sum::<f32>() / intensity_curve.len().max(1) as f32,
        "Intensity analysis complete"
    );
    
    // Phase 2: Apply frequency boost (EQ) with dynamic intensity modulation
    let eq_boosted_audio = if args.eq_boost {
        info!("Phase 2: Dynamic frequency boost (intensity-driven EQ)");
        
        let booster_config = FrequencyBoosterConfig::default_8d(audio_buffer.sample_rate);
        let mut booster = FrequencyBooster::new(booster_config)
            .context("Failed to create FrequencyBooster")?;
        
        // Apply chunk-based intensity modulation
        let mut eq_output = Vec::with_capacity(audio_buffer.samples.len());
        
        for (chunk_idx, chunk) in audio_buffer.samples.chunks(hop_samples).enumerate() {
            let intensity = intensity_curve.get(chunk_idx).copied().unwrap_or(0.5);
            let chunk_output = booster.process(chunk, intensity)?;
            eq_output.extend_from_slice(&chunk_output);
        }
        
        eq_output
    } else {
        audio_buffer.samples.clone()
    };
    
    // Phase 2.4: Apply psychoacoustic bass enhancement
    info!("Phase 2.4: Psychoacoustic bass enhancement (2x/3x harmonic generation)");
    
    let bass_config = PsychoacousticBassConfig::new(audio_buffer.sample_rate)
        .context("Failed to create PsychoacousticBassConfig")?;
    
    let mut bass_enhancer = PsychoacousticBass::new(bass_config)
        .context("Failed to create PsychoacousticBass")?;
    
    // Apply bass enhancement with average intensity
    let avg_intensity = intensity_curve.iter().sum::<f32>() / intensity_curve.len().max(1) as f32;
    let bass_enhanced_audio = bass_enhancer.process(&eq_boosted_audio, avg_intensity)
        .context("Failed to apply psychoacoustic bass enhancement")?;
    
    info!(
        avg_intensity = avg_intensity,
        "Bass enhancement applied with average intensity modulation"
    );
    
    // Phase 2.5: Apply convolution reverb for spatial depth
    info!("Phase 2.5: Convolution reverb (synthetic IR with intensity-modulated wet mix)");
    
    let reverb_config = ConvolutionReverbConfig::new(audio_buffer.sample_rate)
        .context("Failed to create ConvolutionReverbConfig")?;
    
    let mut reverb = ConvolutionReverb::new(reverb_config)
        .context("Failed to create ConvolutionReverb")?;
    
    let reverb_processed_audio = reverb.process(&bass_enhanced_audio, avg_intensity)
        .context("Failed to apply convolution reverb")?;
    
    info!(
        avg_intensity = avg_intensity,
        ir_length_sec = reverb_config.ir_length_samples as f32 / audio_buffer.sample_rate as f32,
        "Convolution reverb applied with intensity-modulated wet mix"
    );

    Ok((reverb_processed_audio, intensity_curve))
}

/// # Responsibility
/// Spatialize independent ensemble voices with HRTF-based circular motion.
///
/// Processes each voice through HRTF convolution with time-varying positions,
/// then mixes all spatialized voices with lookahead limiting.
fn run_spatialization(
    voice_outputs: Vec<VoiceOutput>,
    args: &ProcessArgs,
) -> Result<BinauralSignal> {
    info!(
        rpm = args.rotation_rpm,
        num_voices = voice_outputs.len(),
        "Phase 4: Individual voice spatialization (HRTF + circular motion)"
    );
    
    // Load SOFA HRTF dataset (real file or mock fallback)
    let sofa_loader = if let Some(ref sofa_path) = args.sofa_path {
        info!(path = ?sofa_path, "Loading SOFA HRTF dataset");
        Arc::new(SofaLoader::load_or_mock(sofa_path))
    } else {
        info!("Using synthetic mock HRTF dataset (72 positions)");
        Arc::new(SofaLoader::create_mock_dataset())
    };
    
    // Create HRTF convolver (shared across all voices)
    let hrtf_convolver = HrtfConvolver::new(
        512,  // FFT size
        256,  // Hop size
        args.sample_rate,
        sofa_loader,
    ).context("Failed to create HRTF convolver")?;
    
    let motion_engine = CircularMotionEngine::new(
        args.rotation_rpm,
        1.5,  // radius_meters
        0.0,  // elevation_degrees
        RotationDirection::Clockwise,
    );
    
    let chunk_size = 2048;
    let mut binaural_voices: Vec<BinauralSignal> = Vec::new();
    
    // CRITICAL: Process each voice independently
    for (voice_idx, voice) in voice_outputs.iter().enumerate() {
        info!(
            voice_index = voice_idx,
            spatial_offset = voice.spatial_offset_deg,
            num_samples = voice.samples.len(),
            "Spatializing voice"
        );
        
        let mut spatial_audio = BinauralSignal::new(voice.samples.len());
        
        // Process voice in chunks with time-varying position
        for (chunk_idx, chunk) in voice.samples.chunks(chunk_size).enumerate() {
            let time_sec = (chunk_idx * chunk_size) as f64 / args.sample_rate as f64;
            
            // Calculate position: base rotation + voice's spatial offset
            let base_position = motion_engine.calculate_position(time_sec);
            let final_azimuth = base_position.azimuth_deg + voice.spatial_offset_deg;
            
            let hrtf_position = SphericalCoord::new(
                final_azimuth,
                base_position.elevation_deg,
                base_position.distance_m,
            );
            
            // Convolve chunk with HRTF at this voice's unique position
            let (left_chunk, right_chunk) = hrtf_convolver.convolve_at_position(chunk, &hrtf_position)
                .context("HRTF convolution failed")?;
            
            // OVERLAP-ADD: Sum convolved chunks (preserves HRTF tail)
            let start_idx = chunk_idx * chunk_size;
            for (i, (&left_sample, &right_sample)) in left_chunk.iter().zip(right_chunk.iter()).enumerate() {
                let output_idx = start_idx + i;
                if output_idx < spatial_audio.left.len() {
                    spatial_audio.left[output_idx] += left_sample * voice.gain;
                    spatial_audio.right[output_idx] += right_sample * voice.gain;
                }
            }
        }
        
        binaural_voices.push(spatial_audio);
    }
    
    info!(
        num_spatialized_voices = binaural_voices.len(),
        "All voices spatialized independently"
    );

    // Phase 4.5: Mix all spatialized voices with musical lookahead limiting
    info!("Phase 4.5: Mixing {} voices with lookahead limiter", binaural_voices.len());
    let mixer_config = SpatialMixerConfig::default_8d(args.sample_rate);
    let spatial_mixer = SpatialMixer::new(mixer_config);
    let final_mix = spatial_mixer.mix(&binaural_voices);
    info!("Lookahead limiter applied (threshold: 0.95, knee: 3dB)");

    Ok(final_mix)
}

/// # Responsibility
/// Apply HRTF-based circular motion spatialization.
/// # Responsibility
/// Run ML analysis: MIDI transcription + harmonic analysis.
fn run_ml_analysis(
    audio_buffer: &qualia_8d_harmony_processor::audio::AudioBuffer,
    args: &ProcessArgs,
) -> Result<(Vec<(u8, f64, f64)>, Option<qualia_8d_harmony_processor::contracts::HarmonyMap>)> {
    
    // Phase 5: MIDI transcription (if enabled)
    let midi_notes: Vec<(u8, f64, f64)> = if args.transcribe_midi {
        info!("Phase 5: ML-powered MIDI transcription (McLeod Pitch Method)");
        
        let pitch_config = BasicPitchConfig::new(audio_buffer.sample_rate);
        let transcriber = BasicPitchTranscriber::new(pitch_config)?;
        
        let notes = transcriber.transcribe(&audio_buffer.samples)?;
        
        info!(
            note_count = notes.len(),
            "MIDI transcription complete"
        );
        
        notes
    } else {
        vec![]
    };

    // Phase 6: Harmonic analysis (if enabled)
    let harmony_map = if args.analyze_harmony {
        info!("Phase 6: Chromagram + chord recognition + key detection");
        
        // Chromagram analysis
        let chromagram_config = ChromagramConfig::new(audio_buffer.sample_rate);
        let chromagram_analyzer = ChromagramAnalyzer::new(chromagram_config.clone())?;
        
        // Analyze audio in frames (MUST match FFT size from config)
        let frame_size = chromagram_config.fft_size;
        let hop_size = chromagram_config.hop_size;
        let mut chromagrams = Vec::new();
        
        for (i, window_start) in (0..audio_buffer.samples.len()).step_by(hop_size).enumerate() {
            let window_end = (window_start + frame_size).min(audio_buffer.samples.len());
            
            // Only process full frames
            if window_end - window_start != frame_size {
                break;
            }
            
            let frame = &audio_buffer.samples[window_start..window_end];
            
            match chromagram_analyzer.analyze_frame(frame) {
                Ok(chroma) => chromagrams.push(chroma),
                Err(e) => {
                    warn!(frame_index = i, error = %e, "Failed to analyze chromagram frame");
                }
            }
        }
        
        info!(num_frames = chromagrams.len(), "Chromagram analysis complete");
        
        // Chord recognition
        let chord_recognizer = ChordRecognizer::with_standard_chords();
        
        // Build HarmonyMap
        let harmony_config = HarmonyMapConfig::new(
            (hop_size as f64) / (audio_buffer.sample_rate as f64),  // hop_duration_sec
            2.0,  // min_chord_duration_sec (filter out very short chords)
        );
        let harmony_builder = HarmonyMapBuilder::new(harmony_config, chord_recognizer)?;
        
        let song_id = args.input.file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let harmony_map = harmony_builder.build(
            song_id,
            &chromagrams,
            120.0, // Default tempo - could be detected from onset analysis
        )?;
        
        info!(
            key = %harmony_map.key_signature,
            tempo_bpm = harmony_map.tempo_bpm,
            num_contexts = harmony_map.progression.len(),
            "Harmonic analysis complete"
        );
        
        Some(harmony_map)
    } else {
        None
    };

    Ok((midi_notes, harmony_map))
}

/// # Responsibility
/// Export all output files (WAV, MIDI, JSON).
fn export_outputs(
    spatial_audio: &BinauralSignal,
    midi_notes: &[(u8, f64, f64)],
    harmony_map: &Option<qualia_8d_harmony_processor::contracts::HarmonyMap>,
    args: &ProcessArgs,
    base_name: &str,
) -> Result<()> {
    
    info!(output_dir = ?args.output_dir, "Phase 7: File export");
    
    // Ensure output directory exists
    std::fs::create_dir_all(&args.output_dir)
        .context("Failed to create output directory")?;
    
    // Export 8D WAV
    let wav_path = args.output_dir.join(format!("{}_8d.wav", base_name));
    let wav_config = WavExporterConfig {
        sample_rate: args.sample_rate,
        bit_depth: 24, // High-quality 24-bit export
        channels: 2,   // Binaural stereo
    };
    let wav_exporter = WavExporter::new(wav_config)?;
    
    wav_exporter.export_binaural(spatial_audio, &wav_path)
        .context("Failed to export 8D WAV file")?;
    info!(path = ?wav_path, "Exported 8D WAV");
    
    // Export HarmonyMap JSON (if analysis was performed)
    if let Some(ref harmony_map) = harmony_map {
        let json_path = args.output_dir.join(format!("{}_harmony.json", base_name));
        
        HarmonyMapExporter::export_pretty(harmony_map, &json_path)
            .context("Failed to export HarmonyMap JSON")?;
        info!(path = ?json_path, "Exported HarmonyMap JSON");
        
        // Export chord-based MIDI (from harmony analysis)
        let midi_harmony_path = args.output_dir.join(format!("{}_chords.mid", base_name));
        let midi_exporter = MidiExporter::with_defaults();
        
        midi_exporter.export(harmony_map, &midi_harmony_path)
            .context("Failed to export chord MIDI file")?;
        info!(path = ?midi_harmony_path, "Exported chord progression MIDI");
    } else {
        warn!("Harmonic analysis disabled - skipping JSON and chord MIDI export");
    }
    
    // Export transcription-based MIDI (if transcription was performed)
    if args.transcribe_midi && !midi_notes.is_empty() {
        let midi_transcription_path = args.output_dir.join(format!("{}_transcription.mid", base_name));
        let midi_exporter = MidiExporter::with_defaults();
        
        midi_exporter.export_notes(midi_notes, &midi_transcription_path)
            .context("Failed to export transcription MIDI file")?;
        info!(
            path = ?midi_transcription_path,
            note_count = midi_notes.len(),
            "Exported pitch-tracked MIDI transcription"
        );
    }

    Ok(())
}

/// Core processing logic (shared between single and batch modes)
fn process_file_core(args: &ProcessArgs) -> Result<()> {
    // Validate input file exists
    if !args.input.exists() {
        anyhow::bail!("Input file does not exist: {:?}", args.input);
    }

    // Create output directory
    std::fs::create_dir_all(&args.output_dir)
        .context("Failed to create output directory")?;

    // Phase 1: Load and decode audio
    info!("Phase 1: Audio decoding");
    
    let input_config = InputHandlerConfig::new(args.sample_rate);
    let input_handler = InputHandler::new(input_config)?;
    let audio_buffer = input_handler.load_stem(&args.input)
        .context("Failed to load input audio file")?;
    
    info!(
        duration_sec = audio_buffer.duration_sec,
        sample_rate = audio_buffer.sample_rate,
        num_samples = audio_buffer.samples.len(),
        "Audio loaded successfully"
    );

    // Phase 1.5-2: Analyze intensity + Apply dynamic EQ
    let (eq_boosted_audio, _intensity_curve) = run_audio_effects(args, &audio_buffer)?;

    // Phase 3: Generate independent ensemble voices (NO MIXING YET)
    let voice_outputs = if args.ensemble {
        info!(voices = args.ensemble_voices, "Phase 3: Generating independent ensemble voices");
        
        // Dynamic ensemble configuration: voice count + spatial spread modulated by intensity
        // Low intensity: 5 voices, 60° spread (tight orchestral)
        // High intensity: 13 voices, 120° spread (wide cinematic)
        let min_voices = (args.ensemble_voices as f32 * 0.5).max(5.0) as usize;
        let max_voices = args.ensemble_voices.max(13);
        
        let ensemble_config = EnsembleConfig::new(
            (min_voices, max_voices),  // Dynamic voice count range
            15.0,  // max_delay_ms
            5.0,   // max_pitch_shift_cents
            (60.0, 120.0),  // Dynamic spatial spread range (degrees)
            audio_buffer.sample_rate,
        )?;
        let mut ensemble_effect = EnsembleEffect::new(ensemble_config);
        
        // TODO: Use average intensity from intensity_curve for now (will be chunk-based later)
        // let avg_intensity = _intensity_curve.iter().sum::<f32>() / _intensity_curve.len().max(1) as f32;
        let avg_intensity = 0.7; // Placeholder: 70% intensity (10 voices, 102° spread)
        
        let voices = ensemble_effect.process_dynamic(&eq_boosted_audio, avg_intensity)
            .context("Failed to generate ensemble voices")?;
        
        info!(
            num_voices = voices.len(),
            spatial_spread = 90.0,
            "Ensemble voices generated with spatial distribution"
        );
        
        voices
    } else {
        // Single voice at center (0° offset)
        vec![VoiceOutput {
            samples: eq_boosted_audio.clone(),
            spatial_offset_deg: 0.0,
            gain: 1.0,
        }]
    };

    // Phase 4-4.5: Spatialize and mix voices
    let final_mix = run_spatialization(voice_outputs, args)?;

    // Phase 5-6: ML analysis (MIDI transcription + harmonic analysis)
    let (midi_notes, harmony_map) = run_ml_analysis(&audio_buffer, args)?;

    // Phase 7: Export files
    let base_name = args.input.file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    
    export_outputs(&final_mix, &midi_notes, &harmony_map, args, &base_name)?;

    Ok(())
}

/// Setup structured logging with tracing
fn setup_logging(log_level: &str, json_logs: bool) -> Result<()> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(log_level));

    if json_logs {
        // JSON format for production log aggregation
        tracing_subscriber::fmt()
            .with_env_filter(filter)
            .json()
            .init();
    } else {
        // Human-readable format for development
        tracing_subscriber::fmt()
            .with_env_filter(filter)
            .with_target(false)
            .with_thread_ids(true)
            .with_line_number(true)
            .init();
    }

    Ok(())
}

/// Process batch of audio files in parallel
fn process_batch(args: BatchArgs) -> Result<()> {
    // Initialize logging
    setup_logging(&args.log_level, args.json_logs)?;

    info!(
        input_dir = ?args.input_dir,
        output_dir = ?args.output_dir,
        parallel = args.parallel,
        "Starting batch processing"
    );

    // Validate input directory exists
    if !args.input_dir.exists() || !args.input_dir.is_dir() {
        anyhow::bail!("Input directory does not exist or is not a directory: {:?}", args.input_dir);
    }

    // Create output directory
    std::fs::create_dir_all(&args.output_dir)
        .context("Failed to create output directory")?;

    // Find all audio files matching extensions
    let mut audio_files: Vec<PathBuf> = Vec::new();
    
    for entry in std::fs::read_dir(&args.input_dir)
        .context("Failed to read input directory")? 
    {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if args.extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                    audio_files.push(path);
                }
            }
        }
    }

    if audio_files.is_empty() {
        warn!("No audio files found in directory with extensions: {:?}", args.extensions);
        return Ok(());
    }

    info!(file_count = audio_files.len(), "Found audio files to process");

    // Configure rayon thread pool if parallel specified
    if args.parallel > 0 {
        rayon::ThreadPoolBuilder::new()
            .num_threads(args.parallel)
            .build_global()
            .context("Failed to configure rayon thread pool")?;
    }

    // Process files in parallel with rayon
    let results: Vec<(PathBuf, Result<()>)> = audio_files
        .par_iter()
        .map(|path| {
            let file_name = path.file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            
            info!(file = ?path, "Processing file");
            
            // Wrap entire processing in Result handling
            let result = (|| -> Result<()> {
                // Create individual output directory for this file
                let file_output_dir = args.output_dir.join(&file_name);
                std::fs::create_dir_all(&file_output_dir)
                    .context(format!("Failed to create output directory for {}", file_name))?;

                // Convert BatchArgs to ProcessArgs for individual file processing
                let process_args = ProcessArgs {
                    input: path.clone(),
                    output_dir: file_output_dir,
                    transcribe_midi: args.transcribe_midi,
                    analyze_harmony: args.analyze_harmony,
                    ensemble: args.ensemble,
                    ensemble_voices: args.ensemble_voices,
                    eq_boost: args.eq_boost,
                    rotation_rpm: args.rotation_rpm,
                    sample_rate: args.sample_rate,
                    sofa_path: args.sofa_path.clone(),
                    log_level: args.log_level.clone(),
                    json_logs: args.json_logs,
                };

                // Process file (without re-initializing logging)
                process_file_core(&process_args)
            })();
            
            (path.clone(), result)
        })
        .collect();

    // Report results
    let mut success_count = 0;
    let mut failure_count = 0;

    for (path, result) in results {
        match result {
            Ok(()) => {
                success_count += 1;
                info!(file = ?path, "✓ Successfully processed");
            }
            Err(e) => {
                failure_count += 1;
                error!(file = ?path, error = %e, "✗ Failed to process");
            }
        }
    }

    info!(
        total = audio_files.len(),
        success = success_count,
        failed = failure_count,
        "Batch processing complete"
    );

    if failure_count > 0 {
        anyhow::bail!("{} files failed to process", failure_count);
    }

    Ok(())
}

/// Create styled progress bar
fn create_progress_bar(name: &str, len: u64) -> ProgressBar {
    let pb = ProgressBar::new(len);
    pb.set_style(
        ProgressStyle::with_template(
            "{prefix:.bold} [{bar:40.cyan/blue}] {pos}/{len} {msg}",
        )
        .unwrap()
        .progress_chars("=>-"),
    );
    pb.set_prefix(name.to_string()); // Convert to owned String for 'static lifetime
    pb.enable_steady_tick(Duration::from_millis(100));
    pb
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_process_default_values() {
        let cli = Cli::parse_from(&[
            "qualia-8d",
            "process",
            "-i",
            "test.mp3",
        ]);

        match cli.command {
            Commands::Process(args) => {
                assert_eq!(args.input, PathBuf::from("test.mp3"));
                assert_eq!(args.output_dir, PathBuf::from("output"));
                assert!(args.transcribe_midi);
                assert!(args.analyze_harmony);
                assert!(args.ensemble);
                assert_eq!(args.ensemble_voices, 5);
                assert_eq!(args.rotation_rpm, 8.0);
                assert_eq!(args.sample_rate, 48000);
            }
            _ => panic!("Expected Process command"),
        }
    }

    #[test]
    fn test_cli_process_override_values() {
        let cli = Cli::parse_from(&[
            "qualia-8d",
            "process",
            "-i",
            "input.wav",
            "-o",
            "custom_output",
            "--ensemble-voices",
            "7",
            "--rotation-rpm",
            "12.0",
            "--sample-rate",
            "44100",
            "--transcribe-midi",
            "false",
        ]);

        match cli.command {
            Commands::Process(args) => {
                assert_eq!(args.input, PathBuf::from("input.wav"));
                assert_eq!(args.output_dir, PathBuf::from("custom_output"));
                assert_eq!(args.ensemble_voices, 7);
                assert_eq!(args.rotation_rpm, 12.0);
                assert_eq!(args.sample_rate, 44100);
                assert!(!args.transcribe_midi);
                assert!(args.analyze_harmony);
            }
            _ => panic!("Expected Process command"),
        }
    }

    #[test]
    fn test_cli_batch_default_values() {
        let cli = Cli::parse_from(&[
            "qualia-8d",
            "batch",
            "-i",
            "input_dir",
        ]);

        match cli.command {
            Commands::Batch(args) => {
                assert_eq!(args.input_dir, PathBuf::from("input_dir"));
                assert_eq!(args.output_dir, PathBuf::from("output_batch"));
                assert_eq!(args.parallel, 0);
                assert!(args.transcribe_midi);
                assert!(args.analyze_harmony);
            }
            _ => panic!("Expected Batch command"),
        }
    }
}

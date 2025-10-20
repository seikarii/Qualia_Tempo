//! # Responsibility
//! Criterion benchmarks for end-to-end audio processing pipeline.
//!
//! Measures throughput and memory usage for the complete workflow:
//! Input loading → EQ boost → Ensemble effect → HRTF spatialization → Export.

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use qualia_8d_harmony_processor::{
    audio::{
        BinauralSignal, CircularMotionEngine, EnsembleConfig, EnsembleEffect, EnsembleMode,
        FrequencyBooster, FrequencyBoosterConfig, HrtfConvolver,
        RotationDirection, SofaLoader, SphericalCoord,
    },
};
use std::sync::Arc;

/// Generate synthetic audio for benchmarking (1 second of sine wave @ 440 Hz)
fn generate_test_audio(sample_rate: u32, duration_sec: f32) -> Vec<f32> {
    let num_samples = (sample_rate as f32 * duration_sec) as usize;
    let frequency = 440.0; // A4 note
    
    (0..num_samples)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5 // 50% amplitude
        })
        .collect()
}

/// Benchmark Phase 2: Frequency boost (EQ)
fn bench_eq_processing(c: &mut Criterion) {
    let sample_rate = 48000;
    let audio = generate_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("eq_processing");
    group.throughput(Throughput::Elements(audio.len() as u64));
    
    group.bench_function("1_second_audio", |b| {
        let config = FrequencyBoosterConfig::default_8d(sample_rate);
        let mut booster = FrequencyBooster::new(config).expect("Failed to create booster");
        
        b.iter(|| {
            black_box(booster.process(black_box(&audio), black_box(0.8)))
        });
    });
    
    group.finish();
}

/// Benchmark Phase 3: Ensemble effect (dynamic voice count)
fn bench_ensemble_processing(c: &mut Criterion) {
    let sample_rate = 48000;
    let audio = generate_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("ensemble_processing");
    group.throughput(Throughput::Elements(audio.len() as u64));
    
    for voice_count in [3, 5, 7] {
        group.bench_with_input(
            BenchmarkId::new("voices", voice_count),
            &voice_count,
            |b, &voices| {
                let config = EnsembleConfig::new(
                    EnsembleMode::Humanized,
                    None,
                    (voices, voices), // Static voice count for benchmark
                    5.0,  // max_delay_ms
                    3.0,  // max_pitch_shift_cents
                    (60.0, 60.0), // spatial_spread_deg_range
                    sample_rate,
                ).expect("Failed to create ensemble config");
                
                let mut ensemble = EnsembleEffect::new(config);
                
                b.iter(|| {
                    black_box(ensemble.process_dynamic(black_box(&audio), black_box(0.8)))
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark Phase 4: HRTF convolution with circular motion
fn bench_hrtf_spatialization(c: &mut Criterion) {
    let sample_rate = 48000;
    let audio = generate_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("hrtf_spatialization");
    group.throughput(Throughput::Elements(audio.len() as u64));
    
    group.bench_function("circular_motion_8rpm", |b| {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let hrtf_convolver = HrtfConvolver::new(
            512,  // FFT size
            256,  // Hop size
            sample_rate,
            sofa_loader,
        ).expect("Failed to create convolver");
        
        let motion_engine = CircularMotionEngine::new(
            8.0,   // rpm
            1.5,   // radius_meters
            0.0,   // elevation_degrees
            RotationDirection::Clockwise,
        );
        
        b.iter(|| {
            let mut spatial_audio = BinauralSignal::new(audio.len());
            let chunk_size = 2048;
            
            for (chunk_idx, chunk) in audio.chunks(chunk_size).enumerate() {
                let time_sec = (chunk_idx * chunk_size) as f64 / sample_rate as f64;
                let position = motion_engine.calculate_position(time_sec);
                
                let hrtf_position = SphericalCoord::new(
                    position.azimuth_deg as f32,
                    position.elevation_deg as f32,
                    position.distance_m as f32,
                );
                
                let (left_chunk, right_chunk) = hrtf_convolver
                    .convolve_at_position(chunk, &hrtf_position)
                    .expect("Convolution failed");
                
                let start_idx = chunk_idx * chunk_size;
                for (i, (&left, &right)) in left_chunk.iter().zip(right_chunk.iter()).enumerate() {
                    let output_idx = start_idx + i;
                    if output_idx < spatial_audio.left.len() {
                        spatial_audio.left[output_idx] = left;
                        spatial_audio.right[output_idx] = right;
                    }
                }
            }
            
            black_box(spatial_audio)
        });
    });
    
    group.finish();
}

/// Benchmark full end-to-end pipeline (all phases)
fn bench_full_pipeline(c: &mut Criterion) {
    let sample_rate = 48000;
    let audio = generate_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("full_pipeline");
    group.throughput(Throughput::Elements(audio.len() as u64));
    group.sample_size(10); // Reduce iterations for expensive benchmark
    
    group.bench_function("eq_ensemble_hrtf", |b| {
        // Pre-create all processors
        let eq_config = FrequencyBoosterConfig::default_8d(sample_rate);
        let ensemble_config = EnsembleConfig::new(
            EnsembleMode::Humanized,
            None,
            (5, 5), // Static 5 voices for benchmark
            5.0,
            3.0,
            (60.0, 60.0),
            sample_rate
        ).expect("Failed to create ensemble config");
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let hrtf_convolver = HrtfConvolver::new(512, 256, sample_rate, sofa_loader)
            .expect("Failed to create convolver");
        let motion_engine = CircularMotionEngine::new(8.0, 1.5, 0.0, RotationDirection::Clockwise);
        
        b.iter(|| {
            let intensity = 0.8;
            
            // Phase 1: EQ
            let mut booster = FrequencyBooster::new(eq_config.clone())
                .expect("Failed to create booster");
            let eq_audio = booster.process(&audio, intensity).unwrap();
            
            // Phase 2: Ensemble (produces Vec<VoiceOutput>)
            let mut ensemble = EnsembleEffect::new(ensemble_config.clone());
            let voice_outputs = ensemble.process_dynamic(&eq_audio, intensity).unwrap();
            
            // Mix ensemble voices to mono for HRTF input
            let ensemble_audio = if !voice_outputs.is_empty() {
                let max_len = voice_outputs.iter().map(|v| v.samples.len()).max().unwrap_or(0);
                let mut mixed = vec![0.0f32; max_len];
                
                for voice in &voice_outputs {
                    for (i, &sample) in voice.samples.iter().enumerate() {
                        if i < mixed.len() {
                            mixed[i] += sample * voice.gain;
                        }
                    }
                }
                mixed
            } else {
                eq_audio // Fallback if no voices generated
            };
            
            // Phase 3: HRTF
            let mut spatial_audio = BinauralSignal::new(ensemble_audio.len());
            let chunk_size = 2048;
            
            for (chunk_idx, chunk) in ensemble_audio.chunks(chunk_size).enumerate() {
                let time_sec = (chunk_idx * chunk_size) as f64 / sample_rate as f64;
                let position = motion_engine.calculate_position(time_sec);
                
                let hrtf_position = SphericalCoord::new(
                    position.azimuth_deg as f32,
                    position.elevation_deg as f32,
                    position.distance_m as f32,
                );
                
                let (left_chunk, right_chunk) = hrtf_convolver
                    .convolve_at_position(chunk, &hrtf_position)
                    .expect("Convolution failed");
                
                let start_idx = chunk_idx * chunk_size;
                for (i, (&left, &right)) in left_chunk.iter().zip(right_chunk.iter()).enumerate() {
                    let output_idx = start_idx + i;
                    if output_idx < spatial_audio.left.len() {
                        spatial_audio.left[output_idx] = left;
                        spatial_audio.right[output_idx] = right;
                    }
                }
            }
            
            black_box(spatial_audio)
        });
    });
    
    group.finish();
}

criterion_group!(
    benches,
    bench_eq_processing,
    bench_ensemble_processing,
    bench_hrtf_spatialization,
    bench_full_pipeline
);
criterion_main!(benches);

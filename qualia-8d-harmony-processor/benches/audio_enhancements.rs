//! # Responsibility
//! Criterion benchmarks for new audio enhancement modules.
//!
//! Measures performance of:
//! - HarmonicExciter (3-16kHz psychoacoustic enhancement)
//! - StereoWidener (Haas effect + Mid-Side processing)
//! - TransientShaper (Attack/sustain shaping)
//! - EnsembleEffect Synchronized mode (intensity-gated chorus)

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use qualia_8d_harmony_processor::audio::{
    EnsembleConfig, EnsembleEffect, EnsembleMode,
    HarmonicExciter, HarmonicExciterConfig,
    StereoWidener, StereoWidenerConfig,
    TransientShaper, TransientShaperConfig,
};

/// Generate stereo test audio
fn generate_stereo_test_audio(sample_rate: u32, duration_sec: f32) -> (Vec<f32>, Vec<f32>) {
    let num_samples = (sample_rate as f32 * duration_sec) as usize;
    let frequency = 440.0;
    
    let left: Vec<f32> = (0..num_samples)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5
        })
        .collect();
    
    let right: Vec<f32> = (0..num_samples)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * frequency * t * 1.5).sin() * 0.5
        })
        .collect();
    
    (left, right)
}

/// Generate mono test audio
fn generate_mono_test_audio(sample_rate: u32, duration_sec: f32) -> Vec<f32> {
    let num_samples = (sample_rate as f32 * duration_sec) as usize;
    let frequency = 440.0;
    
    (0..num_samples)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5
        })
        .collect()
}

/// Benchmark HarmonicExciter performance
fn bench_harmonic_exciter(c: &mut Criterion) {
    let sample_rate = 48000;
    let input = generate_mono_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("harmonic_exciter");
    group.throughput(Throughput::Elements(input.len() as u64));
    
    for intensity in [0.3, 0.7, 1.0] {
        group.bench_with_input(
            BenchmarkId::new("intensity", intensity),
            &intensity,
            |b, &intensity| {
                let config = HarmonicExciterConfig::new(sample_rate).unwrap();
                let mut exciter = HarmonicExciter::new(config).unwrap();
                
                b.iter(|| {
                    black_box(exciter.process(black_box(&input), black_box(intensity)))
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark StereoWidener performance
fn bench_stereo_widener(c: &mut Criterion) {
    let sample_rate = 48000;
    let (left, right) = generate_stereo_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("stereo_widener");
    group.throughput(Throughput::Elements(left.len() as u64));
    
    for intensity in [0.3, 0.7, 1.0] {
        group.bench_with_input(
            BenchmarkId::new("intensity", intensity),
            &intensity,
            |b, &intensity| {
                let config = StereoWidenerConfig::new(
                    (5.0, 35.0),
                    (1.0, 2.5),
                    8000.0,
                    sample_rate
                ).unwrap();
                let mut widener = StereoWidener::new(config);
                
                b.iter(|| {
                    black_box(widener.process(black_box(&left), black_box(&right), black_box(intensity)))
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark TransientShaper performance
fn bench_transient_shaper(c: &mut Criterion) {
    let sample_rate = 48000;
    let input = generate_mono_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("transient_shaper");
    group.throughput(Throughput::Elements(input.len() as u64));
    
    for intensity in [0.3, 0.7, 1.0] {
        group.bench_with_input(
            BenchmarkId::new("intensity", intensity),
            &intensity,
            |b, &intensity| {
                let config = TransientShaperConfig::new(
                    (0.0, 15.0),
                    (-8.0, 0.0),
                    50,
                    20.0,
                    512,
                    sample_rate
                ).unwrap();
                let mut shaper = TransientShaper::new(config);
                
                b.iter(|| {
                    black_box(shaper.process(black_box(&input), black_box(intensity)))
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark EnsembleEffect Synchronized mode
fn bench_ensemble_synchronized_mode(c: &mut Criterion) {
    let sample_rate = 48000;
    let audio = generate_mono_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("ensemble_synchronized");
    group.throughput(Throughput::Elements(audio.len() as u64));
    
    // Below threshold (gated, no processing)
    group.bench_function("intensity_0.5_gated", |b| {
        let config = EnsembleConfig::new(
            EnsembleMode::Synchronized,
            None,
            (3, 7),
            1.0,
            5.0,
            (30.0, 60.0),
            sample_rate
        ).unwrap();
        let mut effect = EnsembleEffect::new(config);
        
        b.iter(|| {
            black_box(effect.process_dynamic(black_box(&audio), black_box(0.5)))
        });
    });
    
    // Above threshold (full processing)
    group.bench_function("intensity_0.9_active", |b| {
        let config = EnsembleConfig::new(
            EnsembleMode::Synchronized,
            None,
            (3, 7),
            1.0,
            5.0,
            (30.0, 60.0),
            sample_rate
        ).unwrap();
        let mut effect = EnsembleEffect::new(config);
        
        b.iter(|| {
            black_box(effect.process_dynamic(black_box(&audio), black_box(0.9)))
        });
    });
    
    group.finish();
}

/// Benchmark full enhancement chain (Exciter → Shaper → Widener)
fn bench_full_enhancement_chain(c: &mut Criterion) {
    let sample_rate = 48000;
    let mono_input = generate_mono_test_audio(sample_rate, 1.0);
    
    let mut group = c.benchmark_group("full_enhancement_chain");
    group.throughput(Throughput::Elements(mono_input.len() as u64));
    group.sample_size(10); // Expensive benchmark
    
    group.bench_function("exciter_shaper_widener", |b| {
        let exciter_config = HarmonicExciterConfig::new(sample_rate).unwrap();
        let shaper_config = TransientShaperConfig::new(
            (0.0, 15.0),
            (-8.0, 0.0),
            50,
            20.0,
            512,
            sample_rate
        ).unwrap();
        let widener_config = StereoWidenerConfig::new(
            (5.0, 35.0),
            (1.0, 2.5),
            8000.0,
            sample_rate
        ).unwrap();
        
        b.iter(|| {
            let intensity = 0.8;
            
            // Phase 1: Harmonic Exciter (mono → mono)
            let mut exciter = HarmonicExciter::new(exciter_config.clone()).unwrap();
            let excited = exciter.process(&mono_input, intensity).unwrap();
            
            // Phase 2: Transient Shaper (mono → mono)
            let mut shaper = TransientShaper::new(shaper_config.clone());
            let shaped = shaper.process(&excited, intensity).unwrap();
            
            // Phase 3: Stereo Widener (mono duplicated to stereo → stereo)
            let mut widener = StereoWidener::new(widener_config.clone());
            let (final_left, final_right) = widener.process(&shaped, &shaped, intensity).unwrap();
            
            black_box((final_left, final_right))
        });
    });
    
    group.finish();
}

criterion_group!(
    benches,
    bench_harmonic_exciter,
    bench_stereo_widener,
    bench_transient_shaper,
    bench_ensemble_synchronized_mode,
    bench_full_enhancement_chain
);
criterion_main!(benches);

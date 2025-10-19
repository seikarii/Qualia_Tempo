//! # Responsibility
//! Benchmarks for HRTF convolution performance analysis.
//!
//! Measures time-domain convolution overhead across different chunk sizes
//! and HRIR lengths to guide FFT overlap-add optimization decisions.

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use qualia_8d_harmony_processor::audio::{HrtfConvolver, SofaLoader, SphericalCoord};
use std::sync::Arc;

/// Benchmark HRTF convolution with varying input chunk sizes
fn bench_hrtf_convolution_chunk_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("hrtf_convolution_chunk_size");
    
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader)
        .expect("Failed to create HRTF convolver");
    
    let position = SphericalCoord::new(45.0, 0.0, 1.5);
    
    // Benchmark different chunk sizes (common in audio processing)
    for chunk_size in [256, 512, 1024, 2048, 4096].iter() {
        group.throughput(Throughput::Elements(*chunk_size as u64));
        
        let input: Vec<f32> = (0..*chunk_size)
            .map(|i| (i as f32 * 0.01).sin() * 0.5)
            .collect();
        
        group.bench_with_input(
            BenchmarkId::from_parameter(chunk_size),
            chunk_size,
            |b, _| {
                b.iter(|| {
                    let (left, right) = convolver
                        .convolve_at_position(black_box(&input), black_box(&position))
                        .unwrap();
                    black_box((left, right))
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark full 1-second audio processing
fn bench_hrtf_full_second(c: &mut Criterion) {
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader)
        .expect("Failed to create HRTF convolver");
    
    let position = SphericalCoord::new(90.0, 0.0, 1.5);
    
    // 1 second of audio at 48kHz
    let sample_rate = 48000;
    let input: Vec<f32> = (0..sample_rate)
        .map(|i| (i as f32 * 440.0 * 2.0 * std::f32::consts::PI / sample_rate as f32).sin() * 0.5)
        .collect();
    
    c.bench_function("hrtf_full_second_48khz", |b| {
        b.iter(|| {
            let (left, right) = convolver
                .convolve_at_position(black_box(&input), black_box(&position))
                .unwrap();
            black_box((left, right))
        });
    });
}

/// Benchmark SOFA loader nearest-neighbor lookup
fn bench_sofa_nearest_lookup(c: &mut Criterion) {
    let sofa_loader = SofaLoader::create_mock_dataset();
    
    let positions = vec![
        SphericalCoord::new(0.0, 0.0, 1.5),
        SphericalCoord::new(45.0, 0.0, 1.5),
        SphericalCoord::new(90.0, 0.0, 1.5),
        SphericalCoord::new(180.0, 0.0, 1.5),
        SphericalCoord::new(270.0, 0.0, 1.5),
        SphericalCoord::new(7.5, 22.5, 1.5), // Off-grid position
    ];
    
    c.bench_function("sofa_nearest_neighbor_lookup", |b| {
        b.iter(|| {
            for pos in &positions {
                let hrir = sofa_loader.get_nearest(black_box(pos)).unwrap();
                black_box(hrir);
            }
        });
    });
}

/// Benchmark HRTF convolution with circular motion (realistic use case)
fn bench_hrtf_circular_motion(c: &mut Criterion) {
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader)
        .expect("Failed to create HRTF convolver");
    
    // 1 second of audio, process in 2048-sample chunks
    let sample_rate = 48000;
    let chunk_size = 2048;
    let num_chunks = sample_rate / chunk_size;
    
    let chunks: Vec<Vec<f32>> = (0..num_chunks)
        .map(|chunk_idx| {
            (0..chunk_size)
                .map(|i| {
                    let sample_idx = chunk_idx * chunk_size + i;
                    (sample_idx as f32 * 440.0 * 2.0 * std::f32::consts::PI / sample_rate as f32).sin() * 0.5
                })
                .collect()
        })
        .collect();
    
    // Simulate rotating positions (0° to 360° over 1 second)
    let positions: Vec<SphericalCoord> = (0..num_chunks)
        .map(|chunk_idx| {
            let azimuth = (chunk_idx as f32 / num_chunks as f32) * 360.0;
            SphericalCoord::new(azimuth, 0.0, 1.5)
        })
        .collect();
    
    c.bench_function("hrtf_circular_motion_1sec", |b| {
        b.iter(|| {
            for (chunk, position) in chunks.iter().zip(positions.iter()) {
                let (left, right) = convolver
                    .convolve_at_position(black_box(chunk), black_box(position))
                    .unwrap();
                black_box((left, right));
            }
        });
    });
}

criterion_group!(
    benches,
    bench_hrtf_convolution_chunk_sizes,
    bench_hrtf_full_second,
    bench_sofa_nearest_lookup,
    bench_hrtf_circular_motion
);
criterion_main!(benches);

//! # Responsibility
//! Performance benchmarks for 8D audio processing pipeline.

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use qualia_8d::{
    CircularMotionEngine, EnsembleEffect, HRTFConvolver,
    RotationDirection, SpatialMixer, SphericalPosition,
};

fn bench_hrtf_convolution(c: &mut Criterion) {
    let convolver = HRTFConvolver::new(48000).unwrap();
    let input = vec![0.5f32; 2048];
    let position = SphericalPosition {
        azimuth_deg: 45.0,
        elevation_deg: 0.0,
        distance_m: 1.5,
    };

    c.bench_function("hrtf_convolve_2048", |b| {
        b.iter(|| {
            black_box(convolver.convolve(black_box(&input), black_box(&position)).unwrap())
        })
    });
}

fn bench_ensemble_effect(c: &mut Criterion) {
    let effect = EnsembleEffect::new(5, (5.0, 25.0), 15.0, 48000);
    let input = vec![0.5f32; 2048];
    let position = SphericalPosition {
        azimuth_deg: 0.0,
        elevation_deg: 0.0,
        distance_m: 1.5,
    };

    c.bench_function("ensemble_5_voices", |b| {
        b.iter(|| black_box(effect.apply(black_box(&input), black_box(&position))))
    });
}

fn bench_circular_motion(c: &mut Criterion) {
    let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::Clockwise);

    c.bench_function("calculate_position", |b| {
        b.iter(|| black_box(engine.calculate_position(black_box(1.5))))
    });
}

fn bench_mixer(c: &mut Criterion) {
    use qualia_8d::BinauralSignal;
    
    let mixer = SpatialMixer::new(-0.3);
    let stems: Vec<BinauralSignal> = (0..5)
        .map(|_| BinauralSignal::new(vec![0.1; 2048], vec![0.1; 2048]))
        .collect();

    c.bench_function("mix_5_stems", |b| {
        b.iter(|| black_box(mixer.mix(black_box(&stems)).unwrap()))
    });
}

criterion_group!(
    benches,
    bench_hrtf_convolution,
    bench_ensemble_effect,
    bench_circular_motion,
    bench_mixer
);
criterion_main!(benches);

//! # Responsibility
//! Performance benchmarks for rendering computations.
//!
//! ---
//!
//! Measures baseline performance of math-heavy operations used in rendering.

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use shared_core::contracts::QualiaState;
use shared_core::utils::{Vec2, Vec3};

fn create_test_qualia() -> QualiaState {
    QualiaState {
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.6,
        flow: 0.85,
        chaos: 0.15,
        recovery: 0.0,
        transcendence: 0.0,
        collection_window_end: 1000.0,
    }
}

fn bench_vec2_operations(c: &mut Criterion) {
    c.bench_function("vec2_addition", |b| {
        let a = Vec2::new(10.0, 20.0);
        let b_vec = Vec2::new(5.0, 15.0);
        
        b.iter(|| {
            let result = a + b_vec;
            black_box(result);
        });
    });
    
    c.bench_function("vec2_magnitude", |b| {
        let v = Vec2::new(3.0, 4.0);
        
        b.iter(|| {
            let mag = v.length();
            black_box(mag);
        });
    });
}

fn bench_vec3_color_interpolation(c: &mut Criterion) {
    c.bench_function("vec3_lerp", |b| {
        let start = Vec3::new(1.0, 0.0, 0.0);
        let end = Vec3::new(0.0, 1.0, 0.0);
        
        b.iter(|| {
            for i in 0..10 {
                let t = i as f32 / 10.0;
                let result = Vec3::from(start.lerp(end.0, t));
                black_box(result);
            }
        });
    });
}

fn bench_qualia_to_color_mapping(c: &mut Criterion) {
    c.bench_function("qualia_color_mapping_single", |b| {
        let qualia = create_test_qualia();
        
        b.iter(|| {
            // Typical qualia-to-color conversion logic
            let r = qualia.intensity * 0.8 + 0.2;
            let g = qualia.flow * 0.9 + 0.1;
            let b = qualia.precision;
            
            let color = Vec3::new(r.min(1.0), g.min(1.0), b.min(1.0));
            black_box(color);
        });
    });
    
    let mut group = c.benchmark_group("qualia_color_mapping_burst");
    
    for count in [10, 100, 1000] {
        group.bench_with_input(
            BenchmarkId::from_parameter(count),
            &count,
            |b, &count| {
                let qualias: Vec<QualiaState> = (0..count)
                    .map(|i| {
                        let t = i as f32 / count as f32;
                        QualiaState {
                            intensity: t,
                            precision: 1.0 - t,
                            aggression: 0.5,
                            flow: t * 0.8,
                            chaos: (1.0 - t) * 0.3,
                            recovery: 0.0,
                            transcendence: 0.0,
                            collection_window_end: 1000.0,
                        }
                    })
                    .collect();
                
                b.iter(|| {
                    let colors: Vec<Vec3> = qualias
                        .iter()
                        .map(|q| {
                            Vec3::new(
                                (q.intensity * 0.8 + 0.2).min(1.0),
                                (q.flow * 0.9 + 0.1).min(1.0),
                                q.precision.min(1.0),
                            )
                        })
                        .collect();
                    
                    black_box(colors);
                });
            },
        );
    }
    
    group.finish();
}

fn bench_transform_2d(c: &mut Criterion) {
    let mut group = c.benchmark_group("transform_2d_batch");
    
    for count in [100, 1000, 10_000] {
        group.bench_with_input(
            BenchmarkId::from_parameter(count),
            &count,
            |b, &count| {
                let positions: Vec<Vec2> = (0..count)
                    .map(|i| Vec2::new(i as f32, i as f32 * 0.5))
                    .collect();
                
                let velocities: Vec<Vec2> = (0..count)
                    .map(|i| Vec2::new((i % 10) as f32, ((i % 10) as f32) * 0.5))
                    .collect();
                
                let delta_time = 0.016; // 60 FPS
                
                b.iter(|| {
                    let results: Vec<Vec2> = positions
                        .iter()
                        .zip(velocities.iter())
                        .map(|(pos, vel)| *pos + *vel * delta_time)
                        .collect();
                    
                    black_box(results);
                });
            },
        );
    }
    
    group.finish();
}

criterion_group!(
    benches,
    bench_vec2_operations,
    bench_vec3_color_interpolation,
    bench_qualia_to_color_mapping,
    bench_transform_2d
);
criterion_main!(benches);

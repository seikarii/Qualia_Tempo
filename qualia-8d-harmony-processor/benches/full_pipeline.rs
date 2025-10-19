use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_full_pipeline(_c: &mut Criterion) {
    // TODO: Implement full pipeline benchmark
}

criterion_group!(benches, benchmark_full_pipeline);
criterion_main!(benches);

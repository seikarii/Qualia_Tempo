use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_midi_transcription(_c: &mut Criterion) {
    // TODO: Implement MIDI transcription benchmark
}

criterion_group!(benches, benchmark_midi_transcription);
criterion_main!(benches);

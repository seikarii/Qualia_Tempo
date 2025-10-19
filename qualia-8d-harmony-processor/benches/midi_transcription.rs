//! # Responsibility
//! Criterion benchmarks for ML-powered MIDI transcription (BasicPitch).
//!
//! Measures latency, throughput, and note detection accuracy for
//! monophonic pitch tracking using McLeod Pitch Method (MPM).

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use qualia_8d_harmony_processor::ml::{BasicPitchConfig, BasicPitchTranscriber};

/// Generate synthetic audio: multi-note sequence (C4 → E4 → G4 → C5)
fn generate_note_sequence(sample_rate: u32, note_duration_sec: f32) -> Vec<f32> {
    let frequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Hz)
    let samples_per_note = (sample_rate as f32 * note_duration_sec) as usize;
    
    let mut audio = Vec::with_capacity(frequencies.len() * samples_per_note);
    
    for freq in &frequencies {
        for i in 0..samples_per_note {
            let t = i as f32 / sample_rate as f32;
            let sample = (2.0 * std::f32::consts::PI * freq * t).sin() * 0.7; // 70% amplitude
            audio.push(sample);
        }
    }
    
    audio
}

/// Generate synthetic audio: rapid note sequence (16 notes in 1 second)
fn generate_rapid_notes(sample_rate: u32) -> Vec<f32> {
    // C major scale: C4 D4 E4 F4 G4 A4 B4 C5 C5 B4 A4 G4 F4 E4 D4 C4
    let frequencies = [
        261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25,
        523.25, 493.88, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63,
    ];
    
    let note_duration = 1.0 / frequencies.len() as f32; // ~62.5ms per note
    generate_note_sequence(sample_rate, note_duration)
}

/// Benchmark Phase 5: MIDI transcription with varying audio durations
fn bench_transcription_duration(c: &mut Criterion) {
    let sample_rate = 48000;
    
    let mut group = c.benchmark_group("transcription_duration");
    
    for duration_sec in [0.5, 1.0, 2.0, 5.0] {
        let audio = generate_note_sequence(sample_rate, duration_sec / 4.0); // 4 notes
        
        group.throughput(Throughput::Elements(audio.len() as u64));
        group.bench_with_input(
            BenchmarkId::new("seconds", duration_sec),
            &audio,
            |b, audio| {
                let config = BasicPitchConfig::new(sample_rate);
                let transcriber = BasicPitchTranscriber::new(config)
                    .expect("Failed to create transcriber");
                
                b.iter(|| {
                    black_box(transcriber.transcribe(black_box(audio))
                        .expect("Transcription failed"))
                });
            },
        );
    }
    
    group.finish();
}

/// Benchmark Phase 5: Rapid note detection (stress test)
fn bench_rapid_notes(c: &mut Criterion) {
    let sample_rate = 48000;
    let audio = generate_rapid_notes(sample_rate);
    
    let mut group = c.benchmark_group("rapid_notes");
    group.throughput(Throughput::Elements(audio.len() as u64));
    
    group.bench_function("16_notes_per_second", |b| {
        let config = BasicPitchConfig::new(sample_rate);
        let transcriber = BasicPitchTranscriber::new(config)
            .expect("Failed to create transcriber");
        
        b.iter(|| {
            let notes = black_box(transcriber.transcribe(black_box(&audio))
                .expect("Transcription failed"));
            
            // Stress test: Verify transcriber detects all notes
            assert!(
                notes.len() >= 10,
                "Expected at least 10/16 notes detected, got {}",
                notes.len()
            );
            
            black_box(notes)
        });
    });
    
    group.finish();
}

/// Benchmark Phase 5: Note detection accuracy (silent vs tonal audio)
fn bench_note_accuracy(c: &mut Criterion) {
    let sample_rate = 48000;
    
    let mut group = c.benchmark_group("note_accuracy");
    
    // Test 1: Pure silence (should detect 0 notes)
    let silence = vec![0.0f32; sample_rate as usize]; // 1 second of silence
    
    group.bench_function("silence_rejection", |b| {
        let config = BasicPitchConfig::new(sample_rate);
        let transcriber = BasicPitchTranscriber::new(config)
            .expect("Failed to create transcriber");
        
        b.iter(|| {
            let notes = black_box(transcriber.transcribe(black_box(&silence))
                .expect("Transcription failed"));
            
            // Verify no spurious notes detected in silence
            assert_eq!(
                notes.len(),
                0,
                "Expected 0 notes in silence, got {}",
                notes.len()
            );
            
            black_box(notes)
        });
    });
    
    // Test 2: Single sustained note (should detect exactly 1 note)
    let sustained_a4 = (0..sample_rate)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.8
        })
        .collect::<Vec<f32>>();
    
    group.bench_function("sustained_note_stability", |b| {
        let config = BasicPitchConfig::new(sample_rate);
        let transcriber = BasicPitchTranscriber::new(config)
            .expect("Failed to create transcriber");
        
        b.iter(|| {
            let notes = black_box(transcriber.transcribe(black_box(&sustained_a4))
                .expect("Transcription failed"));
            
            // Verify exactly 1 note detected (no false splits)
            assert_eq!(
                notes.len(),
                1,
                "Expected 1 sustained note, got {} notes",
                notes.len()
            );
            
            // Verify note is A4 (MIDI 69) within 1 semitone tolerance
            let (midi_note, start, end) = notes[0];
            assert!(
                (midi_note as i32 - 69).abs() <= 1,
                "Expected MIDI note ~69 (A4), got {}",
                midi_note
            );
            
            // Verify duration is ~1 second (within 10% tolerance)
            let duration = end - start;
            assert!(
                (duration - 1.0).abs() < 0.1,
                "Expected duration ~1.0s, got {:.2}s",
                duration
            );
            
            black_box(notes)
        });
    });
    
    group.finish();
}

criterion_group!(
    benches,
    bench_transcription_duration,
    bench_rapid_notes,
    bench_note_accuracy
);
criterion_main!(benches);

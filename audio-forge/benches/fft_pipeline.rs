//! # Responsibility
//! Performance benchmarks for FFT pipeline.
//!
//! ---
//!
//! Validates that FFT analysis meets <6ms latency requirement
//! under various buffer sizes and sample rates.

use audio_forge::services::audio_analyzer::AudioAnalyzerService;
use audio_forge::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use std::time::Instant;

fn main() {
    println!("🔥 FFT Pipeline Performance Benchmark");
    println!("======================================\n");

    // Test configurations
    let test_cases = vec![
        ("44.1kHz, 2048 samples", 44100, 2048),
        ("48kHz, 2048 samples", 48000, 2048),
        ("44.1kHz, 4096 samples", 44100, 4096),
        ("48kHz, 4096 samples", 48000, 4096),
    ];

    for (name, sample_rate, buffer_size) in test_cases {
        benchmark_fft_latency(name, sample_rate, buffer_size);
    }

    println!("\n✅ Benchmark Complete");
}

fn benchmark_fft_latency(name: &str, sample_rate: u32, buffer_size: usize) {
    let analyzer = AudioAnalyzerService::new(buffer_size);
    
    // Generate test signal (sine wave at 440 Hz)
    let samples: Vec<f32> = (0..buffer_size)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5
        })
        .collect();

    // Warmup (avoid cold cache effects)
    for _ in 0..10 {
        let _ = analyzer.analyze_spectrum(&samples, sample_rate);
    }

    // Benchmark (100 iterations)
    let iterations = 100;
    let mut latencies = Vec::with_capacity(iterations);

    for _ in 0..iterations {
        let start = Instant::now();
        let _ = analyzer.analyze_spectrum(&samples, sample_rate);
        let elapsed = start.elapsed();
        latencies.push(elapsed.as_micros());
    }

    // Calculate statistics
    latencies.sort_unstable();
    let min = latencies[0] as f64 / 1000.0;
    let max = latencies[latencies.len() - 1] as f64 / 1000.0;
    let avg = latencies.iter().sum::<u128>() as f64 / (iterations as f64 * 1000.0);
    let p50 = latencies[iterations / 2] as f64 / 1000.0;
    let p95 = latencies[iterations * 95 / 100] as f64 / 1000.0;
    let p99 = latencies[iterations * 99 / 100] as f64 / 1000.0;

    // Print results
    println!("📊 {}", name);
    println!("   Min:    {:.3} ms", min);
    println!("   Avg:    {:.3} ms", avg);
    println!("   p50:    {:.3} ms", p50);
    println!("   p95:    {:.3} ms", p95);
    println!("   p99:    {:.3} ms", p99);
    println!("   Max:    {:.3} ms", max);
    
    // Validate <6ms requirement
    if p99 < 6.0 {
        println!("   Status: ✅ PASS (p99 < 6ms)\n");
    } else {
        println!("   Status: ❌ FAIL (p99 >= 6ms)\n");
    }
}

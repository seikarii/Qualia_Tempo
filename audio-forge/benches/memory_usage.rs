//! # Responsibility
//! Memory usage benchmark for audio pipeline with real tracking.
//!
//! ---
//!
//! Validates memory consumption stays under 120MB during playback simulation.
//! Uses custom allocator to track peak memory usage accurately.

use audio_forge::services::audio_analyzer::AudioAnalyzerService;
use audio_forge::services::audio_effects::AudioEffectsService;
use audio_forge::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use audio_forge::services::interfaces::i_audio_effects::IAudioEffects;
use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;

/// # Responsibility
/// Custom allocator that tracks memory usage.
struct MemoryTracker;

static ALLOCATED: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);

unsafe impl GlobalAlloc for MemoryTracker {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ret = System.alloc(layout);
        if !ret.is_null() {
            let size = layout.size();
            let current = ALLOCATED.fetch_add(size, Ordering::Relaxed) + size;
            
            // Update peak atomically
            let mut peak = PEAK.load(Ordering::Relaxed);
            while current > peak {
                match PEAK.compare_exchange_weak(
                    peak,
                    current,
                    Ordering::Relaxed,
                    Ordering::Relaxed,
                ) {
                    Ok(_) => break,
                    Err(p) => peak = p,
                }
            }
        }
        ret
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        ALLOCATED.fetch_sub(layout.size(), Ordering::Relaxed);
        System.dealloc(ptr, layout);
    }
}

#[global_allocator]
static GLOBAL: MemoryTracker = MemoryTracker;

fn main() {
    println!("💾 Memory Usage Benchmark");
    println!("=========================\n");

    // Simulate realistic playback scenario
    let analyzer = AudioAnalyzerService::default();
    let effects = AudioEffectsService::default();
    
    // 5 minutes of audio at 44.1kHz stereo = ~26.5M samples
    let total_samples = 44100 * 2 * 60 * 5;
    let chunk_size = 4096;
    let chunks = total_samples / chunk_size;
    
    println!("📊 Simulation Parameters:");
    println!("   Duration:      5 minutes");
    println!("   Sample Rate:   44.1kHz");
    println!("   Channels:      Stereo");
    println!("   Total Samples: {} ({:.1} MB raw)", total_samples, (total_samples * 4) as f64 / 1_000_000.0);
    println!("   Chunk Size:    {}", chunk_size);
    println!("   Total Chunks:  {}\n", chunks);

    let mut processed_chunks = 0;
    let start = Instant::now();
    
    // Process audio chunks
    for i in 0..chunks {
        // Generate chunk (simulating decoder output)
        let samples: Vec<f32> = (0..chunk_size)
            .map(|j| {
                let t = ((i * chunk_size + j) as f32) / 44100.0;
                (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5
            })
            .collect();
        
        // Analyze (FFT)
        let spectrum = analyzer.analyze_spectrum(&samples, 44100).unwrap();
        
        // Apply effects
        let mut effected = samples.clone();
        let elapsed_time = (i * chunk_size) as f32 / 44100.0;
        let _ = effects.apply_8d_effect(&mut effected, 44100, elapsed_time);
        let _ = effects.apply_drop_effect(&mut effected);
        let _ = effects.apply_bass_boost(&mut effected, 44100);
        
        // Detect instruments
        let _ = analyzer.detect_instruments(&spectrum);
        
        processed_chunks += 1;
        
        // Progress indicator every 10 seconds
        if i % (44100 * 2 * 10 / chunk_size) == 0 {
            let elapsed = start.elapsed().as_secs_f64();
            let throughput = processed_chunks as f64 / elapsed;
            println!("   Progress: {:.1}% ({} chunks/s)", 
                (i as f64 / chunks as f64) * 100.0, 
                throughput as u32);
        }
    }
    
    let elapsed = start.elapsed();
    let throughput = total_samples as f64 / elapsed.as_secs_f64();
    
    // Get actual memory metrics
    let peak_bytes = PEAK.load(Ordering::Relaxed);
    let current_bytes = ALLOCATED.load(Ordering::Relaxed);
    let peak_mb = peak_bytes as f64 / 1_000_000.0;
    let current_mb = current_bytes as f64 / 1_000_000.0;
    
    println!("\n✅ Processing Complete:");
    println!("   Total Time:  {:.2}s", elapsed.as_secs_f64());
    println!("   Throughput:  {:.1}x realtime", throughput / 44100.0);
    
    println!("\n� Memory Usage (Actual Measurements):");
    println!("   Current:     {:.2} MB", current_mb);
    println!("   Peak:        {:.2} MB", peak_mb);
    println!("   Target:      <120 MB");
    
    if peak_mb < 120.0 {
        println!("\n✅ PASS: Peak memory usage ({:.2} MB) is below 120 MB target", peak_mb);
    } else {
        println!("\n❌ FAIL: Peak memory usage ({:.2} MB) exceeds 120 MB target", peak_mb);
    }
    
    println!("\n📊 Memory Efficiency:");
    println!("   Usage:       {:.1}% of target", (peak_mb / 120.0) * 100.0);
}

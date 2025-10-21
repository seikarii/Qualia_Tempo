//! Comprehensive WAV file analysis

use hound;

#[test]
fn test_analyze_wav_full_stats() {
    let path = "output_optimized/ecosdepasos_8d.wav";
    let mut reader = hound::WavReader::open(path).unwrap();
    
    let spec = reader.spec();
    assert_eq!(spec.bits_per_sample, 24);
    
    let max_24bit = 8388607.0; // 2^23 - 1
    
    // Read ALL samples and analyze
    let samples: Vec<f32> = reader.samples::<i32>()
        .map(|s| s.unwrap() as f32 / max_24bit)
        .collect();
    
    let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    let zero_count = samples.iter().filter(|&&s| s.abs() < 0.001).count();
    let clipped_count = samples.iter().filter(|&&s| s.abs() > 0.99).count();
    
    println!("\n═══════════════════════════════════════");
    println!("FULL WAV FILE ANALYSIS (24-bit → f32):");
    println!("═══════════════════════════════════════");
    println!("Total samples: {}", samples.len());
    println!("Peak: {:.6}", peak);
    println!("RMS: {:.6}", rms);
    println!("RMS (dB): {:.2}", 20.0 * rms.max(0.0001).log10());
    println!("Zero samples: {}/{} ({:.2}%)", 
        zero_count, samples.len(),
        zero_count as f32 / samples.len() as f32 * 100.0);
    println!("Clipped (>0.99): {}/{} ({:.4}%)", 
        clipped_count, samples.len(),
        clipped_count as f32 / samples.len() as f32 * 100.0);
    
    // Find first 10 non-zero samples
    println!("\nFirst 10 non-zero samples:");
    let mut count = 0;
    for (i, &sample) in samples.iter().enumerate() {
        if sample.abs() > 0.001 {
            println!("  Index {}: {:.6}", i, sample);
            count += 1;
            if count >= 10 { break; }
        }
    }
    
    // Find max sample
    if let Some((idx, &val)) = samples.iter().enumerate().max_by(|(_, a), (_, b)| a.abs().partial_cmp(&b.abs()).unwrap()) {
        println!("\nPeak sample:");
        println!("  Index {}: {:.6}", idx, val);
    }
    
    println!("═══════════════════════════════════════\n");
}

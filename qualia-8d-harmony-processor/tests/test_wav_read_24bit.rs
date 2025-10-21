//! Test to verify 24-bit WAV reading

use hound;

#[test]
fn test_read_24bit_wav_spec() {
    let path = "output_optimized/ecosdepasos_8d.wav";
    let reader = hound::WavReader::open(path).unwrap();
    
    let spec = reader.spec();
    println!("\n═══════════════════════════════");
    println!("WAV File Specification:");
    println!("═══════════════════════════════");
    println!("Sample Rate: {}", spec.sample_rate);
    println!("Channels: {}", spec.channels);
    println!("Bits Per Sample: {}", spec.bits_per_sample);
    println!("Sample Format: {:?}", spec.sample_format);
    println!("═══════════════════════════════\n");
    
    assert_eq!(spec.bits_per_sample, 24, "Expected 24-bit samples");
    assert_eq!(spec.sample_format, hound::SampleFormat::Int, "Expected Int format");
}

#[test]
fn test_read_24bit_sample_values() {
    let path = "output_optimized/ecosdepasos_8d.wav";
    let mut reader = hound::WavReader::open(path).unwrap();
    
    let spec = reader.spec();
    
    // Read first 100 samples as i32 (24-bit stored in i32)
    let samples: Vec<i32> = reader.samples::<i32>().take(100).map(|s| s.unwrap()).collect();
    
    println!("\n═══════════════════════════════");
    println!("First 50 samples (24-bit as i32):");
    println!("═══════════════════════════════");
    for (i, &sample) in samples.iter().take(50).enumerate() {
        let normalized = sample as f32 / 8388607.0; // 2^23 - 1
        println!("Sample {}: {:10} (raw) = {:.6} (normalized)", i, sample, normalized);
    }
    println!("═══════════════════════════════\n");
    
    // Check peak
    let max_24bit = 8388607.0; // 2^23 - 1
    let peak = samples.iter().map(|&s| (s as f32 / max_24bit).abs()).fold(0.0f32, f32::max);
    
    println!("Peak amplitude: {:.6}", peak);
    assert!(peak <= 1.0, "Peak {} exceeds 1.0", peak);
}

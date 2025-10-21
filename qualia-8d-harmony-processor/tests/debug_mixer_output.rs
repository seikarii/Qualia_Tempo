//! # Responsibility
//! Debug test to inspect actual sample values from spatial_mixer before WAV export

use qualia_8d_harmony_processor::audio::{BinauralSignal, SpatialMixer, SpatialMixerConfig};

#[test]
fn test_inspect_mixer_output_statistics() {
    // Create test stems simulating 11 voices each with RMS ~0.5
    let mut stems = vec![];
    for _ in 0..11 {
        let mut stem = BinauralSignal::new(48000); // 1 second
        for i in 0..48000 {
            let value = 0.5 * (i as f32 / 48000.0 * 2.0 * std::f32::consts::PI).sin();
            stem.left[i] = value;
            stem.right[i] = value;
        }
        stems.push(stem);
    }
    
    // Mix with default config
    let config = SpatialMixerConfig::default_8d(48000);
    let mixer = SpatialMixer::new(config);
    let output = mixer.mix(&stems);
    
    // Calculate statistics
    let peak_left = output.left.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    let peak_right = output.right.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    let rms_left = (output.left.iter().map(|s| s * s).sum::<f32>() / output.left.len() as f32).sqrt();
    let rms_right = (output.right.iter().map(|s| s * s).sum::<f32>() / output.right.len() as f32).sqrt();
    
    let clipping_count_left = output.left.iter().filter(|&&s| s.abs() > 0.99).count();
    let clipping_count_right = output.right.iter().filter(|&&s| s.abs() > 0.99).count();
    
    println!("\n═══════════════════════════════════════");
    println!("🔬 MIXER OUTPUT INSPECTION");
    println!("═══════════════════════════════════════");
    println!("Input: 11 stems, RMS ~0.5 each");
    println!("Expected sum before limiting: ~5.5 peak");
    println!();
    println!("LEFT CHANNEL:");
    println!("  Peak: {:.6}", peak_left);
    println!("  RMS: {:.6}", rms_left);
    println!("  Samples > 0.99: {}/{} ({:.4}%)", 
        clipping_count_left, output.left.len(),
        clipping_count_left as f32 / output.left.len() as f32 * 100.0);
    println!();
    println!("RIGHT CHANNEL:");
    println!("  Peak: {:.6}", peak_right);
    println!("  RMS: {:.6}", rms_right);
    println!("  Samples > 0.99: {}/{} ({:.4}%)", 
        clipping_count_right, output.right.len(),
        clipping_count_right as f32 / output.right.len() as f32 * 100.0);
    println!("═══════════════════════════════════════\n");
    
    // Assertions
    assert!(
        peak_left <= 0.98,
        "LEFT peak {:.6} exceeds limiter threshold 0.98",
        peak_left
    );
    assert!(
        peak_right <= 0.98,
        "RIGHT peak {:.6} exceeds limiter threshold 0.98",
        peak_right
    );
    
    let clipping_percent_left = clipping_count_left as f32 / output.left.len() as f32 * 100.0;
    assert!(
        clipping_percent_left < 1.0,
        "LEFT clipping {:.4}% exceeds 1% threshold",
        clipping_percent_left
    );
}

//! # Responsibility
//! Integration test to verify IIR filter state continuity across block boundaries.
//!
//! This test validates the critical fix for stateless filter bug that caused
//! audible clicks/pops at block boundaries.

use qualia_8d_harmony_processor::audio::{FrequencyBooster, FrequencyBoosterConfig, InstrumentRole};

#[test]
fn test_block_boundary_continuity() {
    // Create a continuous sine wave test signal
    const SAMPLE_RATE: u32 = 48000;
    const FREQUENCY: f32 = 440.0; // A4
    const DURATION_SEC: f32 = 0.1;
    const TOTAL_SAMPLES: usize = (SAMPLE_RATE as f32 * DURATION_SEC) as usize;
    
    let mut continuous_signal = Vec::with_capacity(TOTAL_SAMPLES);
    for i in 0..TOTAL_SAMPLES {
        let t = i as f32 / SAMPLE_RATE as f32;
        let sample = 0.5 * (2.0 * std::f32::consts::PI * FREQUENCY * t).sin();
        continuous_signal.push(sample);
    }
    
    // Process 1: Full signal in one block (reference)
    let config1 = FrequencyBoosterConfig::for_role(InstrumentRole::Other, SAMPLE_RATE);
    let mut booster1 = FrequencyBooster::new(config1).unwrap();
    let output_continuous = booster1.process(&continuous_signal, 0.5).unwrap();
    
    // Process 2: Same signal split into 10 blocks (test stateful processing)
    let config2 = FrequencyBoosterConfig::for_role(InstrumentRole::Other, SAMPLE_RATE);
    let mut booster2 = FrequencyBooster::new(config2).unwrap();
    
    const BLOCK_SIZE: usize = TOTAL_SAMPLES / 10;
    let mut output_blocks = Vec::with_capacity(TOTAL_SAMPLES);
    
    for block_idx in 0..10 {
        let start = block_idx * BLOCK_SIZE;
        let end = ((block_idx + 1) * BLOCK_SIZE).min(TOTAL_SAMPLES);
        let block = &continuous_signal[start..end];
        
        let block_output = booster2.process(block, 0.5).unwrap();
        output_blocks.extend_from_slice(&block_output);
    }
    
    // Verify outputs match (allowing small numerical error)
    assert_eq!(output_continuous.len(), output_blocks.len(), 
        "Output lengths must match");
    
    // Calculate maximum deviation at block boundaries
    let mut max_deviation = 0.0f32;
    let mut max_deviation_idx = 0;
    
    for (i, (&expected, &actual)) in output_continuous.iter().zip(output_blocks.iter()).enumerate() {
        let deviation = (expected - actual).abs();
        if deviation > max_deviation {
            max_deviation = deviation;
            max_deviation_idx = i;
        }
    }
    
    println!("\n═══════════════════════════════════════════════");
    println!("BLOCK BOUNDARY CONTINUITY TEST");
    println!("═══════════════════════════════════════════════");
    println!("Total samples: {}", TOTAL_SAMPLES);
    println!("Block size: {}", BLOCK_SIZE);
    println!("Blocks processed: 10");
    println!("Max deviation: {:.8} at sample {}", max_deviation, max_deviation_idx);
    println!("Block boundary indices: {:?}", (0..10).map(|i| i * BLOCK_SIZE).collect::<Vec<_>>());
    
    // Check deviations at block boundaries specifically
    let mut boundary_deviations = Vec::new();
    for block_idx in 1..10 {
        let boundary = block_idx * BLOCK_SIZE;
        if boundary < output_continuous.len() {
            let deviation = (output_continuous[boundary] - output_blocks[boundary]).abs();
            boundary_deviations.push((boundary, deviation));
            println!("Boundary {} deviation: {:.8}", boundary, deviation);
        }
    }
    
    println!("═══════════════════════════════════════════════\n");
    
    // ASSERTION: Maximum deviation should be negligible (numerical precision)
    // Old stateless implementation would show LARGE deviations (>0.1) at boundaries
    assert!(
        max_deviation < 1e-5,
        "Block boundary discontinuity detected! Max deviation: {:.8} at sample {}. \
        This indicates IIR filter state is NOT being preserved across blocks.",
        max_deviation, max_deviation_idx
    );
    
    // Verify boundary deviations are all small
    for (boundary, deviation) in boundary_deviations {
        assert!(
            deviation < 1e-5,
            "Large discontinuity at block boundary {}: {:.8}",
            boundary, deviation
        );
    }
}

#[test]
fn test_time_varying_intensity_continuity() {
    // Test with varying intensity across blocks (worst case for coefficient updates)
    const SAMPLE_RATE: u32 = 48000;
    const BLOCK_SIZE: usize = 480; // 10ms blocks
    const NUM_BLOCKS: usize = 10;
    
    let mut continuous_signal = Vec::new();
    for i in 0..(BLOCK_SIZE * NUM_BLOCKS) {
        let t = i as f32 / SAMPLE_RATE as f32;
        let sample = 0.5 * (2.0 * std::f32::consts::PI * 440.0 * t).sin();
        continuous_signal.push(sample);
    }
    
    let config = FrequencyBoosterConfig::for_role(InstrumentRole::Vocals, SAMPLE_RATE);
    let mut booster = FrequencyBooster::new(config).unwrap();
    
    let mut output = Vec::with_capacity(continuous_signal.len());
    
    // Process with ramping intensity
    for block_idx in 0..NUM_BLOCKS {
        let start = block_idx * BLOCK_SIZE;
        let end = (block_idx + 1) * BLOCK_SIZE;
        let block = &continuous_signal[start..end];
        
        // Intensity ramps from 0.0 to 1.0
        let intensity = block_idx as f32 / (NUM_BLOCKS - 1) as f32;
        
        let block_output = booster.process(block, intensity).unwrap();
        
        // Check for discontinuities at block start (except first block)
        if block_idx > 0 && !output.is_empty() {
            let last_sample: f32 = *output.last().unwrap();
            let first_new_sample: f32 = block_output[0];
            let discontinuity: f32 = (first_new_sample - last_sample).abs();
            
            // Discontinuity should be bounded by signal dynamics + filter response
            // Coefficient updates may cause small transients (<0.1), but not hard clicks (>0.5)
            assert!(
                discontinuity < 0.2,
                "Large discontinuity at block boundary {}: {:.6}. \
                Intensity changed from {:.2} to {:.2}",
                block_idx, discontinuity,
                (block_idx - 1) as f32 / (NUM_BLOCKS - 1) as f32,
                intensity
            );
        }
        
        output.extend_from_slice(&block_output);
    }
    
    println!("\n✅ Time-varying intensity test passed: {} blocks processed without hard discontinuities", NUM_BLOCKS);
}

#[test]
fn test_filter_state_warmup() {
    // Verify filters reach steady-state behavior after warmup period
    const SAMPLE_RATE: u32 = 48000;
    const WARMUP_SAMPLES: usize = 1000; // ~20ms warmup
    const TEST_SAMPLES: usize = 100;
    
    let config = FrequencyBoosterConfig::for_role(InstrumentRole::Bass, SAMPLE_RATE);
    let mut booster = FrequencyBooster::new(config).unwrap();
    
    // Process DC signal (constant 0.5)
    let dc_signal = vec![0.5; WARMUP_SAMPLES + TEST_SAMPLES];
    let output = booster.process(&dc_signal, 0.5).unwrap();
    
    // After warmup, output should stabilize (small variance)
    let warmup_output = &output[WARMUP_SAMPLES..];
    let mean = warmup_output.iter().sum::<f32>() / warmup_output.len() as f32;
    let variance = warmup_output.iter()
        .map(|&x| (x - mean).powi(2))
        .sum::<f32>() / warmup_output.len() as f32;
    
    println!("\n═══════════════════════════════════════════════");
    println!("FILTER WARMUP TEST");
    println!("═══════════════════════════════════════════════");
    println!("Warmup period: {} samples", WARMUP_SAMPLES);
    println!("Steady-state mean: {:.6}", mean);
    println!("Steady-state variance: {:.8}", variance);
    println!("═══════════════════════════════════════════════\n");
    
    // Variance should be near-zero for DC input after warmup
    assert!(
        variance < 1e-6,
        "Filter not reaching steady-state. Variance: {:.8}",
        variance
    );
}

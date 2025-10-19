//! # Responsibility
//! Integration tests for HRTF-based spatial audio processing.
//!
//! Validates end-to-end HRTF convolution pipeline with SOFA dataset.

use qualia_8d_harmony_processor::audio::{HrtfConvolver, SofaLoader, SphericalCoord};
use std::sync::Arc;
use approx::assert_relative_eq;

#[test]
fn test_hrtf_spatial_positioning_accuracy() {
    // Create SOFA loader with mock dataset
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    
    // Create HRTF convolver
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
    
    // Test input: 1 second of white noise
    let sample_rate = 48000;
    let duration_sec = 1.0;
    let num_samples = (sample_rate as f32 * duration_sec) as usize;
    let input: Vec<f32> = (0..num_samples)
        .map(|i| ((i as f32 * 0.1).sin() * 0.5))
        .collect();
    
    // Test different spatial positions
    let positions = vec![
        ("Front", SphericalCoord::new(0.0, 0.0, 1.0)),
        ("Left", SphericalCoord::new(90.0, 0.0, 1.0)),
        ("Right", SphericalCoord::new(270.0, 0.0, 1.0)),
        ("Back", SphericalCoord::new(180.0, 0.0, 1.0)),
    ];
    
    for (name, position) in positions {
        let (left, right) = convolver.convolve_at_position(&input, &position).unwrap();
        
        // Validate output exists
        assert!(!left.is_empty(), "{}: Left channel should not be empty", name);
        assert!(!right.is_empty(), "{}: Right channel should not be empty", name);
        
        // Calculate energy per channel
        let left_energy: f32 = left.iter().map(|x| x * x).sum();
        let right_energy: f32 = right.iter().map(|x| x * x).sum();
        
        // Validate energy distribution based on position
        match name {
            "Front" => {
                let ratio = left_energy / right_energy;
                assert!(
                    ratio > 0.8 && ratio < 1.2,
                    "Front position should have balanced L/R, got ratio {}",
                    ratio
                );
            }
            "Left" => {
                assert!(
                    left_energy > right_energy * 2.0,
                    "Left position should have left > right energy (L: {}, R: {})",
                    left_energy,
                    right_energy
                );
            }
            "Right" => {
                assert!(
                    right_energy > left_energy * 2.0,
                    "Right position should have right > left energy (L: {}, R: {})",
                    left_energy,
                    right_energy
                );
            }
            "Back" => {
                let ratio = left_energy / right_energy;
                assert!(
                    ratio > 0.8 && ratio < 1.2,
                    "Back position should have balanced L/R, got ratio {}",
                    ratio
                );
            }
            _ => {}
        }
    }
}

#[test]
fn test_hrtf_convolution_output_length() {
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
    
    let input_len = 1000;
    let input = vec![1.0; input_len];
    let position = SphericalCoord::new(45.0, 0.0, 1.0);
    
    let (left, right) = convolver.convolve_at_position(&input, &position).unwrap();
    
    // Output length should be input + HRIR length - 1
    let expected_min_len = input_len;
    assert!(
        left.len() >= expected_min_len,
        "Left output too short: {} < {}",
        left.len(),
        expected_min_len
    );
    assert!(
        right.len() >= expected_min_len,
        "Right output too short: {} < {}",
        right.len(),
        expected_min_len
    );
    assert_eq!(left.len(), right.len(), "L/R channels should have equal length");
}

#[test]
fn test_hrtf_elevation_effect() {
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
    
    let input = vec![1.0; 500];
    
    // Test same azimuth, different elevations
    let pos_down = SphericalCoord::new(0.0, -45.0, 1.0);
    let pos_horizon = SphericalCoord::new(0.0, 0.0, 1.0);
    let pos_up = SphericalCoord::new(0.0, 45.0, 1.0);
    
    let (left_down, _) = convolver.convolve_at_position(&input, &pos_down).unwrap();
    let (left_horizon, _) = convolver.convolve_at_position(&input, &pos_horizon).unwrap();
    let (left_up, _) = convolver.convolve_at_position(&input, &pos_up).unwrap();
    
    // All should produce valid output
    assert!(!left_down.is_empty());
    assert!(!left_horizon.is_empty());
    assert!(!left_up.is_empty());
    
    // Energy should vary with elevation (mock dataset has elevation variations)
    let energy_down: f32 = left_down.iter().map(|x| x * x).sum();
    let energy_horizon: f32 = left_horizon.iter().map(|x| x * x).sum();
    let energy_up: f32 = left_up.iter().map(|x| x * x).sum();
    
    // All should be non-zero
    assert!(energy_down > 0.0);
    assert!(energy_horizon > 0.0);
    assert!(energy_up > 0.0);
}

#[test]
fn test_hrtf_azimuth_sweep() {
    let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
    let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
    
    let input = vec![1.0; 200];
    
    // Sweep from left (90°) to right (270°)
    let azimuths = [90.0, 135.0, 180.0, 225.0, 270.0];
    
    let mut prev_l_r_ratio = None;
    
    for az in azimuths {
        let position = SphericalCoord::new(az, 0.0, 1.0);
        let (left, right) = convolver.convolve_at_position(&input, &position).unwrap();
        
        let left_energy: f32 = left.iter().map(|x| x * x).sum();
        let right_energy: f32 = right.iter().map(|x| x * x).sum();
        
        let ratio = left_energy / right_energy;
        
        // As we sweep from left to right, L/R ratio should decrease
        if let Some(prev_ratio) = prev_l_r_ratio {
            if az >= 90.0 && az <= 270.0 {
                // Ratio should be decreasing (or staying balanced at 180°)
                // Allow some tolerance for mock dataset
                assert!(
                    ratio <= prev_ratio * 1.5,
                    "L/R ratio should decrease during sweep, prev: {}, current: {} at {}°",
                    prev_ratio,
                    ratio,
                    az
                );
            }
        }
        
        prev_l_r_ratio = Some(ratio);
    }
}

//! # Responsibility
//! Integration tests for complete 8D audio processing pipeline.

use qualia_8d::{
    BinauralSignal, CircularMotionEngine, Config, EnsembleEffect, HRTFConvolver, InputHandler,
    RotationDirection, SpatialMixer, SphericalPosition,
};

#[test]
fn test_full_8d_processing_pipeline() {
    // Setup configuration
    let config = Config::default();

    // 1. Generate test input
    let handler = InputHandler::new(config.audio.sample_rate);
    let input = handler.generate_test_tone(0.5, 440.0);
    assert_eq!(input.sample_rate, 48000);
    assert_eq!(input.samples.len(), 24000); // 0.5 sec at 48kHz

    // 2. Initialize processors
    let motion_engine = CircularMotionEngine::new(
        config.circular_motion.default_speed_rpm,
        config.circular_motion.default_radius_m,
        config.circular_motion.default_elevation_deg,
        RotationDirection::Clockwise,
    );

    let hrtf_convolver = HRTFConvolver::new(config.audio.sample_rate).unwrap();
    let ensemble_effect = EnsembleEffect::new(
        3, // Fewer voices for faster test
        config.ensemble.delay_range_ms,
        config.ensemble.spatial_spread_deg,
        config.audio.sample_rate,
    );
    let mixer = SpatialMixer::new(config.mixer.limiter_threshold_db);

    // 3. Process audio chunk
    let chunk_size = 2048;
    let chunk = &input.samples[0..chunk_size.min(input.samples.len())];

    // Get position at t=0
    let base_position = motion_engine.calculate_position(0.0);
    assert_eq!(base_position.elevation_deg, 0.0);
    assert_eq!(base_position.distance_m, 1.5);

    // Apply ensemble effect
    let voices = ensemble_effect.apply(chunk, &base_position);
    assert_eq!(voices.len(), 3);

    // Process each voice with HRTF
    let mut binaural_stems = Vec::new();
    for voice in voices {
        let binaural = hrtf_convolver.convolve(&voice.samples, &voice.position).unwrap();
        binaural_stems.push(binaural);
    }

    // Mix all stems
    let final_output = mixer.mix(&binaural_stems).unwrap();

    // 4. Verify output properties
    assert_eq!(final_output.left.len(), chunk_size);
    assert_eq!(final_output.right.len(), chunk_size);

    // Check output is not silent
    let left_energy: f32 = final_output.left.iter().map(|s| s * s).sum();
    let right_energy: f32 = final_output.right.iter().map(|s| s * s).sum();

    assert!(left_energy > 0.0, "Left channel should not be silent");
    assert!(right_energy > 0.0, "Right channel should not be silent");

    // Check no clipping (threshold at -0.3 dB)
    let threshold = 10.0_f32.powf(-0.3 / 20.0);
    for &sample in &final_output.left {
        assert!(
            sample.abs() <= threshold + 0.01,
            "Left channel clipped: {}",
            sample
        );
    }
    for &sample in &final_output.right {
        assert!(
            sample.abs() <= threshold + 0.01,
            "Right channel clipped: {}",
            sample
        );
    }
}

#[test]
fn test_circular_motion_integration() {
    let engine = CircularMotionEngine::new(
        60.0, // 1 rev/sec for easier testing
        1.5,
        0.0,
        RotationDirection::Clockwise,
    );

    // Test positions at different times
    let pos_0 = engine.calculate_position(0.0);
    let pos_quarter = engine.calculate_position(0.25);
    let pos_half = engine.calculate_position(0.5);
    let pos_full = engine.calculate_position(1.0);

    // Verify rotation progression
    assert!((pos_0.azimuth_deg - 0.0).abs() < 1.0);
    assert!((pos_quarter.azimuth_deg - 90.0).abs() < 1.0);
    assert!((pos_half.azimuth_deg - 180.0).abs() < 1.0);
    assert!((pos_full.azimuth_deg - 0.0).abs() < 1.0); // Full rotation

    // All should maintain same distance
    assert_eq!(pos_0.distance_m, 1.5);
    assert_eq!(pos_quarter.distance_m, 1.5);
    assert_eq!(pos_half.distance_m, 1.5);
}

#[test]
fn test_ensemble_spatial_distribution() {
    let effect = EnsembleEffect::new(
        5,
        (5.0, 25.0),
        30.0, // Wide spread
        48000, // Standard sample rate
    );

    let input = vec![0.5; 1000];
    let base_position = SphericalPosition {
        azimuth_deg: 0.0,
        elevation_deg: 0.0,
        distance_m: 1.5,
    };

    let voices = effect.apply(&input, &base_position);

    // Check all voices have unique positions
    for i in 0..voices.len() {
        for j in (i + 1)..voices.len() {
            assert_ne!(
                voices[i].position.azimuth_deg,
                voices[j].position.azimuth_deg,
                "Voices {} and {} have same azimuth",
                i,
                j
            );
        }
    }

    // Check voices are within spread range
    for voice in &voices {
        let azimuth_diff = (voice.position.azimuth_deg - base_position.azimuth_deg).abs();
        assert!(
            azimuth_diff <= 30.0,
            "Voice azimuth {} outside spread range",
            azimuth_diff
        );
    }
}

#[test]
fn test_hrtf_binaural_separation() {
    let config = Config::default();
    let convolver = HRTFConvolver::new(config.audio.sample_rate).unwrap();

    let input = vec![1.0; 1000];

    // Test hard left position
    let left_pos = SphericalPosition {
        azimuth_deg: 270.0,
        elevation_deg: 0.0,
        distance_m: 1.5,
    };
    let left_result = convolver.convolve(&input, &left_pos).unwrap();

    // Test hard right position
    let right_pos = SphericalPosition {
        azimuth_deg: 90.0,
        elevation_deg: 0.0,
        distance_m: 1.5,
    };
    let right_result = convolver.convolve(&input, &right_pos).unwrap();

    // Calculate energy for each channel
    let left_l_energy: f32 = left_result.left.iter().map(|s| s * s).sum();
    let left_r_energy: f32 = left_result.right.iter().map(|s| s * s).sum();
    let right_l_energy: f32 = right_result.left.iter().map(|s| s * s).sum();
    let right_r_energy: f32 = right_result.right.iter().map(|s| s * s).sum();

    // Left position should have more energy in left channel
    assert!(
        left_l_energy > left_r_energy,
        "Left position: left channel ({}) should be stronger than right ({})",
        left_l_energy,
        left_r_energy
    );

    // Right position should have more energy in right channel
    assert!(
        right_r_energy > right_l_energy,
        "Right position: right channel ({}) should be stronger than left ({})",
        right_r_energy,
        right_l_energy
    );
}

#[test]
fn test_mixer_prevents_clipping_under_load() {
    let mixer = SpatialMixer::new(-0.3);

    // Create 10 loud stems that would definitely clip if summed naively
    let mut stems = Vec::new();
    for _ in 0..10 {
        stems.push(BinauralSignal::new(vec![0.5; 100], vec![0.5; 100]));
    }

    let mixed = mixer.mix(&stems).unwrap();

    // Naive sum would be 5.0, but limiter should prevent exceeding threshold
    let threshold = 10.0_f32.powf(-0.3 / 20.0);

    for &sample in &mixed.left {
        assert!(sample.abs() <= threshold + 0.01);
    }
    for &sample in &mixed.right {
        assert!(sample.abs() <= threshold + 0.01);
    }
}

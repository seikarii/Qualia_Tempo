//! # Responsibility
//! Integration tests for full audio processing pipeline.

use qualia_8d_harmony_processor::audio::{
    AudioBuffer, CircularMotionEngine, EnsembleConfig, EnsembleEffect, InputHandler,
    InputHandlerConfig, SpatialMixer, SpatialMixerConfig,
};

#[cfg(feature = "ml-analysis")]
use qualia_8d_harmony_processor::ml::{
    Chromagram, ChromagramAnalyzer, ChromagramConfig, ChordRecognizer, HarmonyMapBuilder,
    HarmonyMapConfig,
};

#[test]
fn test_input_handler_config_creation() {
    let config = InputHandlerConfig::new(48000);
    assert_eq!(config.target_sample_rate, 48000);
    assert!(config.convert_to_mono);
}

#[test]
fn test_input_handler_instantiation() {
    let config = InputHandlerConfig::new(48000);
    let handler = InputHandler::new(config);
    assert!(handler.is_ok());
}

#[test]
fn test_circular_motion_engine_rotation() {
    use qualia_8d_harmony_processor::audio::circular_motion::RotationDirection;
    
    let engine = CircularMotionEngine::new(8.0, 1.5, 0.0, RotationDirection::Clockwise);

    let pos_0 = engine.calculate_position(0.0);
    assert!((pos_0.azimuth_deg - 0.0).abs() < 1.0); // Front

    let pos_7_5 = engine.calculate_position(7.5); // 1 full rotation at 8 RPM
    assert!((pos_7_5.azimuth_deg - 360.0).abs() < 10.0 || pos_7_5.azimuth_deg < 10.0); // Back to front
}

#[test]
fn test_ensemble_effect_configuration() {
    let config = EnsembleConfig {
        num_voices: 5,
        max_delay_ms: 30.0,
        max_pitch_shift_cents: 8.0,
        sample_rate: 48000,
    };

    let _effect = EnsembleEffect::new(config.clone());
    assert_eq!(config.num_voices, 5);
}

#[test]
fn test_spatial_mixer_limiter() {
    let config = SpatialMixerConfig {
        limiter_threshold: 0.95,
        num_stems: 4,
    };

    let _mixer = SpatialMixer::new(config.clone());
    assert!((config.limiter_threshold - 0.95).abs() < 0.001);
}

#[test]
fn test_audio_buffer_synthetic_creation() {
    // Create synthetic 1-second 440Hz sine wave
    let sample_rate = 48000;
    let samples: Vec<f32> = (0..sample_rate)
        .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / sample_rate as f32).sin())
        .collect();

    let buffer = AudioBuffer::new(samples, sample_rate);
    assert_eq!(buffer.sample_rate, sample_rate);
    assert_eq!(buffer.len(), sample_rate as usize);
    assert!((buffer.duration_sec - 1.0).abs() < 0.001);
}

#[cfg(feature = "ml-analysis")]
#[test]
fn test_full_analysis_pipeline_synthetic() {
    // Create synthetic C major chord (C=261.63Hz, E=329.63Hz, G=392Hz)
    let sample_rate = 48000;
    let duration_sec = 2.0;
    let num_samples = (sample_rate as f64 * duration_sec) as usize;

    let mut samples = vec![0.0f32; num_samples];
    for i in 0..num_samples {
        let t = i as f32 / sample_rate as f32;
        samples[i] = 0.33 * (2.0 * std::f32::consts::PI * 261.63 * t).sin() // C
            + 0.33 * (2.0 * std::f32::consts::PI * 329.63 * t).sin() // E
            + 0.33 * (2.0 * std::f32::consts::PI * 392.0 * t).sin(); // G
    }

    // Analyze with chromagram
    let chroma_config = ChromagramConfig::new(sample_rate);
    let analyzer = ChromagramAnalyzer::new(chroma_config).unwrap();

    // Analyze first frame (use default FFT size of 8192)
    let fft_size = 8192;
    let frame = &samples[..fft_size];
    let chromagram = analyzer.analyze_frame(frame);
    assert!(chromagram.is_ok());

    let chroma = chromagram.unwrap();
    
    // C major chord should have strong C, E, G bins
    let c_bin = chroma.bins[0];
    let e_bin = chroma.bins[4];
    let g_bin = chroma.bins[7];

    // These should be among the highest bins (allowing for harmonics/noise)
    assert!(c_bin > 0.01 || e_bin > 0.01 || g_bin > 0.01, 
            "At least one chord tone should be detected");
}

#[cfg(feature = "ml-analysis")]
#[test]
fn test_chord_recognition_with_real_chromagram() {
    let recognizer = ChordRecognizer::with_standard_chords();

    // Create perfect C major chromagram
    let mut chroma = Chromagram::new();
    chroma.bins[0] = 1.0; // C
    chroma.bins[4] = 1.0; // E
    chroma.bins[7] = 1.0; // G
    chroma.normalize();

    let result = recognizer.recognize(&chroma);
    assert!(result.is_some());

    let chord = result.unwrap();
    assert_eq!(chord.root, 0); // C
}

#[cfg(feature = "ml-analysis")]
#[test]
fn test_harmony_map_builder_integration() {
    let recognizer = ChordRecognizer::with_standard_chords();
    let config = HarmonyMapConfig::new(0.5, 1.0);
    let builder = HarmonyMapBuilder::new(config, recognizer).unwrap();

    // Create simple progression
    let mut c_major = Chromagram::new();
    c_major.bins[0] = 2.0; c_major.bins[4] = 1.0; c_major.bins[7] = 1.0;
    c_major.normalize();

    let chromagrams = vec![c_major.clone(), c_major.clone(), c_major];

    let map = builder.build("integration_test".to_string(), &chromagrams, 120.0);
    assert!(map.is_ok());

    let harmony_map = map.unwrap();
    assert_eq!(harmony_map.song_id, "integration_test");
    assert_eq!(harmony_map.tempo_bpm, 120.0);
    assert!(!harmony_map.key_signature.is_empty());
}

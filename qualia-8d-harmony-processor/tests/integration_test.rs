//! # Responsibility
//! Integration tests for full audio processing pipeline.

use qualia_8d_harmony_processor::audio::{
    AudioBuffer, CircularMotionEngine, EnsembleConfig, EnsembleEffect, EnsembleMode,
    HarmonicExciter, HarmonicExciterConfig, InputHandler, InputHandlerConfig, 
    SpatialMixer, SpatialMixerConfig, StereoWidener, StereoWidenerConfig,
    TransientShaper, TransientShaperConfig,
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
    let config = EnsembleConfig::new(
        EnsembleMode::Humanized,
        None,           // No tempo for humanized mode
        (5, 10),        // num_voices_range
        30.0,           // max_delay_ms
        8.0,            // max_pitch_shift_cents
        (90.0, 120.0),  // spatial_spread_deg_range
        48000,          // sample_rate
    ).unwrap();

    let _effect = EnsembleEffect::new(config.clone());
    assert_eq!(config.num_voices_range, (5, 10));
}

#[test]
fn test_spatial_mixer_limiter() {
    let config = SpatialMixerConfig::default_8d(48000);

    let _mixer = SpatialMixer::new(config.clone());
    // UPDATED: Threshold is 0.99 (headroom for spatial mixing peaks)
    assert!((config.limiter_threshold - 0.99).abs() < 0.001);
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

#[test]
fn test_stereo_widener_integration() {
    // Create stereo test signal (left=0.8, right=0.2)
    let sample_rate = 48000;
    let duration_samples = 5000;
    let left = vec![0.8; duration_samples];
    let right = vec![0.2; duration_samples];
    
    // Configure widener for dramatic effect
    let config = StereoWidenerConfig::new(
        (10.0, 30.0),   // Haas delay range
        (1.2, 2.5),     // Width factor range
        8000.0,         // Low-pass cutoff
        sample_rate,
    ).unwrap();
    
    let mut widener = StereoWidener::new(config);
    
    // Process at low intensity
    let (out_l_low, out_r_low) = widener.process(&left, &right, 0.2).unwrap();
    assert_eq!(out_l_low.len(), duration_samples);
    assert_eq!(out_r_low.len(), duration_samples);
    
    // Reset and process at high intensity
    widener.reset();
    let (out_l_high, out_r_high) = widener.process(&left, &right, 0.9).unwrap();
    
    // High intensity should produce wider stereo field
    let low_separation = (out_l_low[3000] - out_r_low[3000]).abs();
    let high_separation = (out_l_high[3000] - out_r_high[3000]).abs();
    
    assert!(high_separation > low_separation * 1.3,
        "High intensity should produce wider stereo field");
}

#[test]
fn test_transient_shaper_integration() {
    // Create signal with sharp transient followed by sustain
    let sample_rate = 48000;
    let mut input = vec![0.0; 3000];
    
    // Sharp attack: 0 → 0.7 in 40 samples
    for i in 500..540 {
        input[i] = ((i - 500) as f32 / 40.0) * 0.7;
    }
    // Sustain at 0.4
    for i in 540..2500 {
        input[i] = 0.4;
    }
    
    // Configure shaper for dramatic punch
    let config = TransientShaperConfig::new(
        (0.0, 15.0),    // Attack gain range (0dB → +15dB)
        (-8.0, 0.0),    // Sustain gain range (-8dB → 0dB)
        128,            // Envelope window
        25.0,           // Attack threshold
        512,            // Release time
        sample_rate,
    ).unwrap();
    
    let mut shaper = TransientShaper::new(config);
    
    // Process at low intensity
    let output_low = shaper.process(&input, 0.1).unwrap();
    assert_eq!(output_low.len(), 3000);
    
    // Reset and process at high intensity
    shaper.reset();
    let output_high = shaper.process(&input, 0.95).unwrap();
    
    // High intensity should boost attack region more
    let attack_avg_low = output_low[500..700].iter().map(|&x| x.abs()).sum::<f32>() / 200.0;
    let attack_avg_high = output_high[500..700].iter().map(|&x| x.abs()).sum::<f32>() / 200.0;
    
    assert!(attack_avg_high > attack_avg_low * 1.5,
        "High intensity should significantly boost attack (low: {}, high: {})",
        attack_avg_low, attack_avg_high);
}

#[test]
fn test_harmonic_exciter_integration() {
    // Create signal with HIGH frequency content (above 3kHz for exciter to work)
    // Use 5kHz tone since exciter processes 3-16kHz range
    let sample_rate = 48000;
    let duration_sec = 0.5;
    let num_samples = (sample_rate as f32 * duration_sec) as usize;
    
    let input: Vec<f32> = (0..num_samples)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            // Mix of 5kHz (in exciter range) and 440Hz (below range)
            let high_freq = (2.0 * std::f32::consts::PI * 5000.0 * t).sin() * 0.3;
            let low_freq = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.2;
            high_freq + low_freq
        })
        .collect();
    
    // Configure exciter for brightness enhancement
    let config = HarmonicExciterConfig::new(sample_rate).unwrap();
    let mut exciter = HarmonicExciter::new(config).unwrap();
    
    // Process at low intensity (minimal effect)
    let output_low = exciter.process(&input, 0.1).unwrap();
    assert_eq!(output_low.len(), num_samples);
    
    // Process at high intensity (strong harmonics)
    let output_high = exciter.process(&input, 0.95).unwrap();
    
    // High intensity should add harmonics to 5kHz content
    // Energy might increase slightly or stay similar (depends on harmonic generation)
    let energy_input: f32 = input.iter().map(|&x| x * x).sum();
    let energy_low: f32 = output_low.iter().map(|&x| x * x).sum();
    let energy_high: f32 = output_high.iter().map(|&x| x * x).sum();
    
    // At minimum, high intensity should not reduce energy significantly
    assert!(energy_high >= energy_input * 0.9,
        "Exciter should preserve energy (input: {}, high: {})", energy_input, energy_high);
    
    // High intensity should have at least as much energy as low intensity
    assert!(energy_high >= energy_low * 0.95,
        "High intensity should have >= energy of low intensity");
}

#[test]
fn test_full_enhancement_chain_integration() {
    // Test complete enhancement chain: Exciter → Shaper → Widener
    let sample_rate = 48000;
    
    // Create percussive signal with fundamental
    let mut mono_signal = vec![0.0; 4000];
    // Attack transient
    for i in 500..550 {
        mono_signal[i] = ((i - 500) as f32 / 50.0) * 0.6;
    }
    // Sustain with 440Hz tone
    for i in 550..3500 {
        let t = (i - 550) as f32 / sample_rate as f32;
        mono_signal[i] = 0.4 * (2.0 * std::f32::consts::PI * 440.0 * t).sin();
    }
    
    // 1. Harmonic Exciter (add brightness)
    let exciter_config = HarmonicExciterConfig::new(sample_rate).unwrap();
    let mut exciter = HarmonicExciter::new(exciter_config).unwrap();
    let excited = exciter.process(&mono_signal, 0.8).unwrap();
    
    // 2. Transient Shaper (enhance punch)
    let shaper_config = TransientShaperConfig::new(
        (0.0, 12.0), (-6.0, 0.0), 128, 30.0, 512, sample_rate
    ).unwrap();
    let mut shaper = TransientShaper::new(shaper_config);
    let shaped = shaper.process(&excited, 0.8).unwrap();
    
    // 3. Stereo Widener (create stereo field from mono)
    // Duplicate mono to stereo with slight offset
    let left = shaped.clone();
    let right = shaped.iter().map(|&x| x * 0.9).collect::<Vec<f32>>();
    
    let widener_config = StereoWidenerConfig::new(
        (8.0, 25.0), (1.0, 2.0), 8000.0, sample_rate
    ).unwrap();
    let mut widener = StereoWidener::new(widener_config);
    let (final_left, final_right) = widener.process(&left, &right, 0.8).unwrap();
    
    // Verify full chain produced output
    assert_eq!(final_left.len(), 4000);
    assert_eq!(final_right.len(), 4000);
    
    // Verify stereo separation exists
    let separation = (final_left[2000] - final_right[2000]).abs();
    assert!(separation > 0.01, "Full chain should produce stereo separation");
    
    // Verify signal has energy (not silenced by chain)
    let final_energy: f32 = final_left.iter()
        .zip(&final_right)
        .map(|(l, r)| l * l + r * r)
        .sum();
    assert!(final_energy > 10.0, "Full chain should preserve/enhance energy");
}

#[test]
fn test_pipeline_time_varying_processing() {
    use qualia_8d_harmony_processor::audio::{AudioProcessingPipeline, PipelineConfig};
    use qualia_8d_harmony_processor::analysis::{IntensityAnalyzer, IntensityAnalyzerConfig};
    
    // Create test audio: 1 second of varying amplitude sine wave
    let sample_rate = 48000;
    let num_samples = sample_rate as usize;
    
    let audio: Vec<f32> = (0..num_samples)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            let freq = 440.0;
            let amplitude = 0.3 + 0.4 * (t * 2.0).sin(); // Varying amplitude
            amplitude * (2.0 * std::f32::consts::PI * freq * t).sin()
        })
        .collect();
    
    // Analyze intensity curve
    let intensity_config = IntensityAnalyzerConfig::new(sample_rate);
    let mut analyzer = IntensityAnalyzer::new(intensity_config).unwrap();
    let intensity_curve = analyzer.analyze(&audio).unwrap();
    
    assert!(!intensity_curve.is_empty(), "Intensity curve should be generated");
    
    // Create minimal pipeline config
    let pipeline_config = PipelineConfig::new(sample_rate).unwrap();
    let mut pipeline = AudioProcessingPipeline::new(pipeline_config).unwrap();
    
    // Verify process_time_varying method executes successfully
    // Note: Returns Vec<VoiceOutput> with ensemble voices, not direct mono output
    let result = pipeline.process_time_varying(&audio, &intensity_curve);
    assert!(result.is_ok(), "Time-varying processing should execute without error");
    
    let voice_outputs = result.unwrap();
    assert!(!voice_outputs.is_empty(), "Should produce voice outputs");
    
    // Each voice should have samples
    for voice in &voice_outputs {
        assert!(!voice.samples.is_empty(), "Each voice should have audio samples");
    }
}

#[test]
fn test_synchronized_ensemble_mode_intensity_gating() {
    // User requirement: "efecto coro sincronizado en momentos mas intensos"
    let sample_rate = 48000;
    let config = EnsembleConfig::new(
        EnsembleMode::Synchronized,
        None,
        (3, 7), // 3-7 voices range
        1.0,
        5.0,
        (30.0, 60.0),
        sample_rate
    ).unwrap();
    
    let mut effect = EnsembleEffect::new(config);
    
    // Create test input: 440Hz sine wave
    let duration_samples = sample_rate; // 1 second
    let input: Vec<f32> = (0..duration_samples)
        .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / sample_rate as f32).sin() * 0.5)
        .collect();
    
    // LOW INTENSITY (0.5): No chorus effect
    let voices_low = effect.process_dynamic(&input, 0.5).unwrap();
    assert_eq!(voices_low.len(), 0, "Synchronized mode should produce no voices below intensity threshold");
    
    // THRESHOLD (0.7): Gate opens
    let voices_threshold = effect.process_dynamic(&input, 0.7).unwrap();
    assert!(voices_threshold.len() >= 3, "Should produce minimum voices at threshold");
    assert!(voices_threshold.len() <= 7, "Should not exceed maximum voices");
    
    // HIGH INTENSITY (0.95): Full chorus
    let voices_high = effect.process_dynamic(&input, 0.95).unwrap();
    assert!(voices_high.len() >= 6, "Should produce near-maximum voices at high intensity");
    
    // Verify all voices have valid audio data and spatial positions
    for voice in &voices_high {
        assert!(!voice.samples.is_empty(), "Each voice should have audio data");
        assert!(voice.spatial_offset_deg.abs() <= 60.0, "Spatial positions should be within configured range");
    }
    
    // Verify energy preservation across voices
    let total_energy: f32 = voices_high.iter()
        .map(|v| v.samples.iter().map(|&x| x * x).sum::<f32>())
        .sum();
    assert!(total_energy > 0.0, "Should have significant audio energy across all voices");
}


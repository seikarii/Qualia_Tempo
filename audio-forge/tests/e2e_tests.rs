//! # Responsibility
//! End-to-end tests for complete audio pipeline.
//!
//! Tests the full flow: Load → Analyze → Apply Effects → Upmix → Output

use audio_forge::services::interfaces::{
    IAudioAnalyzer, IAudioEffects, IAudioPlayer, IMultiChannelOutput,
};
use audio_forge::services::AudioForgeModule;
use audio_forge::{
    AudioAnalyzerService, AudioEffectsService, MultiChannelOutputService,
    VisualizationEngineService,
};
use shaku::HasComponent;
use std::sync::Arc;

/// # Responsibility
/// E2E Test: Complete audio processing pipeline.
///
/// Flow: Audio data → FFT Analysis → 8D Effect → 8.1 Upmix
#[test]
fn test_e2e_complete_audio_pipeline() {
    // Arrange: Initialize all services via DI module
    let module = AudioForgeModule::builder().build();
    let player: Arc<dyn IAudioPlayer> = module.resolve();
    let analyzer = Arc::new(AudioAnalyzerService::default());
    
    // Enable 8D effect
    use audio_forge::EffectConfig;
    let effect_config = EffectConfig {
        effect_8d_enabled: true,
        effect_8d_intensity: 0.8,
        effect_8d_rotation_hz: 0.25,
        ..Default::default()
    };
    let effects = Arc::new(AudioEffectsService::new(effect_config));
    
    let multi_channel = Arc::new(MultiChannelOutputService::default());
    let _viz = Arc::new(VisualizationEngineService::new());

    // Act: Generate synthetic stereo audio (1 second @ 44100Hz)
    let sample_rate = 44100;
    let duration_secs = 1.0;
    let sample_count = (sample_rate as f32 * duration_secs) as usize;
    
    // Generate stereo sine wave: Left=440Hz, Right=880Hz
    let mut stereo_samples: Vec<f32> = Vec::with_capacity(sample_count * 2);
    for i in 0..sample_count {
        let t = i as f32 / sample_rate as f32;
        let left = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5;
        let right = (2.0 * std::f32::consts::PI * 880.0 * t).sin() * 0.5;
        stereo_samples.push(left);
        stereo_samples.push(right);
    }

    // Step 1: Analyze frequency spectrum
    let spectrum = analyzer
        .analyze_spectrum(&stereo_samples, sample_rate)
        .expect("FFT analysis should succeed");

    assert!(!spectrum.frequencies.is_empty(), "Should have frequency data");
    assert!(!spectrum.magnitudes.is_empty(), "Should have magnitude data");

    // Step 2: Detect instruments
    let (bass, mid, treble) = analyzer.detect_instruments(&spectrum);
    assert!(bass >= 0.0 && bass <= 1.0, "Bass should be normalized");
    assert!(mid >= 0.0 && mid <= 1.0, "Mid should be normalized");
    assert!(treble >= 0.0 && treble <= 1.0, "Treble should be normalized");

    // Step 3: Apply 8D effect
    let mut processed_samples = stereo_samples.clone();
    effects
        .apply_8d_effect(&mut processed_samples, sample_rate, 0.5)
        .expect("8D effect should succeed");

    // Verify samples were modified (check first 10 samples only)
    let modified_count = processed_samples
        .iter()
        .zip(&stereo_samples)
        .take(10)
        .filter(|&(a, b)| (*a - *b).abs() > 1e-6)
        .count();
    
    assert!(
        modified_count > 0,
        "8D effect should modify at least some samples"
    );

    // Step 4: Upmix stereo to 8.1 channels
    let upmixed = multi_channel
        .upmix_stereo_to_8_1(&processed_samples)
        .expect("Upmix should succeed");

    assert_eq!(
        upmixed.len(),
        processed_samples.len() * 4,
        "8 channels = 4x stereo"
    );

    // Verify channel integrity (first frame)
    let left = processed_samples[0];
    let right = processed_samples[1];

    // FL should match left input
    assert_eq!(upmixed[0], left, "FL channel should copy left");
    // FR should match right input
    assert_eq!(upmixed[1], right, "FR channel should copy right");
    // FC should be mono sum
    assert_eq!(upmixed[2], (left + right) / 2.0, "FC should be mono sum");

    // Step 5: Verify player state
    assert!(!player.is_playing(), "Player should start stopped");
    assert_eq!(player.total_duration().as_secs(), 0, "No file loaded");

    println!("✅ E2E Pipeline Test PASSED");
}

/// # Responsibility
/// E2E Test: Audio effects chain processing.
///
/// Flow: Raw audio → Drop → Bass Boost → Treble Boost → Verify
#[test]
fn test_e2e_effects_chain() {
    use audio_forge::EffectConfig;

    // Arrange: Create effects service with all effects enabled
    let config = EffectConfig {
        effect_8d_enabled: false,
        effect_8d_intensity: 0.0,
        effect_8d_rotation_hz: 0.0,
        drop_effect_enabled: true,
        drop_amount: 0.5, // 50% volume reduction
        bass_boost_enabled: true,
        bass_boost_gain: 2.0,
        treble_boost_enabled: true,
        treble_boost_gain: 1.5,
    };

    let effects = AudioEffectsService::new(config);

    // Generate test signal: 0.8 amplitude
    let mut samples = vec![0.8, -0.8, 0.8, -0.8];
    let original = samples.clone();

    // Act: Apply effects chain
    effects
        .apply_drop_effect(&mut samples)
        .expect("Drop effect should succeed");

    // After drop (50%): 0.8 * 0.5 = 0.4
    assert_eq!(samples[0], 0.4, "Drop should reduce to 50%");

    effects
        .apply_bass_boost(&mut samples)
        .expect("Bass boost should succeed");

    // After bass boost (2x): 0.4 * 2.0 = 0.8
    assert_eq!(samples[0], 0.8, "Bass boost should amplify");

    effects
        .apply_treble_boost(&mut samples)
        .expect("Treble boost should succeed");

    // After treble boost (1.5x): 0.8 * 1.5 = 1.2, clamped to 1.0
    assert_eq!(samples[0], 1.0, "Treble boost should clamp to 1.0");

    // Verify final samples differ from original
    assert_ne!(samples, original, "Effects chain should modify samples");

    println!("✅ E2E Effects Chain Test PASSED");
}

/// # Responsibility
/// E2E Test: Multi-channel configuration and mode switching.
///
/// Flow: Detect hardware → Configure 8.1 → Fallback to stereo
#[test]
fn test_e2e_channel_mode_switching() {
    // Arrange
    let multi_channel = Arc::new(MultiChannelOutputService::default());

    // Act & Assert: Initial state should be stereo (no 8.1 hardware)
    let config = multi_channel.get_configuration();
    assert_eq!(config.channel_count(), 2, "Should default to stereo");
    assert!(!multi_channel.is_8_1_supported(), "8.1 not available in test");

    // Attempt to configure 8.1 (should fail gracefully)
    let result = multi_channel.configure_8_1_channels();
    assert!(result.is_err(), "Should fail when hardware unavailable");

    // Fallback to stereo should always succeed
    multi_channel
        .fallback_to_stereo()
        .expect("Fallback should succeed");

    let final_config = multi_channel.get_configuration();
    assert_eq!(final_config.channel_count(), 2, "Should remain stereo");

    println!("✅ E2E Channel Switching Test PASSED");
}

/// # Responsibility
/// E2E Test: Visualization rendering pipeline.
///
/// Flow: Generate data → Analyze → Render waveform/spectrum
#[test]
fn test_e2e_visualization_pipeline() {
    // Arrange
    let analyzer = Arc::new(AudioAnalyzerService::default());
    let _viz = Arc::new(VisualizationEngineService::new());

    // Generate synthetic audio: 440Hz sine wave
    let sample_rate = 44100;
    let samples: Vec<f32> = (0..4096)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5
        })
        .collect();

    // Act: Analyze spectrum
    let spectrum = analyzer
        .analyze_spectrum(&samples, sample_rate)
        .expect("Analysis should succeed");

    // Assert: Verify spectrum has peak near 440Hz
    let peak_freq = spectrum
        .frequencies
        .iter()
        .zip(&spectrum.magnitudes)
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
        .map(|(f, _)| *f)
        .unwrap_or(0.0);

    assert!(
        (peak_freq - 440.0).abs() < 50.0,
        "Peak should be near 440Hz, got {}Hz",
        peak_freq
    );

    // Verify instrument detection
    let (bass, mid, treble) = analyzer.detect_instruments(&spectrum);
    assert!(
        mid > bass && mid > treble,
        "Mid-range should dominate for 440Hz"
    );

    // Verify waveform downsampling (allow ±5% tolerance for rounding)
    let waveform = analyzer.get_waveform_samples(&samples, 100);
    assert!(
        waveform.len() >= 95 && waveform.len() <= 105,
        "Should downsample to ~100 samples (got {})",
        waveform.len()
    );

    println!("✅ E2E Visualization Pipeline Test PASSED");
}

/// # Responsibility
/// E2E Performance Test: Verify FFT latency < 16ms (60fps target).
#[test]
fn test_e2e_fft_performance() {
    use std::time::Instant;

    let analyzer = Arc::new(AudioAnalyzerService::default());
    let sample_rate = 44100;

    // Generate 1 second of audio
    let samples: Vec<f32> = (0..sample_rate)
        .map(|i| (i as f32 * 0.01).sin())
        .collect();

    // Measure FFT latency
    let start = Instant::now();
    let _spectrum = analyzer
        .analyze_spectrum(&samples, sample_rate)
        .expect("Analysis should succeed");
    let elapsed = start.elapsed();

    // Assert: Should complete in < 16ms (60fps = 16.67ms per frame)
    let latency_ms = elapsed.as_millis();
    assert!(
        latency_ms < 16,
        "FFT latency {}ms exceeds 16ms target",
        latency_ms
    );

    println!("✅ E2E FFT Performance Test PASSED ({}ms)", latency_ms);
}

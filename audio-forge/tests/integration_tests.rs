//! # Responsibility
//! Integration tests for audio-forge core functionality.

use audio_forge::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use audio_forge::services::interfaces::i_audio_player::IAudioPlayer;
use audio_forge::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use audio_forge::services::AudioForgeModule;
use audio_forge::{AudioAnalyzerService, MultiChannelOutputService};
use shaku::HasComponent;
use std::sync::Arc;
use std::time::Duration;

#[test]
fn test_audio_player_service_creates() {
    let module = AudioForgeModule::builder().build();
    let _player: Arc<dyn IAudioPlayer> = module.resolve();
    // If we get here, creation succeeded
}

#[test]
fn test_audio_player_initial_state() {
    let module = AudioForgeModule::builder().build();
    let player: Arc<dyn IAudioPlayer> = module.resolve();

    assert!(!player.is_playing());
    assert_eq!(player.total_duration(), Duration::ZERO);
    assert_eq!(player.current_position(), Duration::ZERO);
}

#[test]
fn test_play_without_loaded_file_errors() {
    let module = AudioForgeModule::builder().build();
    let player: Arc<dyn IAudioPlayer> = module.resolve();
    let result = player.play();

    assert!(result.is_err());
    assert!(
        result
            .unwrap_err()
            .to_string()
            .contains("No audio file loaded")
    );
}

#[test]
fn test_audio_analyzer_service_creates() {
    let _analyzer = AudioAnalyzerService::default();
}

#[test]
fn test_full_analysis_pipeline() {
    let analyzer = AudioAnalyzerService::default();

    // Generate test signal: 440Hz sine wave
    let sample_rate = 44100;
    let samples: Vec<f32> = (0..sample_rate)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            (2.0 * std::f32::consts::PI * 440.0 * t).sin()
        })
        .collect();

    // Test spectrum analysis
    let spectrum = analyzer.analyze_spectrum(&samples, sample_rate).unwrap();
    assert!(!spectrum.frequencies.is_empty());
    assert_eq!(spectrum.frequencies.len(), spectrum.magnitudes.len());

    // Test instrument detection
    let (bass, mid, treble) = analyzer.detect_instruments(&spectrum);
    // Validate normalized to [0.0, 1.0]
    assert!((0.0..=1.0).contains(&bass));
    assert!((0.0..=1.0).contains(&mid));
    assert!((0.0..=1.0).contains(&treble));

    // Test waveform downsampling
    let waveform = analyzer.get_waveform_samples(&samples, 100);
    assert_eq!(waveform.len(), 100);
}

#[test]
fn test_analyzer_handles_complex_signal() {
    let analyzer = AudioAnalyzerService::default();

    // Generate complex signal: bass (100Hz) + mid (1kHz) + treble (8kHz)
    let sample_rate = 44100;
    let samples: Vec<f32> = (0..sample_rate)
        .map(|i| {
            let t = i as f32 / sample_rate as f32;
            let bass = (2.0 * std::f32::consts::PI * 100.0 * t).sin() * 0.8;
            let mid = (2.0 * std::f32::consts::PI * 1000.0 * t).sin() * 0.5;
            let treble = (2.0 * std::f32::consts::PI * 8000.0 * t).sin() * 0.3;
            (bass + mid + treble) / 3.0
        })
        .collect();

    let spectrum = analyzer.analyze_spectrum(&samples, sample_rate).unwrap();
    let (bass_level, _mid_level, _treble_level) = analyzer.detect_instruments(&spectrum);

    // Bass should be strongest due to highest amplitude in test signal
    assert!(bass_level > 0.5, "Bass level should be significant");
}

#[test]
fn test_multi_channel_output_service_creates() {
    let _output = MultiChannelOutputService::default();
}

#[test]
fn test_8_1_upmixing_integration() {
    let output = MultiChannelOutputService::default();

    // Generate stereo test signal: 440Hz sine wave (L+R)
    let frame_count = 100;
    let stereo_samples: Vec<f32> = (0..frame_count)
        .flat_map(|i| {
            let t = i as f32 / 44100.0;
            let sample = (2.0 * std::f32::consts::PI * 440.0 * t).sin();
            vec![sample, sample] // Stereo: L, R
        })
        .collect();

    // Test upmixing to 8.1
    let result = output.upmix_stereo_to_8_1(&stereo_samples);
    assert!(result.is_ok(), "Upmixing should succeed");

    let multichannel = result.unwrap();

    // Verify output size: 100 frames * 8 channels = 800 samples
    assert_eq!(multichannel.len(), frame_count * 8);

    // Verify first frame channel mapping
    let first_frame = &multichannel[0..8];

    // FL/FR should match input (first stereo frame)
    let input_left = stereo_samples[0];
    let input_right = stereo_samples[1];
    assert_eq!(first_frame[0], input_left, "FL should match left input");
    assert_eq!(first_frame[1], input_right, "FR should match right input");

    // FC should be mono sum
    let expected_fc = (input_left + input_right) / 2.0;
    assert_eq!(first_frame[2], expected_fc, "FC should be mono sum");

    // All channels should be finite (no NaN/Inf)
    for (i, &sample) in first_frame.iter().enumerate() {
        assert!(sample.is_finite(), "Channel {} should be finite", i);
    }
}

#[test]
fn test_full_8_1_pipeline_with_effects() {
    use audio_forge::AudioEffectsService;
    use audio_forge::services::interfaces::i_audio_effects::IAudioEffects;

    let output = MultiChannelOutputService::default();
    let effects = AudioEffectsService::default();

    // Generate stereo test signal
    let stereo_samples: Vec<f32> = (0..200).map(|i| (i as f32 * 0.1).sin()).collect();

    // Step 1: Upmix to 8.1
    let multichannel = output.upmix_stereo_to_8_1(&stereo_samples).unwrap();
    assert_eq!(multichannel.len(), 100 * 8); // 100 frames * 8 channels

    // Step 2: Apply effects (on stereo for now, full pipeline would apply to multichannel)
    let mut stereo_copy = stereo_samples.clone();
    effects.apply_drop_effect(&mut stereo_copy).unwrap();

    // Verify pipeline completed without errors
    assert_eq!(stereo_copy.len(), stereo_samples.len());
}

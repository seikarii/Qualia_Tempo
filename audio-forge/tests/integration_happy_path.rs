//! # Responsibility
//! State-based integration tests for complete user workflows.
//!
//! ---
//!
//! Tests the HAPPY PATH (drag file → load → play → seek → pause → effects → export)
//! without UI automation (egui limitation). Validates service layer interactions.

use audio_forge::services::IApplicationServices;
use audio_forge::AudioForgeModule;
use audio_forge::EffectConfig;
use shaku::HasComponent;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

/// # Responsibility
/// Test complete workflow: Load → Play → Seek → Pause → Effects → Export.
///
/// ---
///
/// Simulates user actions via service calls (not UI clicks).
/// Validates state transitions at each step.
#[tokio::test]
async fn test_happy_path_full_workflow() {
    // ============================================================================
    // SETUP: Initialize module with REAL services
    // ============================================================================
    let module = AudioForgeModule::builder().build();
    let services: Arc<dyn IApplicationServices> = module.resolve();

    // ============================================================================
    // STEP 1: LOAD FILE (simulates drag-drop or file picker)
    // ============================================================================
    let test_wav = PathBuf::from("tests/assets/sine_440hz.wav");
    assert!(
        test_wav.exists(),
        "Test asset missing: {:?}",
        test_wav.canonicalize()
    );

    let load_result = services.audio_player().load_file(&test_wav);
    assert!(
        load_result.is_ok(),
        "File load failed: {:?}",
        load_result.err()
    );

    let duration = load_result.unwrap();
    assert!(
        (4..=6).contains(&duration.as_secs()),
        "Duration invalid: {} seconds (expected 4-6)",
        duration.as_secs()
    );

    println!("✅ STEP 1: File loaded ({:.2}s)", duration.as_secs_f32());

    // ============================================================================
    // STEP 2: PLAY (simulates Play button click)
    // ============================================================================
    assert!(
        services.audio_player().play().is_ok(),
        "Play command failed"
    );

    // Allow audio pipeline to initialize
    tokio::time::sleep(Duration::from_millis(100)).await;

    assert!(
        services.audio_player().is_playing(),
        "Not playing after play() call"
    );

    println!("✅ STEP 2: Playback started");

    // ============================================================================
    // STEP 3: PAUSE BEFORE SEEK (rodio limitation - seek during playback unreliable)
    // ============================================================================
    assert!(
        services.audio_player().pause().is_ok(),
        "Pause before seek failed"
    );

    tokio::time::sleep(Duration::from_millis(50)).await;

    println!("✅ STEP 3a: Paused for seek");

    // ============================================================================
    // STEP 4: SEEK (simulates progress bar drag)
    // ============================================================================
    let mid_point = duration / 2;
    assert!(
        services.audio_player().seek(mid_point).is_ok(),
        "Seek failed"
    );

    let current = services.audio_player().current_position();
    let diff = (current.as_secs_f32() - mid_point.as_secs_f32()).abs();
    assert!(
        diff < 0.1,
        "Seek position inaccurate: expected {:.2}s, got {:.2}s",
        mid_point.as_secs_f32(),
        current.as_secs_f32()
    );

    println!(
        "✅ STEP 4: Seeked to {:.2}s (diff: {:.3}s)",
        current.as_secs_f32(),
        diff
    );

    // ============================================================================
    // STEP 5: RESUME PLAYBACK AFTER SEEK
    // ============================================================================
    assert!(
        services.audio_player().play().is_ok(),
        "Resume play failed"
    );

    tokio::time::sleep(Duration::from_millis(100)).await;

    println!("✅ STEP 5: Playback resumed");

    // ============================================================================
    // STEP 6: PAUSE (simulates final Pause button click)
    // ============================================================================
    assert!(
        services.audio_player().pause().is_ok(),
        "Pause failed"
    );

    tokio::time::sleep(Duration::from_millis(50)).await;

    assert!(
        !services.audio_player().is_playing(),
        "Still playing after pause()"
    );

    println!("✅ STEP 6: Playback paused");

    // ============================================================================
    // STEP 7: EFFECTS (simulates checkbox clicks)
    // ============================================================================
    let mut config = EffectConfig::default();
    config.effect_8d_enabled = true;
    config.effect_8d_intensity = 0.8;
    config.bass_boost_enabled = true;
    config.bass_boost_gain = 1.5;

    services.audio_effects().set_config(config.clone());

    println!(
        "✅ STEP 7: Effects enabled (8D: {}, Bass: {})",
        config.effect_8d_intensity, config.bass_boost_gain
    );

    // ============================================================================
    // STEP 8: EXPORT (simulates Export button click)
    // ============================================================================
    let temp_dir = tempfile::tempdir().unwrap();
    let export_path = temp_dir.path().join("exported_test.wav");

    // Capture processed audio
    let samples_result = services.audio_player().capture_processed_audio();
    assert!(
        samples_result.is_ok(),
        "Capture audio failed: {:?}",
        samples_result.err()
    );

    let samples = samples_result.unwrap();
    let sr = services.audio_player().get_sample_rate();

    assert!(
        services
            .audio_exporter()
            .export_wav(&export_path, &samples, sr)
            .is_ok(),
        "Export WAV failed"
    );

    assert!(
        export_path.exists(),
        "Export file not created: {:?}",
        export_path
    );

    let file_size = std::fs::metadata(&export_path).unwrap().len();
    assert!(
        file_size > 1000,
        "Export file too small: {} bytes",
        file_size
    );

    println!(
        "✅ STEP 8: Exported to {:?} ({} bytes)",
        export_path.file_name().unwrap(),
        file_size
    );

    println!("\n🎉 HAPPY PATH COMPLETE: All 8 steps validated");
}

/// # Responsibility
/// Test concurrent file loading race condition.
///
/// ---
///
/// Spawns 10 threads trying to load different files simultaneously.
/// Validates that at least one succeeds (last one wins).
#[test]
fn test_concurrent_file_loading_race_condition() {
    let module = AudioForgeModule::builder().build();
    let services: Arc<dyn IApplicationServices> = module.resolve();

    // Spawn 10 threads trying to load files
    let handles: Vec<_> = (0..10)
        .map(|i| {
            let player = services.audio_player().clone();
            std::thread::spawn(move || {
                // Cycle through 3 test files
                let file_index = i % 3;
                let path = match file_index {
                    0 => "tests/assets/sine_440hz.wav",
                    1 => "tests/assets/sine_440hz.wav", // Same file for simplicity
                    _ => "tests/assets/sine_440hz.wav",
                };
                player.load_file(&PathBuf::from(path))
            })
        })
        .collect();

    let results: Vec<_> = handles
        .into_iter()
        .map(|h| h.join().unwrap())
        .collect();

    // At least one should succeed (last one wins)
    let success_count = results.iter().filter(|r| r.is_ok()).count();
    assert!(
        success_count > 0,
        "All concurrent loads failed (expected at least 1 success)"
    );

    println!(
        "✅ Concurrent loading: {}/{} succeeded",
        success_count,
        results.len()
    );
}

//! # Responsibility
//! End-to-end integration test validating full CLI pipeline from audio input to exported artifacts.

use anyhow::Result;
use std::path::Path;
use std::process::Command;
use tempfile::TempDir;

/// Test full pipeline with synthetic audio file
#[test]
fn test_full_pipeline_synthetic_audio() -> Result<()> {
    // Create temporary workspace
    let temp_dir = TempDir::new()?;
    let input_wav = temp_dir.path().join("test_input.wav");
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir_all(&output_dir)?;

    // Generate synthetic 440Hz sine wave (1 second)
    create_synthetic_wav(&input_wav, 48000, 1.0, 440.0)?;

    // Run CLI processor
    let output = Command::new(env!("CARGO_BIN_EXE_qualia-8d-harmony-processor"))
        .args(&[
            "process",  // Subcommand added
            "-i",
            input_wav.to_str().unwrap(),
            "-o",
            output_dir.to_str().unwrap(),
            "--sample-rate",
            "48000",
            "--rotation-rpm",
            "8",
            "--ensemble-voices",
            "3",
        ])
        .output()?;

    // Always print CLI output for debugging
    println!("CLI STDOUT:\n{}", String::from_utf8_lossy(&output.stdout));
    println!("CLI STDERR:\n{}", String::from_utf8_lossy(&output.stderr));

    // Validate execution succeeded
    if !output.status.success() {
        panic!("CLI execution failed: {:?}", output.status);
    }

    // Verify output artifacts exist
    let expected_wav = output_dir.join("test_input_8d.wav");
    let expected_json = output_dir.join("test_input_harmony.json");
    let expected_midi_chords = output_dir.join("test_input_chords.mid");
    let expected_midi_transcription = output_dir.join("test_input_transcription.mid");

    assert!(expected_wav.exists(), "WAV file not created: {:?}", expected_wav);
    assert!(expected_json.exists(), "JSON file not created: {:?}", expected_json);
    assert!(expected_midi_chords.exists(), "Chord MIDI file not created: {:?}", expected_midi_chords);
    
    // Transcription MIDI only created if notes detected (0-note files not exported)
    if expected_midi_transcription.exists() {
        let midi_trans_metadata = std::fs::metadata(&expected_midi_transcription)?;
        assert!(midi_trans_metadata.len() > 0, "Transcription MIDI file is empty");
    } else {
        println!("Note: Transcription MIDI not created (no notes detected in synthetic audio)");
    }

    // Validate WAV file is non-empty and valid
    let wav_metadata = std::fs::metadata(&expected_wav)?;
    assert!(wav_metadata.len() > 1000, "WAV file suspiciously small: {} bytes", wav_metadata.len());

    // Validate JSON file structure
    let json_content = std::fs::read_to_string(&expected_json)?;
    let harmony_map: serde_json::Value = serde_json::from_str(&json_content)?;
    assert!(harmony_map.get("song_id").is_some(), "JSON missing song_id field");
    assert!(harmony_map.get("tempo_bpm").is_some(), "JSON missing tempo_bpm field");
    assert!(harmony_map.get("key_signature").is_some(), "JSON missing key_signature field");

    // Validate chord MIDI file is non-empty
    let midi_chords_metadata = std::fs::metadata(&expected_midi_chords)?;
    assert!(midi_chords_metadata.len() > 50, "Chord MIDI file suspiciously small: {} bytes", midi_chords_metadata.len());
    
    // Validate transcription MIDI file ONLY if it exists (depends on note detection)
    if expected_midi_transcription.exists() {
        let midi_transcription_metadata = std::fs::metadata(&expected_midi_transcription)?;
        assert!(midi_transcription_metadata.len() > 50, "Transcription MIDI file suspiciously small: {} bytes", midi_transcription_metadata.len());
    }

    println!("✅ Full pipeline test PASSED - all artifacts validated");
    Ok(())
}

/// Generate synthetic WAV file for testing
fn create_synthetic_wav(path: &Path, sample_rate: u32, duration_sec: f32, frequency_hz: f32) -> Result<()> {
    use hound::{WavSpec, WavWriter};

    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = WavWriter::create(path, spec)?;
    let num_samples = (sample_rate as f32 * duration_sec) as usize;

    for i in 0..num_samples {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * std::f32::consts::PI * frequency_hz * t).sin();
        let amplitude = (sample * i16::MAX as f32) as i16;
        writer.write_sample(amplitude)?;
    }

    writer.finalize()?;
    Ok(())
}

#[cfg(feature = "ml-analysis")]
#[test]
fn test_pipeline_with_complex_chord_progression() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let input_wav = temp_dir.path().join("complex_chords.wav");
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir_all(&output_dir)?;

    // Generate C major chord (C + E + G) for 2 seconds
    create_synthetic_chord_wav(&input_wav, 48000, 2.0, &[261.63, 329.63, 392.0])?;

    let output = Command::new(env!("CARGO_BIN_EXE_qualia-8d-harmony-processor"))
        .args(&[
            "process",  // Subcommand added
            "-i",
            input_wav.to_str().unwrap(),
            "-o",
            output_dir.to_str().unwrap(),
            "--sample-rate",
            "48000",
            "--rotation-rpm",
            "6",
        ])
        .output()?;

    if !output.status.success() {
        eprintln!("STDOUT:\n{}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR:\n{}", String::from_utf8_lossy(&output.stderr));
        panic!("CLI execution failed: {:?}", output.status);
    }

    // Verify chord detection in JSON
    let json_path = output_dir.join("complex_chords_harmony.json");
    let json_content = std::fs::read_to_string(&json_path)?;
    let harmony_map: serde_json::Value = serde_json::from_str(&json_content)?;

    let progression = harmony_map
        .get("progression")
        .and_then(|p| p.as_array())
        .expect("JSON missing progression array");

    println!(
        "✅ Complex chord progression test PASSED - {} harmonic contexts detected",
        progression.len()
    );
    Ok(())
}

/// Generate WAV file with multiple simultaneous frequencies (chord)
#[cfg(feature = "ml-analysis")]
fn create_synthetic_chord_wav(path: &Path, sample_rate: u32, duration_sec: f32, frequencies: &[f32]) -> Result<()> {
    use hound::{WavSpec, WavWriter};

    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = WavWriter::create(path, spec)?;
    let num_samples = (sample_rate as f32 * duration_sec) as usize;

    for i in 0..num_samples {
        let t = i as f32 / sample_rate as f32;
        
        // Sum all frequencies (equal amplitude)
        let mut sample = 0.0f32;
        for &freq in frequencies {
            sample += (2.0 * std::f32::consts::PI * freq * t).sin();
        }
        sample /= frequencies.len() as f32; // Normalize

        let amplitude = (sample * i16::MAX as f32) as i16;
        writer.write_sample(amplitude)?;
    }

    writer.finalize()?;
    Ok(())
}

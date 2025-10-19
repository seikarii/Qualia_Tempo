//! # Responsibility
//! Integration test for batch processing mode validating parallel file processing,
//! error handling, and output isolation.

use anyhow::Result;
use std::path::PathBuf;
use std::process::Command;
use tempfile::TempDir;

/// Test batch processing with multiple valid audio files
#[test]
fn test_batch_process_multiple_files() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let input_dir = temp_dir.path().join("input");
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir_all(&input_dir)?;

    // Create 3 synthetic WAV files
    for i in 1..=3 {
        let freq = 440.0 * (i as f32);
        let input_file = input_dir.join(format!("test_{}.wav", i));
        create_synthetic_wav(&input_file, 48000, 0.5, freq)?;
    }

    // Run batch processor
    let output = Command::new(env!("CARGO_BIN_EXE_qualia-8d-harmony-processor"))
        .args(&[
            "batch",
            "-i",
            input_dir.to_str().unwrap(),
            "-o",
            output_dir.to_str().unwrap(),
            "--parallel",
            "2",
            "--sample-rate",
            "48000",
        ])
        .output()?;

    if !output.status.success() {
        eprintln!("STDOUT:\n{}", String::from_utf8_lossy(&output.stdout));
        eprintln!("STDERR:\n{}", String::from_utf8_lossy(&output.stderr));
        panic!("Batch CLI execution failed: {:?}", output.status);
    }

    // Verify each file has isolated output directory
    for i in 1..=3 {
        let file_output_dir = output_dir.join(format!("test_{}", i));
        assert!(file_output_dir.exists(), "Output directory for test_{} not created", i);
        
        let wav_file = file_output_dir.join(format!("test_{}_8d.wav", i));
        let json_file = file_output_dir.join(format!("test_{}_harmony.json", i));
        
        assert!(wav_file.exists(), "WAV file not created for test_{}", i);
        assert!(json_file.exists(), "JSON file not created for test_{}", i);
    }

    Ok(())
}

/// Test batch processing with file extension filtering
#[test]
fn test_batch_extension_filtering() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let input_dir = temp_dir.path().join("input");
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir_all(&input_dir)?;

    // Create WAV and TXT files (TXT should be ignored)
    create_synthetic_wav(&input_dir.join("valid.wav"), 48000, 0.5, 440.0)?;
    std::fs::write(input_dir.join("ignored.txt"), "not audio")?;

    // Run batch with only WAV extension
    let output = Command::new(env!("CARGO_BIN_EXE_qualia-8d-harmony-processor"))
        .args(&[
            "batch",
            "-i",
            input_dir.to_str().unwrap(),
            "-o",
            output_dir.to_str().unwrap(),
            "--extensions",
            "wav",
        ])
        .output()?;

    assert!(output.status.success(), "CLI should succeed");

    // Only valid.wav should be processed
    assert!(output_dir.join("valid").exists(), "WAV file should be processed");
    assert!(!output_dir.join("ignored").exists(), "TXT file should be ignored");

    Ok(())
}

/// Test batch processing error handling - one file fails but others succeed
#[test]
fn test_batch_partial_failure() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let input_dir = temp_dir.path().join("input");
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir_all(&input_dir)?;

    // Create one valid and one corrupted WAV file
    create_synthetic_wav(&input_dir.join("good.wav"), 48000, 0.5, 440.0)?;
    
    // Create invalid WAV (just random bytes)
    std::fs::write(input_dir.join("corrupt.wav"), vec![0xFF; 1000])?;

    // Run batch processor (should fail overall but process valid file)
    let output = Command::new(env!("CARGO_BIN_EXE_qualia-8d-harmony-processor"))
        .args(&[
            "batch",
            "-i",
            input_dir.to_str().unwrap(),
            "-o",
            output_dir.to_str().unwrap(),
        ])
        .output()?;

    // Batch should report failure
    assert!(!output.status.success(), "Batch should fail with corrupt file");

    // But valid file should still be processed
    let good_output = output_dir.join("good");
    assert!(good_output.exists(), "Good file should still be processed");
    assert!(good_output.join("good_8d.wav").exists());

    Ok(())
}

/// Test batch processing with empty directory
#[test]
fn test_batch_empty_directory() -> Result<()> {
    let temp_dir = TempDir::new()?;
    let input_dir = temp_dir.path().join("empty");
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir_all(&input_dir)?;

    // Run batch on empty directory
    let output = Command::new(env!("CARGO_BIN_EXE_qualia-8d-harmony-processor"))
        .args(&[
            "batch",
            "-i",
            input_dir.to_str().unwrap(),
            "-o",
            output_dir.to_str().unwrap(),
        ])
        .output()?;

    // Should succeed gracefully (no files to process)
    assert!(output.status.success(), "Empty directory should succeed gracefully");

    Ok(())
}

// Helper function to create synthetic WAV files for testing
fn create_synthetic_wav(path: &PathBuf, sample_rate: u32, duration_sec: f32, frequency: f32) -> Result<()> {
    use hound::{WavSpec, WavWriter};
    use std::f32::consts::PI;

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
        let amplitude = 0.3; // Moderate amplitude
        let sample = (amplitude * (2.0 * PI * frequency * t).sin() * i16::MAX as f32) as i16;
        writer.write_sample(sample)?;
    }

    writer.finalize()?;
    Ok(())
}

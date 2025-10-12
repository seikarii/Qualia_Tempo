//! Integration tests for Qualia Tempo 8D Processor

use std::path::PathBuf;
use qualia_tempo_8d_processor::config::ProcessorConfig;
use qualia_tempo_8d_processor::processor::AudioProcessor;

#[test]
fn test_process_audio_file() {
    let input = PathBuf::from("/media/seikarii/Nvme/QualiaTempo/docs/music/Inicio.mp3");
    
    // Skip if file doesn't exist (CI environment)
    if !input.exists() {
        println!("Skipping test: input file not found");
        return;
    }

    let output = PathBuf::from("tests/test_output/test_integration.wav");
    
    let config = ProcessorConfig {
        enable_spatial: true,
        enable_drop_enhancer: true,
        enable_orchestra: false,
        enable_vocal_adjust: false,
        rotation_speed: 0.2,
        drop_threshold: 0.7,
    };

    let mut processor = AudioProcessor::new(config);
    let result = processor.process_file(&input, &output);

    assert!(result.is_ok(), "Processing failed: {:?}", result.err());
    assert!(output.exists(), "Output file was not created");

    // Clean up
    let _ = std::fs::remove_file(output);
}

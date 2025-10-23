//! # Responsibility
//! Generate JSON schemas for all contract types for frontend/external consumers.
//!
//! ---
//!
//! Run with: `cargo run --bin generate_schemas`
//!
//! Outputs schemas to `../shared_contracts/*.schema.json`

use audio_forge::config::app_config::AppConfig;
use audio_forge::contracts::channel_configuration::ChannelConfiguration;
use audio_forge::contracts::effect_parameters::EffectConfig;
use audio_forge::contracts::frequency_spectrum::FrequencySpectrum;
use schemars::schema_for;
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔧 Generating JSON schemas for Audio Forge contracts...\n");

    // Ensure output directory exists
    let output_dir = Path::new("../shared_contracts");
    if !output_dir.exists() {
        fs::create_dir_all(output_dir)?;
        println!("✅ Created output directory: {}", output_dir.display());
    }

    // Generate schemas for all contract types
    let schemas = vec![
        ("EffectConfig", schema_for!(EffectConfig)),
        ("ChannelConfiguration", schema_for!(ChannelConfiguration)),
        ("FrequencySpectrum", schema_for!(FrequencySpectrum)),
        ("AppConfig", schema_for!(AppConfig)),
    ];

    for (name, schema) in schemas {
        let filename = format!("{}.schema.json", name);
        let filepath = output_dir.join(&filename);

        let json = serde_json::to_string_pretty(&schema)?;
        fs::write(&filepath, json)?;

        println!("✅ Generated: {}", filepath.display());
    }

    println!("\n🎉 Schema generation complete!");
    println!("   Output directory: {}", output_dir.display());

    Ok(())
}

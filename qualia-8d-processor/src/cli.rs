//! # Responsibility
//! Command-line argument parsing and validation for 8D audio processor.

use clap::{Parser, Subcommand};
use std::path::PathBuf;

/// # Responsibility
/// Root CLI structure defining all available commands and options.
#[derive(Parser)]
#[command(name = "qualia-8d")]
#[command(about = "Standalone 8D Audio Processor", long_about = None)]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Process audio files with 8D spatial effect
    Process {
        /// Input audio stems (multiple files, mutually exclusive with --input)
        #[arg(long, value_name = "FILE", num_args = 1..)]
        stems: Option<Vec<PathBuf>>,

        /// Single input file (no separation, mutually exclusive with --stems)
        #[arg(long, value_name = "FILE", conflicts_with = "stems")]
        input: Option<PathBuf>,

        /// Output WAV file path
        #[arg(short, long, value_name = "FILE", required = true)]
        output: PathBuf,

        /// Rotation speed in revolutions per minute
        #[arg(long, default_value = "6.0")]
        rotation_speed: f32,

        /// Number of ensemble voices per stem
        #[arg(long, default_value = "5")]
        ensemble_voices: usize,

        /// Spatial spread in degrees for ensemble voices
        #[arg(long, default_value = "15.0")]
        spatial_spread: f32,

        /// Config YAML path (overrides defaults)
        #[arg(long, value_name = "FILE")]
        config: Option<PathBuf>,
    },

    /// Generate test output with default settings (for quick validation)
    Test {
        /// Output WAV file path
        #[arg(short, long, value_name = "FILE", default_value = "test_output_8d.wav")]
        output: PathBuf,

        /// Duration in seconds
        #[arg(long, default_value = "2.0")]
        duration: f32,

        /// Test tone frequency in Hz
        #[arg(long, default_value = "440.0")]
        frequency: f32,
    },
}

impl Cli {
    /// Validate CLI arguments and return errors if invalid
    pub fn validate(&self) -> anyhow::Result<()> {
        match &self.command {
            Commands::Process {
                stems,
                input,
                output,
                rotation_speed,
                ensemble_voices,
                spatial_spread,
                ..
            } => {
                // Ensure at least one input source
                if stems.is_none() && input.is_none() {
                    anyhow::bail!("Must provide either --stems or --input");
                }

                // Validate rotation speed
                if *rotation_speed <= 0.0 {
                    anyhow::bail!("Rotation speed must be positive");
                }

                // Validate ensemble voices
                if *ensemble_voices == 0 {
                    anyhow::bail!("Ensemble voices must be at least 1");
                }

                // Validate spatial spread
                if *spatial_spread < 0.0 || *spatial_spread > 360.0 {
                    anyhow::bail!("Spatial spread must be between 0 and 360 degrees");
                }

                // Check output directory exists
                if let Some(parent) = output.parent() {
                    if !parent.exists() {
                        anyhow::bail!("Output directory does not exist: {:?}", parent);
                    }
                }

                // Check input files exist
                if let Some(stems_paths) = stems {
                    for stem in stems_paths {
                        if !stem.exists() {
                            anyhow::bail!("Stem file not found: {:?}", stem);
                        }
                    }
                }

                if let Some(input_path) = input {
                    if !input_path.exists() {
                        anyhow::bail!("Input file not found: {:?}", input_path);
                    }
                }
            }
            Commands::Test {
                duration,
                frequency,
                ..
            } => {
                if *duration <= 0.0 {
                    anyhow::bail!("Duration must be positive");
                }
                if *frequency <= 0.0 || *frequency > 20000.0 {
                    anyhow::bail!("Frequency must be between 0 and 20000 Hz");
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::CommandFactory;

    #[test]
    fn test_cli_verify() {
        // Verify CLI structure is valid
        Cli::command().debug_assert();
    }

    #[test]
    fn test_process_command_validation() {
        let cli = Cli {
            command: Commands::Process {
                stems: None,
                input: None,
                output: PathBuf::from("/tmp/output.wav"),
                rotation_speed: 6.0,
                ensemble_voices: 5,
                spatial_spread: 15.0,
                config: None,
            },
        };

        // Should fail - no input source
        assert!(cli.validate().is_err());
    }

    #[test]
    fn test_invalid_rotation_speed() {
        let cli = Cli {
            command: Commands::Process {
                stems: Some(vec![PathBuf::from("/tmp/test.wav")]),
                input: None,
                output: PathBuf::from("/tmp/output.wav"),
                rotation_speed: -1.0, // Invalid
                ensemble_voices: 5,
                spatial_spread: 15.0,
                config: None,
            },
        };

        assert!(cli.validate().is_err());
    }

    #[test]
    fn test_test_command_validation() {
        let cli = Cli {
            command: Commands::Test {
                output: PathBuf::from("/tmp/test.wav"),
                duration: 2.0,
                frequency: 440.0,
            },
        };

        // Should pass with valid parameters
        assert!(cli.validate().is_ok());
    }

    #[test]
    fn test_invalid_test_duration() {
        let cli = Cli {
            command: Commands::Test {
                output: PathBuf::from("/tmp/test.wav"),
                duration: -1.0, // Invalid
                frequency: 440.0,
            },
        };

        assert!(cli.validate().is_err());
    }
}

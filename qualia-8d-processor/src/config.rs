//! # Responsibility
//! Configuration structures and YAML loading for 8D audio processor.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// # Responsibility
/// Root configuration structure containing all processor settings.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    pub audio: AudioConfig,
    pub hrtf: HRTFConfig,
    pub circular_motion: CircularMotionConfig,
    pub ensemble: EnsembleConfig,
    pub eq_presets: HashMap<String, Vec<EQBand>>,
    pub mixer: MixerConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AudioConfig {
    pub sample_rate: u32,
    pub buffer_size: usize,
    pub bit_depth: u16,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct HRTFConfig {
    pub dataset_path: PathBuf,
    pub interpolation: String,
    pub cache_size: usize,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CircularMotionConfig {
    pub default_speed_rpm: f32,
    pub default_radius_m: f32,
    pub default_elevation_deg: f32,
    pub direction: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EnsembleConfig {
    pub default_voices: usize,
    pub delay_range_ms: (f32, f32),
    pub pitch_shift_cents: (f32, f32),
    pub spatial_spread_deg: f32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EQBand {
    pub freq: f32,
    pub gain_db: f32,
    pub q: f32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MixerConfig {
    pub limiter_threshold_db: f32,
}

impl Config {
    /// Load configuration from YAML file
    pub fn load(path: &Path) -> anyhow::Result<Self> {
        let contents = std::fs::read_to_string(path)?;
        let config: Config = serde_yaml::from_str(&contents)?;
        Ok(config)
    }
}

impl Default for Config {
    /// Create default configuration
    fn default() -> Self {
        Self {
            audio: AudioConfig {
                sample_rate: 48000,
                buffer_size: 2048,
                bit_depth: 24,
            },
            hrtf: HRTFConfig {
                dataset_path: PathBuf::from("config/hrtf/MIT_KEMAR_normal.sofa"),
                interpolation: "linear".to_string(),
                cache_size: 500,
            },
            circular_motion: CircularMotionConfig {
                default_speed_rpm: 6.0,
                default_radius_m: 1.5,
                default_elevation_deg: 0.0,
                direction: "clockwise".to_string(),
            },
            ensemble: EnsembleConfig {
                default_voices: 5,
                delay_range_ms: (5.0, 25.0),
                pitch_shift_cents: (-5.0, 5.0),
                spatial_spread_deg: 15.0,
            },
            eq_presets: HashMap::new(),
            mixer: MixerConfig {
                limiter_threshold_db: -0.3,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.audio.sample_rate, 48000);
        assert_eq!(config.circular_motion.default_speed_rpm, 6.0);
    }

    #[test]
    fn test_config_serialization() {
        let config = Config::default();
        let yaml = serde_yaml::to_string(&config).unwrap();
        let deserialized: Config = serde_yaml::from_str(&yaml).unwrap();
        assert_eq!(deserialized.audio.sample_rate, config.audio.sample_rate);
    }
}

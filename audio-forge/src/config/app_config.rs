//! # Responsibility
//! Application configuration schema with serialization support.

use crate::contracts::channel_configuration::ChannelMode;
use crate::contracts::effect_parameters::EffectConfig;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use validator::Validate;

/// # Responsibility
/// Root configuration struct containing all application settings.
///
/// ---
///
/// Serialized to YAML for human-readable persistence.
/// Includes audio, effects, and visualization configurations.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Default, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    #[validate(nested)]
    pub audio: AudioConfig,
    #[serde(default)]
    #[validate(nested)]
    pub effects: EffectConfig,
    #[serde(default)]
    #[validate(nested)]
    pub visualization: VisualizationConfig,
}

/// # Responsibility
/// Audio playback configuration.
///
/// ---
///
/// Persists user preferences for volume, channel mode, and last loaded file.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct AudioConfig {
    /// Default volume [0.0, 1.0]
    #[validate(range(min = 0.0, max = 1.0))]
    pub default_volume: f32,
    
    /// Preferred channel mode (Stereo or 8.1 Surround)
    pub channel_mode: ChannelMode,
    
    /// Last loaded audio file path (for quick reload)
    pub last_file_path: Option<PathBuf>,
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            default_volume: 1.0,
            channel_mode: ChannelMode::Stereo,
            last_file_path: None,
        }
    }
}

/// # Responsibility
/// Visualization rendering preferences.
///
/// ---
///
/// Controls waveform/spectrum appearance and update rate.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VisualizationConfig {
    /// Waveform line color (RGB)
    pub waveform_color: [u8; 3],
    
    /// Number of spectrum bars to render
    #[validate(range(min = 10, max = 500))]
    pub spectrum_bar_count: usize,
    
    /// Visualization update rate (FPS)
    #[validate(range(min = 10, max = 144))]
    pub update_rate_fps: u32,
}

impl Default for VisualizationConfig {
    fn default() -> Self {
        Self {
            waveform_color: [100, 200, 100], // Green
            spectrum_bar_count: 100,
            update_rate_fps: 30,
        }
    }
}

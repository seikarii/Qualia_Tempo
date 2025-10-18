//! # Responsibility
//! Defines game settings and accessibility options contracts.
//!
//! ---
//!
//! Contains GameSettings and AccessibilitySettings structures.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents accessibility configuration options.
///
/// ---
///
/// Ensures game is playable for diverse audiences per GDD requirements.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    pub colorblind_mode: ColorblindMode,
    pub reduced_motion: bool,
    pub screen_shake_intensity: f32, // 0.0 to 1.0
    pub high_contrast_mode: bool,
    pub subtitle_size: SubtitleSize,
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            colorblind_mode: ColorblindMode::None,
            reduced_motion: false,
            screen_shake_intensity: 1.0,
            high_contrast_mode: false,
            subtitle_size: SubtitleSize::Medium,
        }
    }
}

/// # Responsibility
/// Enumerates colorblind assistance modes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ColorblindMode {
    None,
    Protanopia,
    Deuteranopia,
    Tritanopia,
}

/// # Responsibility
/// Enumerates subtitle size options.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SubtitleSize {
    Small,
    Medium,
    Large,
    ExtraLarge,
}

/// # Responsibility
/// Represents complete game settings configuration.
///
/// ---
///
/// Persisted to local storage, synchronized between sessions.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub master_volume: f32, // 0.0 to 1.0
    pub music_volume: f32,
    pub sfx_volume: f32,
    pub vsync_enabled: bool,
    pub fullscreen: bool,
    pub resolution: (u32, u32),
    pub graphics_quality: GraphicsQuality,
    pub accessibility: AccessibilitySettings,
}

impl Default for GameSettings {
    fn default() -> Self {
        Self {
            master_volume: 0.8,
            music_volume: 0.7,
            sfx_volume: 0.9,
            vsync_enabled: true,
            fullscreen: false,
            resolution: (1920, 1080),
            graphics_quality: GraphicsQuality::High,
            accessibility: AccessibilitySettings::default(),
        }
    }
}

/// # Responsibility
/// Enumerates graphics quality presets.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GraphicsQuality {
    Low,
    Medium,
    High,
    Ultra,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_settings_default() {
        let settings = GameSettings::default();
        assert_eq!(settings.master_volume, 0.8);
        assert!(settings.vsync_enabled);
    }

    #[test]
    fn test_game_settings_serialization() {
        let settings = GameSettings::default();
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: GameSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }

    #[test]
    fn test_accessibility_settings_default() {
        let settings = AccessibilitySettings::default();
        assert!(!settings.reduced_motion);
        assert_eq!(settings.colorblind_mode, ColorblindMode::None);
    }

    #[test]
    fn test_colorblind_mode_enum() {
        let mode = ColorblindMode::Protanopia;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, r#""protanopia""#);
    }
}

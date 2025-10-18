//! # Responsibility
//! Defines game settings and configuration structures.
//!
//! ---
//!
//! This module contains all user-configurable settings for gameplay,
//! accessibility, audio, and visual preferences.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Enumerates difficulty levels.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DifficultyLevel {
    Easy,
    Normal,
    Hard,
    Expert,
    Nightmare,
}

/// # Responsibility
/// Enumerates audio quality presets.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AudioQuality {
    Low,
    Medium,
    High,
    Ultra,
}

/// # Responsibility
/// Enumerates graphics quality presets.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GraphicsQuality {
    Low,
    Medium,
    High,
    Ultra,
}

/// # Responsibility
/// Defines accessibility settings for inclusive gameplay.
///
/// ---
///
/// These settings ensure the game is accessible to players with various needs,
/// including visual, auditory, and motor impairments.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
#[allow(clippy::struct_excessive_bools)] // Settings struct - bools are appropriate
pub struct AccessibilitySettings {
    /// Enable colorblind mode
    pub colorblind_mode: bool,
    /// Colorblind mode type ("deuteranopia", "protanopia", "tritanopia")
    pub colorblind_type: Option<String>,
    /// Enable high contrast visuals
    pub high_contrast: bool,
    /// Enable screen reader support
    pub screen_reader: bool,
    /// Enable reduced motion (less camera shake, particle effects)
    pub reduced_motion: bool,
    /// Enable photosensitivity mode (no flashing lights)
    pub photosensitivity_mode: bool,
    /// Text size multiplier (1.0 = normal)
    pub text_size_multiplier: f32,
    /// Enable subtitles for audio cues
    pub subtitles_enabled: bool,
    /// Subtitle background opacity (0.0 - 1.0)
    pub subtitle_background_opacity: f32,
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            colorblind_mode: false,
            colorblind_type: None,
            high_contrast: false,
            screen_reader: false,
            reduced_motion: false,
            photosensitivity_mode: false,
            text_size_multiplier: 1.0,
            subtitles_enabled: false,
            subtitle_background_opacity: 0.7,
        }
    }
}

/// # Responsibility
/// Defines complete game settings configuration.
///
/// ---
///
/// This is the master settings struct that encompasses all user preferences.
/// Serialized to disk and loaded at startup.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
#[allow(clippy::struct_excessive_bools)] // Settings struct - bools are appropriate
pub struct GameSettings {
    /// Game difficulty
    pub difficulty: DifficultyLevel,
    /// Master audio volume (0.0 - 1.0)
    pub master_volume: f32,
    /// Music volume (0.0 - 1.0)
    pub music_volume: f32,
    /// Sound effects volume (0.0 - 1.0)
    pub sfx_volume: f32,
    /// Audio quality preset
    pub audio_quality: AudioQuality,
    /// Graphics quality preset
    pub graphics_quality: GraphicsQuality,
    /// Enable V-Sync
    pub vsync_enabled: bool,
    /// Target framerate (0 = unlimited)
    pub target_fps: u32,
    /// Particle density multiplier (0.0 - 1.0)
    pub particle_density: f32,
    /// Enable bloom post-processing
    pub bloom_enabled: bool,
    /// Enable motion blur
    pub motion_blur_enabled: bool,
    /// Enable temporal anti-aliasing
    pub taa_enabled: bool,
    /// Mouse sensitivity (0.1 - 3.0)
    pub mouse_sensitivity: f32,
    /// Invert Y-axis
    pub invert_y_axis: bool,
    /// Enable gamepad
    pub gamepad_enabled: bool,
    /// Gamepad vibration intensity (0.0 - 1.0)
    pub gamepad_vibration: f32,
    /// Accessibility settings
    pub accessibility: AccessibilitySettings,
    /// Enable telemetry/analytics
    pub telemetry_enabled: bool,
}

impl Default for GameSettings {
    fn default() -> Self {
        Self {
            difficulty: DifficultyLevel::Normal,
            master_volume: 0.8,
            music_volume: 0.7,
            sfx_volume: 0.8,
            audio_quality: AudioQuality::High,
            graphics_quality: GraphicsQuality::High,
            vsync_enabled: true,
            target_fps: 60,
            particle_density: 1.0,
            bloom_enabled: true,
            motion_blur_enabled: true,
            taa_enabled: true,
            mouse_sensitivity: 1.0,
            invert_y_axis: false,
            gamepad_enabled: true,
            gamepad_vibration: 0.5,
            accessibility: AccessibilitySettings::default(),
            telemetry_enabled: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_settings_default() {
        let settings = GameSettings::default();
        assert_eq!(settings.difficulty, DifficultyLevel::Normal);
        assert_eq!(settings.master_volume, 0.8);
        assert!(settings.vsync_enabled);
    }

    #[test]
    fn test_game_settings_serialization() {
        let settings = GameSettings::default();
        let json = serde_json::to_string(&settings).expect("Failed to serialize");
        let deserialized: GameSettings = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(settings.difficulty, deserialized.difficulty);
        assert_eq!(settings.graphics_quality, deserialized.graphics_quality);
    }

    #[test]
    fn test_accessibility_settings_default() {
        let settings = AccessibilitySettings::default();
        assert!(!settings.colorblind_mode);
        assert!(!settings.high_contrast);
        assert_eq!(settings.text_size_multiplier, 1.0);
    }

    #[test]
    fn test_difficulty_level_serialization() {
        let difficulty = DifficultyLevel::Expert;
        let json = serde_json::to_string(&difficulty).expect("Failed to serialize");
        assert_eq!(json, r#""expert""#);
    }
}

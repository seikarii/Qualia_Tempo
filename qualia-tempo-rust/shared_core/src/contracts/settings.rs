//! # Responsibility
//! Defines game settings and user configuration structures.
//!
//! ---
//!
//! This module implements all player-facing settings from DATA.RUST.md,
//! including graphics, audio, accessibility, and control preferences.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Defines graphics quality presets.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GraphicsQuality {
    Low,
    Medium,
    High,
    Ultra,
    Custom,
}

/// # Responsibility
/// Defines anti-aliasing methods.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AntiAliasingMode {
    None,
    Fxaa,
    Taa,
    Msaa2x,
    Msaa4x,
}

/// # Responsibility
/// Graphics rendering settings.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GraphicsSettings {
    pub quality_preset: GraphicsQuality,
    pub resolution_width: u32,
    pub resolution_height: u32,
    pub fullscreen: bool,
    pub vsync: bool,
    pub fps_limit: u32,
    pub anti_aliasing: AntiAliasingMode,
    pub particle_density: f32, // 0.0 to 1.0
    pub bloom_enabled: bool,
    pub god_rays_enabled: bool,
    pub motion_blur_enabled: bool,
    pub chromatic_aberration_enabled: bool,
}

impl Default for GraphicsSettings {
    fn default() -> Self {
        Self {
            quality_preset: GraphicsQuality::High,
            resolution_width: 1920,
            resolution_height: 1080,
            fullscreen: false,
            vsync: true,
            fps_limit: 144,
            anti_aliasing: AntiAliasingMode::Taa,
            particle_density: 1.0,
            bloom_enabled: true,
            god_rays_enabled: true,
            motion_blur_enabled: false,
            chromatic_aberration_enabled: false,
        }
    }
}

/// # Responsibility
/// Audio mixing settings.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub master_volume: f32,      // 0.0 to 1.0
    pub music_volume: f32,       // 0.0 to 1.0
    pub sfx_volume: f32,         // 0.0 to 1.0
    pub metronome_volume: f32,   // 0.0 to 1.0
    pub enable_spatial_audio: bool,
    pub audio_latency_ms: f32,   // Input latency compensation
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            master_volume: 0.8,
            music_volume: 0.7,
            sfx_volume: 0.6,
            metronome_volume: 0.5,
            enable_spatial_audio: true,
            audio_latency_ms: 20.0,
        }
    }
}

/// # Responsibility
/// Control input settings.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ControlSettings {
    pub mouse_sensitivity: f32,
    pub invert_mouse_y: bool,
    pub key_bindings: Vec<(String, String)>, // (action, key)
}

impl Default for ControlSettings {
    fn default() -> Self {
        Self {
            mouse_sensitivity: 1.0,
            invert_mouse_y: false,
            key_bindings: vec![
                ("dash".to_string(), "LeftMouse".to_string()),
                ("note_q".to_string(), "Q".to_string()),
                ("note_e".to_string(), "E".to_string()),
                ("note_r".to_string(), "R".to_string()),
                ("note_t".to_string(), "T".to_string()),
                ("note_f".to_string(), "F".to_string()),
                ("note_g".to_string(), "G".to_string()),
                ("note_c".to_string(), "C".to_string()),
            ],
        }
    }
}

/// # Responsibility
/// Accessibility and visual assist settings.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    pub colorblind_mode: bool,
    pub high_contrast_mode: bool,
    pub reduce_screen_shake: bool,
    pub reduce_flashing_lights: bool,
    pub show_timing_indicators: bool,
    pub telegraph_duration_multiplier: f32, // 1.0 = normal, 2.0 = double duration
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            colorblind_mode: false,
            high_contrast_mode: false,
            reduce_screen_shake: false,
            reduce_flashing_lights: false,
            show_timing_indicators: false,
            telegraph_duration_multiplier: 1.0,
        }
    }
}

/// # Responsibility
/// Aggregates all game settings.
///
/// ---
///
/// This is the root settings structure saved to disk and loaded at startup.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub graphics: GraphicsSettings,
    pub audio: AudioSettings,
    pub controls: ControlSettings,
    pub accessibility: AccessibilitySettings,
}

impl Default for GameSettings {
    fn default() -> Self {
        Self {
            graphics: GraphicsSettings::default(),
            audio: AudioSettings::default(),
            controls: ControlSettings::default(),
            accessibility: AccessibilitySettings::default(),
        }
    }
}

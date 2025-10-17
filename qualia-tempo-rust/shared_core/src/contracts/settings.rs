//! # Responsibility
//! Defines user-configurable game settings and accessibility options.
//!
//! ---
//!
//! This module contains all settings contracts that the user can modify
//! through the settings menu. Settings are persisted to local storage.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::collections::HashMap;

/// # Responsibility
/// Audio configuration settings.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub master_volume: f32,
    pub music_volume: f32,
    pub sfx_volume: f32,
    pub audio_offset_ms: i32,
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            master_volume: 1.0,
            music_volume: 0.8,
            sfx_volume: 1.0,
            audio_offset_ms: 0,
        }
    }
}

/// # Responsibility
/// Timing window configuration for rhythm accuracy.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TimingWindowSettings {
    pub perfect: u32,
    pub good: u32,
    pub ok: u32,
}

impl Default for TimingWindowSettings {
    fn default() -> Self {
        Self {
            perfect: 50,
            good: 100,
            ok: 150,
        }
    }
}

/// # Responsibility
/// Gameplay-specific settings.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameplaySettings {
    pub timing_window_ms: TimingWindowSettings,
    pub autoplay: bool,
    pub practice_mode: bool,
    pub show_timing: bool,
}

impl Default for GameplaySettings {
    fn default() -> Self {
        Self {
            timing_window_ms: TimingWindowSettings::default(),
            autoplay: false,
            practice_mode: false,
            show_timing: true,
        }
    }
}

/// # Responsibility
/// Particle density level.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ParticleDensity {
    Low,
    Medium,
    High,
    Ultra,
}

/// # Responsibility
/// Visual rendering settings.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisualSettings {
    pub brightness: f32,
    pub particle_density: ParticleDensity,
    pub post_processing_enabled: bool,
    pub bloom_intensity: f32,
    pub show_hit_effects: bool,
    pub show_combo_text: bool,
    pub background_animations: bool,
}

impl Default for VisualSettings {
    fn default() -> Self {
        Self {
            brightness: 1.0,
            particle_density: ParticleDensity::High,
            post_processing_enabled: true,
            bloom_intensity: 0.8,
            show_hit_effects: true,
            show_combo_text: true,
            background_animations: true,
        }
    }
}

/// # Responsibility
/// Input mapping and sensitivity settings.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InputSettings {
    pub key_bindings: HashMap<String, Vec<String>>,
    pub mouse_sensitivity: f32,
}

impl Default for InputSettings {
    fn default() -> Self {
        Self {
            key_bindings: HashMap::new(),
            mouse_sensitivity: 1.0,
        }
    }
}

/// # Responsibility
/// Colorblind mode options.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ColorblindMode {
    None,
    Protanopia,
    Deuteranopia,
    Tritanopia,
}

/// # Responsibility
/// Accessibility configuration options.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    pub colorblind_mode: ColorblindMode,
    pub screen_shake_intensity: f32,
    pub flashing_effects: bool,
    pub subtitles_enabled: bool,
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            colorblind_mode: ColorblindMode::None,
            screen_shake_intensity: 1.0,
            flashing_effects: true,
            subtitles_enabled: false,
        }
    }
}

/// # Responsibility
/// Aggregates all game settings into a single structure.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub audio: AudioSettings,
    pub gameplay: GameplaySettings,
    pub visual: VisualSettings,
    pub input: InputSettings,
    pub accessibility: AccessibilitySettings,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_settings_default() {
        let settings = GameSettings::default();
        assert_eq!(settings.audio.master_volume, 1.0);
        assert_eq!(settings.gameplay.autoplay, false);
        assert_eq!(settings.visual.particle_density, ParticleDensity::High);
    }

    #[test]
    fn test_game_settings_serialization() {
        let settings = GameSettings::default();
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("masterVolume"));
        
        let deserialized: GameSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, settings);
    }
}

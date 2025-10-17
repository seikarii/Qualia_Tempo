//! # Responsibility
//! Contains all game settings and configuration data structures.
//!
//! ---
//!
//! This module defines the complete hierarchy of user-configurable settings.
//! Settings are persisted and can be modified through the UI.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::collections::HashMap;

/// # Responsibility
/// Audio configuration settings.
///
/// ---
///
/// Controls all audio volume levels and timing calibration.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    /// Master volume (0.0 to 1.0)
    pub master_volume: f32,
    
    /// Music volume (0.0 to 1.0)
    pub music_volume: f32,
    
    /// Sound effects volume (0.0 to 1.0)
    pub sfx_volume: f32,
    
    /// Audio offset in milliseconds for synchronization calibration
    pub audio_offset_ms: i32,
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            master_volume: 1.0,
            music_volume: 0.8,
            sfx_volume: 0.8,
            audio_offset_ms: 0,
        }
    }
}

/// # Responsibility
/// Timing window configuration for hit detection.
///
/// ---
///
/// Defines the millisecond windows for perfect, good, and ok hits.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimingWindowSettings {
    /// Perfect hit window in milliseconds
    pub perfect: u32,
    
    /// Good hit window in milliseconds
    pub good: u32,
    
    /// Ok hit window in milliseconds
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
/// Gameplay mechanics settings.
///
/// ---
///
/// Controls timing windows, practice features, and gameplay assists.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameplaySettings {
    /// Timing window configuration
    pub timing_window_ms: TimingWindowSettings,
    
    /// Whether autoplay is enabled (for demonstration)
    pub autoplay: bool,
    
    /// Whether practice mode is enabled (infinite health, rewind)
    pub practice_mode: bool,
    
    /// Whether to show timing feedback on hits
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
/// Particle density levels for performance scaling.
///
/// ---
///
/// Affects the number of particles rendered per effect.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ParticleDensity {
    Low,
    Medium,
    High,
    Ultra,
}

impl Default for ParticleDensity {
    fn default() -> Self {
        Self::High
    }
}

/// # Responsibility
/// Visual effects and rendering settings.
///
/// ---
///
/// Controls visual quality, particle density, and post-processing effects.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisualSettings {
    /// Screen brightness multiplier (0.0 to 2.0)
    pub brightness: f32,
    
    /// Particle density level
    pub particle_density: ParticleDensity,
    
    /// Whether post-processing effects are enabled
    pub post_processing_enabled: bool,
    
    /// Bloom intensity (0.0 to 2.0)
    pub bloom_intensity: f32,
    
    /// Whether to show hit effects
    pub show_hit_effects: bool,
    
    /// Whether to show combo text
    pub show_combo_text: bool,
    
    /// Whether background animations are enabled
    pub background_animations: bool,
}

impl Default for VisualSettings {
    fn default() -> Self {
        Self {
            brightness: 1.0,
            particle_density: ParticleDensity::default(),
            post_processing_enabled: true,
            bloom_intensity: 1.0,
            show_hit_effects: true,
            show_combo_text: true,
            background_animations: true,
        }
    }
}

/// # Responsibility
/// Input configuration including key bindings.
///
/// ---
///
/// Maps actions to input keys. Key bindings are stored as action -> key list.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InputSettings {
    /// Key bindings map (action name -> list of keys)
    pub key_bindings: HashMap<String, Vec<String>>,
    
    /// Mouse sensitivity multiplier (0.1 to 5.0)
    pub mouse_sensitivity: f32,
}

impl Default for InputSettings {
    fn default() -> Self {
        let mut key_bindings = HashMap::new();
        key_bindings.insert("note_q".to_string(), vec!["KeyQ".to_string()]);
        key_bindings.insert("note_e".to_string(), vec!["KeyE".to_string()]);
        key_bindings.insert("note_r".to_string(), vec!["KeyR".to_string()]);
        key_bindings.insert("note_t".to_string(), vec!["KeyT".to_string()]);
        key_bindings.insert("note_f".to_string(), vec!["KeyF".to_string()]);
        key_bindings.insert("note_g".to_string(), vec!["KeyG".to_string()]);
        key_bindings.insert("note_c".to_string(), vec!["KeyC".to_string()]);
        key_bindings.insert("dash".to_string(), vec!["Mouse0".to_string()]);
        
        Self {
            key_bindings,
            mouse_sensitivity: 1.0,
        }
    }
}

/// # Responsibility
/// Colorblind mode options.
///
/// ---
///
/// Adjusts color palettes for accessibility.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ColorblindMode {
    None,
    Protanopia,
    Deuteranopia,
    Tritanopia,
}

impl Default for ColorblindMode {
    fn default() -> Self {
        Self::None
    }
}

/// # Responsibility
/// Accessibility settings for inclusive gameplay.
///
/// ---
///
/// Provides options for colorblindness, motion sensitivity, and visual clarity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    /// Colorblind mode filter
    pub colorblind_mode: ColorblindMode,
    
    /// Screen shake intensity (0.0 to 1.0)
    pub screen_shake_intensity: f32,
    
    /// Whether flashing effects are enabled
    pub flashing_effects: bool,
    
    /// Whether subtitles/lyrics are shown
    pub subtitles_enabled: bool,
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            colorblind_mode: ColorblindMode::default(),
            screen_shake_intensity: 1.0,
            flashing_effects: true,
            subtitles_enabled: false,
        }
    }
}

/// # Responsibility
/// Aggregates all game settings into a single structure.
///
/// ---
///
/// This is the root settings object that is persisted and loaded.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub audio: AudioSettings,
    pub gameplay: GameplaySettings,
    pub visual: VisualSettings,
    pub input: InputSettings,
    pub accessibility: AccessibilitySettings,
}

impl Default for GameSettings {
    fn default() -> Self {
        Self {
            audio: AudioSettings::default(),
            gameplay: GameplaySettings::default(),
            visual: VisualSettings::default(),
            input: InputSettings::default(),
            accessibility: AccessibilitySettings::default(),
        }
    }
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
    fn test_settings_serialization_roundtrip() {
        let settings = GameSettings::default();
        let json = serde_json::to_string(&settings).expect("Failed to serialize");
        let deserialized: GameSettings = serde_json::from_str(&json).expect("Failed to deserialize");
        assert_eq!(settings, deserialized);
    }

    #[test]
    fn test_colorblind_mode_values() {
        let mode = ColorblindMode::Protanopia;
        let json = serde_json::to_string(&mode).expect("Failed to serialize");
        assert!(json.contains("protanopia"));
    }
}

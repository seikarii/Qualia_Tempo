//! # Responsibility
//! Defines game settings and accessibility options contracts per DATA.RUST.md.
//!
//! ---
//!
//! Contains complete GameSettings hierarchy including Audio, Gameplay,
//! Visual, Input, and Accessibility configuration structures.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Audio Settings (Section 3.1 of DATA.RUST.md)
// ============================================================================

/// # Responsibility
/// Defines all audio-related configuration options.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub master_volume: f32, // 0.0 to 1.0
    pub music_volume: f32,
    pub sfx_volume: f32,
    /// Audio offset in milliseconds for latency compensation
    pub audio_offset_ms: i32,
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            master_volume: 0.8,
            music_volume: 0.7,
            sfx_volume: 0.9,
            audio_offset_ms: 0,
        }
    }
}

/// # Responsibility
/// Defines timing windows for rhythm accuracy judgments.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimingWindowSettings {
    /// Perfect hit window in milliseconds
    pub perfect: u32,
    /// Good hit window in milliseconds
    pub good: u32,
    /// OK hit window in milliseconds
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
/// Defines gameplay-specific configuration options.
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
/// Enumerates particle density quality levels.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ParticleDensity {
    Low,
    Medium,
    High,
    Ultra,
}

/// # Responsibility
/// Defines visual/graphics configuration options.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisualSettings {
    pub brightness: f32, // 0.0 to 1.0
    pub particle_density: ParticleDensity,
    pub post_processing_enabled: bool,
    pub bloom_intensity: f32, // 0.0 to 1.0
    pub show_hit_effects: bool,
    pub show_combo_text: bool,
    pub background_animations: bool,
}

impl Default for VisualSettings {
    fn default() -> Self {
        Self {
            brightness: 0.8,
            particle_density: ParticleDensity::High,
            post_processing_enabled: true,
            bloom_intensity: 0.5,
            show_hit_effects: true,
            show_combo_text: true,
            background_animations: true,
        }
    }
}

/// # Responsibility
/// Defines input configuration and key bindings.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InputSettings {
    /// Maps action names to key codes (e.g., "dash" -> ["Space", "LeftClick"])
    pub key_bindings: HashMap<String, Vec<String>>,
    pub mouse_sensitivity: f32, // 0.0 to 1.0
}

impl Default for InputSettings {
    fn default() -> Self {
        let mut key_bindings = HashMap::new();
        key_bindings.insert("dash".to_string(), vec!["Space".to_string()]);
        key_bindings.insert("note_q".to_string(), vec!["Q".to_string()]);
        key_bindings.insert("note_e".to_string(), vec!["E".to_string()]);
        key_bindings.insert("note_r".to_string(), vec!["R".to_string()]);

        Self {
            key_bindings,
            mouse_sensitivity: 0.5,
        }
    }
}

/// # Responsibility
/// Enumerates colorblind assistance modes per DATA.RUST.md specification.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ColorblindMode {
    None,
    Protanopia,
    Deuteranopia,
    Tritanopia,
}

/// # Responsibility
/// Defines accessibility configuration options.
///
/// ---
///
/// Ensures game is playable for diverse audiences per GDD requirements.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    pub colorblind_mode: ColorblindMode,
    pub screen_shake_intensity: f32, // 0.0 to 1.0
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
/// Aggregates all game configuration settings.
///
/// ---
///
/// This is the complete settings structure persisted to local storage
/// and synchronized between game sessions per DATA.RUST.md Section 3.1.
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

// ============================================================================
// Legacy Compatibility Types (Deprecated)
// ============================================================================

/// # Responsibility
/// DEPRECATED: Legacy subtitle size enum.
///
/// ---
///
/// Use AccessibilitySettings::subtitles_enabled instead.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[deprecated(note = "Use AccessibilitySettings::subtitles_enabled instead")]
pub enum SubtitleSize {
    Small,
    Medium,
    Large,
    ExtraLarge,
}

/// # Responsibility
/// DEPRECATED: Legacy graphics quality enum.
///
/// ---
///
/// Use VisualSettings individual fields instead for fine-grained control.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[deprecated(note = "Use VisualSettings individual fields instead")]
pub enum GraphicsQuality {
    Low,
    Medium,
    High,
    Ultra,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // Audio Settings Tests
    // ========================================================================

    #[test]
    fn test_audio_settings_default() {
        let settings = AudioSettings::default();
        assert_eq!(settings.master_volume, 0.8);
        assert_eq!(settings.audio_offset_ms, 0);
    }

    #[test]
    fn test_audio_settings_serialization() {
        let settings = AudioSettings {
            master_volume: 0.9,
            music_volume: 0.8,
            sfx_volume: 0.7,
            audio_offset_ms: -50,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: AudioSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }

    // ========================================================================
    // Gameplay Settings Tests
    // ========================================================================

    #[test]
    fn test_timing_window_settings_default() {
        let timing = TimingWindowSettings::default();
        assert_eq!(timing.perfect, 50);
        assert_eq!(timing.good, 100);
        assert_eq!(timing.ok, 150);
    }

    #[test]
    fn test_gameplay_settings_serialization() {
        let settings = GameplaySettings {
            timing_window_ms: TimingWindowSettings {
                perfect: 40,
                good: 80,
                ok: 120,
            },
            autoplay: false,
            practice_mode: true,
            show_timing: true,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: GameplaySettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }

    // ========================================================================
    // Visual Settings Tests
    // ========================================================================

    #[test]
    fn test_particle_density_enum() {
        let densities = vec![
            ParticleDensity::Low,
            ParticleDensity::Medium,
            ParticleDensity::High,
            ParticleDensity::Ultra,
        ];

        for density in densities {
            let json = serde_json::to_string(&density).unwrap();
            let deserialized: ParticleDensity = serde_json::from_str(&json).unwrap();
            assert_eq!(density, deserialized);
        }
    }

    #[test]
    fn test_visual_settings_default() {
        let settings = VisualSettings::default();
        assert_eq!(settings.particle_density, ParticleDensity::High);
        assert!(settings.post_processing_enabled);
    }

    #[test]
    fn test_visual_settings_serialization() {
        let settings = VisualSettings {
            brightness: 0.9,
            particle_density: ParticleDensity::Ultra,
            post_processing_enabled: true,
            bloom_intensity: 0.7,
            show_hit_effects: true,
            show_combo_text: false,
            background_animations: true,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: VisualSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }

    // ========================================================================
    // Input Settings Tests
    // ========================================================================

    #[test]
    fn test_input_settings_default() {
        let settings = InputSettings::default();
        assert!(settings.key_bindings.contains_key("dash"));
        assert_eq!(settings.mouse_sensitivity, 0.5);
    }

    #[test]
    fn test_input_settings_serialization() {
        let mut key_bindings = HashMap::new();
        key_bindings.insert("test_action".to_string(), vec!["T".to_string()]);

        let settings = InputSettings {
            key_bindings,
            mouse_sensitivity: 0.8,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: InputSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }

    // ========================================================================
    // Accessibility Settings Tests
    // ========================================================================

    #[test]
    fn test_colorblind_mode_enum() {
        let modes = vec![
            ColorblindMode::None,
            ColorblindMode::Protanopia,
            ColorblindMode::Deuteranopia,
            ColorblindMode::Tritanopia,
        ];

        for mode in modes {
            let json = serde_json::to_string(&mode).unwrap();
            let deserialized: ColorblindMode = serde_json::from_str(&json).unwrap();
            assert_eq!(mode, deserialized);
        }
    }

    #[test]
    fn test_accessibility_settings_default() {
        let settings = AccessibilitySettings::default();
        assert_eq!(settings.colorblind_mode, ColorblindMode::None);
        assert_eq!(settings.screen_shake_intensity, 1.0);
    }

    #[test]
    fn test_accessibility_settings_serialization() {
        let settings = AccessibilitySettings {
            colorblind_mode: ColorblindMode::Protanopia,
            screen_shake_intensity: 0.5,
            flashing_effects: false,
            subtitles_enabled: true,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: AccessibilitySettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }

    // ========================================================================
    // Complete Game Settings Tests
    // ========================================================================

    #[test]
    fn test_game_settings_default() {
        let settings = GameSettings::default();
        assert_eq!(settings.audio.master_volume, 0.8);
        assert!(settings.gameplay.show_timing);
    }

    #[test]
    fn test_game_settings_serialization() {
        let settings = GameSettings::default();
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: GameSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, deserialized);
    }
}

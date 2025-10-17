//! # Responsibility
//! Integration tests for GameSettings contract serialization.
//!
//! ---
//!
//! Validates JSON serialization/deserialization of game configuration
//! settings for persistence and transmission to frontend.

use shared_core::contracts::{GameSettings, ParticleDensity};

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
    let json = serde_json::to_string(&settings)
        .expect("Failed to serialize");
    assert!(json.contains("masterVolume"));
    
    let deserialized: GameSettings = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, settings);
}

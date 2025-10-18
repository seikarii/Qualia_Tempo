//! # Responsibility
//! Defines scene and cinematic data structures for gameplay flow.
//!
//! ---
//!
//! This module contains structs for managing game scenes (Menu, Gameplay, Cinematics)
//! and their transitions. Critical for the scene management system defined in
//! ARCHITECTURE.RUST v2.0 §6.1.5.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Enumerates possible scene types in the game.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SceneType {
    /// Main menu scene
    MainMenu,
    /// Song selection scene
    SongSelect,
    /// Pre-combat cinematic
    PreBattleCinematic,
    /// Active gameplay/combat scene
    Combat,
    /// Post-combat cinematic
    PostBattleCinematic,
    /// Victory screen
    Victory,
    /// Game over screen
    GameOver,
    /// Settings/options menu
    Settings,
    /// Leaderboard display
    Leaderboard,
    /// Credits roll
    Credits,
}

/// # Responsibility
/// Defines transition effects between scenes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SceneTransition {
    /// Instant cut (no transition)
    Instant,
    /// Fade to black
    FadeToBlack,
    /// Crossfade between scenes
    Crossfade,
    /// Wipe transition
    Wipe,
    /// Custom shader-based transition
    Custom,
}

/// # Responsibility
/// Contains metadata for a game scene.
///
/// ---
///
/// Loaded from scene configuration files. Defines what assets to preload,
/// what services to initialize, and how to transition in/out.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SceneData {
    /// Unique scene identifier
    pub id: String,
    /// Scene type
    pub scene_type: SceneType,
    /// Display name for debugging
    pub name: String,
    /// Assets to preload before entering this scene
    pub required_assets: Vec<String>,
    /// Transition effect when entering this scene
    pub transition_in: SceneTransition,
    /// Transition duration in milliseconds
    pub transition_duration_ms: u32,
    /// Whether this scene blocks input during transition
    pub blocks_input_during_transition: bool,
    /// Background music track ID (if any)
    pub background_music: Option<String>,
    /// Whether to pause background music when this scene is active
    pub pause_music: bool,
}

/// # Responsibility
/// Defines a cinematic sequence with timing and dialogue.
///
/// ---
///
/// Used for pre-battle and post-battle cinematics. Can include dialogue,
/// camera movements, and scripted events.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CinematicData {
    /// Unique cinematic identifier
    pub id: String,
    /// Cinematic title/name
    pub title: String,
    /// Total duration in seconds
    pub duration_sec: f64,
    /// Can the cinematic be skipped by the player?
    pub skippable: bool,
    /// Dialogue lines with timestamps
    pub dialogue_lines: Vec<DialogueLine>,
    /// Camera keyframes for cinematic camera movement
    pub camera_keyframes: Vec<CameraKeyframe>,
    /// Background music track ID
    pub music_track: String,
    /// Scene to transition to after cinematic ends
    pub next_scene_id: String,
}

/// # Responsibility
/// Represents a single line of dialogue in a cinematic.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DialogueLine {
    /// Speaker name (e.g., "Charlie", "Boss")
    pub speaker: String,
    /// Dialogue text
    pub text: String,
    /// Start time in seconds
    pub start_time_sec: f64,
    /// Duration to display (seconds)
    pub duration_sec: f64,
    /// Voice audio file path (optional)
    pub voice_audio: Option<String>,
}

/// # Responsibility
/// Defines a camera position/orientation at a specific time.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CameraKeyframe {
    /// Time in seconds
    pub time_sec: f64,
    /// Camera position (x, y, z)
    pub position: [f32; 3],
    /// Camera look-at target (x, y, z)
    pub look_at: [f32; 3],
    /// Field of view in degrees
    pub fov: f32,
    /// Interpolation type to next keyframe
    pub interpolation: CameraInterpolation,
}

/// # Responsibility
/// Defines interpolation methods between camera keyframes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CameraInterpolation {
    /// Linear interpolation
    Linear,
    /// Smooth ease-in-out
    EaseInOut,
    /// Bezier curve
    Bezier,
    /// Instant cut (no interpolation)
    Instant,
}

impl Default for SceneData {
    fn default() -> Self {
        Self {
            id: "default_scene".to_string(),
            scene_type: SceneType::MainMenu,
            name: "Default Scene".to_string(),
            required_assets: Vec::new(),
            transition_in: SceneTransition::FadeToBlack,
            transition_duration_ms: 500,
            blocks_input_during_transition: true,
            background_music: None,
            pause_music: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scene_data_serialization() {
        let scene = SceneData {
            id: "main_menu".to_string(),
            scene_type: SceneType::MainMenu,
            name: "Main Menu".to_string(),
            required_assets: vec!["logo.png".to_string(), "menu_bg.jpg".to_string()],
            transition_in: SceneTransition::FadeToBlack,
            transition_duration_ms: 1000,
            blocks_input_during_transition: true,
            background_music: Some("menu_theme.ogg".to_string()),
            pause_music: false,
        };

        let json = serde_json::to_string(&scene).unwrap();
        let deserialized: SceneData = serde_json::from_str(&json).unwrap();

        assert_eq!(scene.id, deserialized.id);
        assert_eq!(scene.scene_type, deserialized.scene_type);
        assert_eq!(scene.required_assets.len(), 2);
    }

    #[test]
    fn test_cinematic_data_serialization() {
        let cinematic = CinematicData {
            id: "intro_cinematic".to_string(),
            title: "Charlie's Descent".to_string(),
            duration_sec: 45.0,
            skippable: true,
            dialogue_lines: vec![DialogueLine {
                speaker: "Charlie".to_string(),
                text: "This is my redemption.".to_string(),
                start_time_sec: 5.0,
                duration_sec: 3.0,
                voice_audio: Some("charlie_line_01.ogg".to_string()),
            }],
            camera_keyframes: vec![],
            music_track: "cinematic_intro.ogg".to_string(),
            next_scene_id: "combat".to_string(),
        };

        let json = serde_json::to_string(&cinematic).unwrap();
        let deserialized: CinematicData = serde_json::from_str(&json).unwrap();

        assert_eq!(cinematic.id, deserialized.id);
        assert_eq!(cinematic.dialogue_lines.len(), 1);
        assert!(cinematic.skippable);
    }

    #[test]
    fn test_scene_type_enum() {
        let scene_type = SceneType::Combat;
        let json = serde_json::to_string(&scene_type).unwrap();
        assert_eq!(json, r#""combat""#);
    }

    #[test]
    fn test_camera_keyframe_serialization() {
        let keyframe = CameraKeyframe {
            time_sec: 10.0,
            position: [0.0, 5.0, -10.0],
            look_at: [0.0, 0.0, 0.0],
            fov: 60.0,
            interpolation: CameraInterpolation::EaseInOut,
        };

        let json = serde_json::to_string(&keyframe).unwrap();
        let deserialized: CameraKeyframe = serde_json::from_str(&json).unwrap();

        assert_eq!(keyframe.time_sec, deserialized.time_sec);
        assert_eq!(keyframe.fov, deserialized.fov);
    }
}

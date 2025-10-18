//! # Responsibility
//! Defines scene and cinematic data contracts.
//!
//! ---
//!
//! Contains SceneData and CinematicData structures for narrative sequences.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents a narrative scene configuration.
///
/// ---
///
/// Used for story sequences between combat encounters.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SceneData {
    pub id: String,
    pub name: String,
    pub background_image_url: Option<String>,
    pub audio_url: Option<String>,
    pub cinematics: Vec<CinematicData>,
}

/// # Responsibility
/// Represents a single cinematic sequence within a scene.
///
/// ---
///
/// Contains dialogue, camera movements, and narrative triggers.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CinematicData {
    pub id: String,
    pub dialogue_text: Option<String>,
    pub speaker: Option<String>,
    pub duration_sec: f64,
    pub camera_position: Option<(f32, f32)>,
    pub trigger_event: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scene_data_serialization() {
        let scene = SceneData {
            id: "scene_1".to_string(),
            name: "Opening".to_string(),
            background_image_url: Some("/assets/bg_heaven.png".to_string()),
            audio_url: Some("/assets/ambient_heaven.ogg".to_string()),
            cinematics: vec![],
        };

        let json = serde_json::to_string(&scene).unwrap();
        let deserialized: SceneData = serde_json::from_str(&json).unwrap();

        assert_eq!(scene, deserialized);
    }

    #[test]
    fn test_cinematic_data_serialization() {
        let cinematic = CinematicData {
            id: "cinematic_1".to_string(),
            dialogue_text: Some("The descent begins...".to_string()),
            speaker: Some("Charlie".to_string()),
            duration_sec: 5.0,
            camera_position: Some((0.0, 100.0)),
            trigger_event: Some("fade_to_combat".to_string()),
        };

        let json = serde_json::to_string(&cinematic).unwrap();
        let deserialized: CinematicData = serde_json::from_str(&json).unwrap();

        assert_eq!(cinematic, deserialized);
    }
}

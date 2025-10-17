//! # Responsibility
//! Integration tests for combat data contract serialization.
//!
//! ---
//!
//! Validates JSON serialization/deserialization of SongData and
//! MusicalComboData structs for combat orchestration.

use shared_core::contracts::{
    ComboActionType, ComboStep, ComboTiming, MusicalComboData, QualiaState,
    SongData, SongDifficulty, TimeSignature,
};

#[test]
fn test_song_data_serialization() {
    let song = SongData {
        id: "test_song".to_string(),
        title: "Test Song".to_string(),
        artist: "Test Artist".to_string(),
        bpm: 120.0,
        duration_sec: 180.0,
        audio_file_path: "test.ogg".to_string(),
        time_signature: TimeSignature::default(),
        key: Some("C minor".to_string()),
        sections: vec![],
        beat_map: vec![],
        difficulty: SongDifficulty::Medium,
        preview_start_sec: Some(30.0),
    };

    let json = serde_json::to_string(&song).expect("Failed to serialize");
    assert!(json.contains("test_song"));
    assert!(json.contains("120"));

    let deserialized: SongData = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, song);
}

#[test]
fn test_musical_combo_data_serialization() {
    let combo = MusicalComboData {
        id: "test_combo".to_string(),
        name: "Test Combo".to_string(),
        sequence: vec![
            ComboStep {
                action: ComboActionType::Hit,
                timing: ComboTiming::Exact,
                max_delay_ms: Some(100),
            },
        ],
        bonus_multiplier: 1.5,
        qualia_modifiers: QualiaState::default(),
        visual_effect_id: None,
        audio_effect_id: None,
        difficulty: SongDifficulty::Hard,
    };

    let json = serde_json::to_string(&combo).expect("Failed to serialize");
    assert!(json.contains("test_combo"));
    assert!(json.contains("1.5"));

    let deserialized: MusicalComboData = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, combo);
}

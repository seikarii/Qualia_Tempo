//! # Responsibility
//! Integration tests validating JSON serialization for all contract types.
//!
//! ---
//!
//! Tests ensure round-trip serialization stability for frontend/backend communication.
//! All contracts must survive serialize → deserialize cycle without data loss.

use shared_core::contracts::*;
use shared_core::events::*;

#[test]
fn test_qualia_state_roundtrip() {
    let original = QualiaState {
        intensity: 0.75,
        precision: 0.42,
        aggression: 0.88,
        flow: 0.33,
        chaos: 0.25,
        recovery: 0.10,
        transcendence: 0.90,
        collection_window_end: 1_234_567_890.5,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: QualiaState = serde_json::from_str(&json).expect("Deserialization failed");
    
    assert_eq!(original.intensity, deserialized.intensity);
    assert_eq!(original.precision, deserialized.precision);
    assert_eq!(original.aggression, deserialized.aggression);
    assert_eq!(original.flow, deserialized.flow);
    assert_eq!(original.chaos, deserialized.chaos);
    assert_eq!(original.recovery, deserialized.recovery);
    assert_eq!(original.transcendence, deserialized.transcendence);
    assert_eq!(original.collection_window_end, deserialized.collection_window_end);
}

#[test]
fn test_player_action_roundtrip() {
    let original = PlayerAction::KeyPressed {
        key: 'Z',
        timestamp: 123_456_789.0,
        accuracy: 0.95,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: PlayerAction = serde_json::from_str(&json).expect("Deserialization failed");
    
    assert_eq!(original, deserialized);
}

#[test]
fn test_scene_data_roundtrip() {
    let original = SceneData {
        id: "scene_01".to_string(),
        scene_type: SceneType::Combat,
        name: "Boss Battle".to_string(),
        required_assets: vec!["boss_model.gltf".to_string(), "arena.gltf".to_string()],
        transition_in: SceneTransition::FadeToBlack,
        transition_duration_ms: 1000,
        blocks_input_during_transition: true,
        background_music: Some("boss_theme".to_string()),
        pause_music: false,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: SceneData = serde_json::from_str(&json).expect("Deserialization failed");
    
    assert_eq!(original, deserialized);
}

#[test]
fn test_play_generative_note_roundtrip() {
    let original = audio::PlayGenerativeNote {
        note: 60,
        velocity: 0.8,
        duration: 0.25,
        patch_id: "synth_lead".to_string(),
        spatial_position: Some((1.0, 0.5, -2.0)),
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: audio::PlayGenerativeNote = serde_json::from_str(&json).expect("Deserialization failed");
    
    assert_eq!(original.note, deserialized.note);
    assert_eq!(original.velocity, deserialized.velocity);
    assert_eq!(original.duration, deserialized.duration);
    assert_eq!(original.patch_id, deserialized.patch_id);
    assert_eq!(original.spatial_position, deserialized.spatial_position);
}

#[test]
fn test_game_event_enum_roundtrip() {
    let original = GameEvent::BossPhaseTransition {
        boss_id: "chaos_boss".to_string(),
        old_phase: 1,
        new_phase: 2,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: GameEvent = serde_json::from_str(&json).expect("Deserialization failed");
    
    match (original, deserialized) {
        (
            GameEvent::BossPhaseTransition { boss_id: b1, old_phase: o1, new_phase: n1 },
            GameEvent::BossPhaseTransition { boss_id: b2, old_phase: o2, new_phase: n2 },
        ) => {
            assert_eq!(b1, b2);
            assert_eq!(o1, o2);
            assert_eq!(n1, n2);
        }
        _ => panic!("Deserialized variant mismatch"),
    }
}

#[test]
fn test_audio_event_roundtrip() {
    let original = AudioEvent::UpdateBackgroundMusic {
        intensity_multiplier: 1.5,
        filter_cutoff: 800.0,
        distortion: 0.3,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: AudioEvent = serde_json::from_str(&json).expect("Deserialization failed");
    
    match (original, deserialized) {
        (
            AudioEvent::UpdateBackgroundMusic { intensity_multiplier: i1, filter_cutoff: f1, distortion: d1 },
            AudioEvent::UpdateBackgroundMusic { intensity_multiplier: i2, filter_cutoff: f2, distortion: d2 },
        ) => {
            assert_eq!(i1, i2);
            assert_eq!(f1, f2);
            assert_eq!(d1, d2);
        }
        _ => panic!("Deserialized variant mismatch"),
    }
}

#[test]
fn test_combat_event_roundtrip() {
    let original = CombatEvent::ComboTriggered {
        combo_id: "Q+E+R".to_string(),
        is_beneficial: true,
        effect_description: "Perfect Harmony - Damage bonus".to_string(),
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: CombatEvent = serde_json::from_str(&json).expect("Deserialization failed");
    
    match (original, deserialized) {
        (
            CombatEvent::ComboTriggered { combo_id: c1, is_beneficial: b1, effect_description: e1 },
            CombatEvent::ComboTriggered { combo_id: c2, is_beneficial: b2, effect_description: e2 },
        ) => {
            assert_eq!(c1, c2);
            assert_eq!(b1, b2);
            assert_eq!(e1, e2);
        }
        _ => panic!("Deserialized variant mismatch"),
    }
}

#[test]
fn test_system_event_roundtrip() {
    let original = SystemEvent::PerformanceUpdate {
        fps: 60,
        frame_time_ms: 16.67,
        memory_mb: 512.0,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: SystemEvent = serde_json::from_str(&json).expect("Deserialization failed");
    
    match (original, deserialized) {
        (
            SystemEvent::PerformanceUpdate { fps: f1, frame_time_ms: t1, memory_mb: m1 },
            SystemEvent::PerformanceUpdate { fps: f2, frame_time_ms: t2, memory_mb: m2 },
        ) => {
            assert_eq!(f1, f2);
            assert_eq!(t1, t2);
            assert_eq!(m1, m2);
        }
        _ => panic!("Deserialized variant mismatch"),
    }
}

#[test]
fn test_game_settings_roundtrip() {
    let original = GameSettings {
        difficulty: DifficultyLevel::Normal,
        master_volume: 0.8,
        sfx_volume: 0.9,
        music_volume: 0.7,
        audio_quality: AudioQuality::High,
        graphics_quality: GraphicsQuality::Ultra,
        vsync_enabled: true,
        target_fps: 60,
        particle_density: 1.0,
        bloom_enabled: true,
        motion_blur_enabled: false,
        taa_enabled: true,
        mouse_sensitivity: 1.2,
        invert_y_axis: false,
        gamepad_enabled: true,
        gamepad_vibration: 0.5,
        accessibility: AccessibilitySettings {
            colorblind_mode: false,
            colorblind_type: None,
            high_contrast: false,
            screen_reader: false,
            reduced_motion: true,
            photosensitivity_mode: false,
            text_size_multiplier: 1.0,
            subtitles_enabled: true,
            subtitle_background_opacity: 0.7,
        },
        telemetry_enabled: false,
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: GameSettings = serde_json::from_str(&json).expect("Deserialization failed");
    
    assert_eq!(original, deserialized);
}

#[test]
fn test_leaderboard_entry_roundtrip() {
    let original = LeaderboardEntry {
        id: "entry_12345".to_string(),
        player_name: "ChromaticBlade".to_string(),
        player_id: Some("user_001".to_string()),
        score: 999_999,
        song_id: "chaos_symphony".to_string(),
        difficulty: "Hard".to_string(),
        timestamp: 1_704_067_200,
        max_combo: 150,
        accuracy: 98.5,
        final_qualia: r#"{"intensity":0.95,"precision":1.0,"aggression":0.8,"flow":0.9,"chaos":0.1,"recovery":0.2,"transcendence":1.0,"collection_window_end":1704067200.0}"#.to_string(),
        duration_sec: 180.0,
        deaths: 0,
        is_perfect: true,
        replay_path: Some("/replays/entry_12345.replay".to_string()),
    };
    
    let json = serde_json::to_string(&original).expect("Serialization failed");
    let deserialized: LeaderboardEntry = serde_json::from_str(&json).expect("Deserialization failed");
    
    assert_eq!(original, deserialized);
}

//! # Responsibility
//! Integration tests for visual effects contracts serialization.
//!
//! ---
//!
//! Validates JSON serialization/deserialization of ActiveEffect and
//! EnvironmentEffect structs for real-time synchronization with frontend.

use shared_core::contracts::{
    ActiveEffect, ActiveEffectType, AffectedArea, AffectedAreaShape,
    EnvironmentEffect, EnvironmentEffectType, Vec2, Vec3,
};

#[test]
fn test_active_effect_serialization() {
    let effect = ActiveEffect {
        id: "test_effect".to_string(),
        effect_type: ActiveEffectType::BloomPulse,
        start_time: 0.0,
        duration_sec: 2.0,
        position: Vec3::new(1.0, 2.0, 3.0),
        intensity: 0.8,
        color: [1.0, 0.5, 0.0, 1.0],
        scale: 1.5,
        fade_in_sec: Some(0.5),
        fade_out_sec: Some(0.5),
        attached_to_entity: None,
        custom_parameters: None,
    };

    let json = serde_json::to_string(&effect).expect("Failed to serialize");
    assert!(json.contains("test_effect"));
    assert!(json.contains("bloom_pulse"));

    let deserialized: ActiveEffect = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, effect);
}

#[test]
fn test_environment_effect_serialization() {
    let effect = EnvironmentEffect {
        id: "test_env_effect".to_string(),
        effect_type: EnvironmentEffectType::TimeDilation,
        start_time: 0.0,
        duration_sec: 5.0,
        affected_area: AffectedArea {
            shape: AffectedAreaShape::Circle,
            center: Some(Vec2::new(0.0, 0.0)),
            radius: Some(10.0),
            width: None,
            height: None,
        },
        intensity: 0.7,
        gameplay_modifiers: None,
        visual_parameters: None,
        triggered_by_qualia_state: None,
    };

    let json = serde_json::to_string(&effect).expect("Failed to serialize");
    assert!(json.contains("test_env_effect"));
    assert!(json.contains("time_dilation"));

    let deserialized: EnvironmentEffect = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, effect);
}

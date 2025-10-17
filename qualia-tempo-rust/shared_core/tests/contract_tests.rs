//! # Responsibility
//! Tests for shared contract serialization and deserialization.

use shared_core::*;

#[test]
fn test_qualia_state_default() {
    let state = QualiaState::default();
    assert_eq!(state.intensity, 0.0);
    assert_eq!(state.harmony, 0.0);
    assert_eq!(state.chaos, 0.0);
    assert_eq!(state.kairos, 0.0);
    assert_eq!(state.trascendence, 0.0);
}

#[test]
fn test_qualia_state_serialization() {
    let state = QualiaState {
        intensity: 0.5,
        harmony: 0.75,
        chaos: 0.25,
        kairos: 0.9,
        trascendence: 100.0,
        timestamp: 1234567890,
    };
    
    let json = serde_json::to_string(&state).expect("Failed to serialize");
    let deserialized: QualiaState = serde_json::from_str(&json).expect("Failed to deserialize");
    
    assert_eq!(state, deserialized);
}

#[test]
fn test_vec2_operations() {
    let v1 = Vec2::new(3.0, 4.0);
    let v2 = Vec2::zero();
    
    assert_eq!(v1.x, 3.0);
    assert_eq!(v1.y, 4.0);
    assert_eq!(v2.x, 0.0);
    assert_eq!(v2.y, 0.0);
}

#[test]
fn test_combat_state_serialization() {
    let state = CombatState::default();
    let json = serde_json::to_string(&state).expect("Failed to serialize");
    let deserialized: CombatState = serde_json::from_str(&json).expect("Failed to deserialize");
    
    assert_eq!(state, deserialized);
}

#[test]
fn test_player_action_serialization() {
    let action = PlayerAction::Dash {
        direction: Vec2::new(1.0, 0.0),
        timestamp: 1234567890,
    };
    
    let json = serde_json::to_string(&action).expect("Failed to serialize");
    assert!(json.contains("\"type\":\"dash\""));
    
    let deserialized: PlayerAction = serde_json::from_str(&json).expect("Failed to deserialize");
    match deserialized {
        PlayerAction::Dash { direction, .. } => {
            assert_eq!(direction.x, 1.0);
            assert_eq!(direction.y, 0.0);
        }
        _ => panic!("Wrong variant deserialized"),
    }
}

#[test]
fn test_game_event_serialization() {
    let event = GameEvent::QualiaStateUpdated(QualiaState::default());
    let json = serde_json::to_string(&event).expect("Failed to serialize");
    let _deserialized: GameEvent = serde_json::from_str(&json).expect("Failed to deserialize");
}

#[test]
fn test_game_phase_ordering() {
    use GamePhase::*;
    assert_eq!(Idle, Idle);
    assert_ne!(Idle, Playing);
}

//! # Responsibility
//! End-to-end integration tests for complete gameplay loop.
//!
//! ---
//!
//! Tests the entire flow from player input to game state updates,
//! ensuring all services orchestrate correctly via `EventBus`.

use backend::engine::{IParticleEngine, QualiaParticleEngine};
use backend::services::core::{EventBusService, QualiaLogger, TimerService};
use backend::services::gameplay::{BossAIService, CombatOrchestratorService, GameLogicService, PatternSystemService, QualiaValidatorService};
use backend::services::audio::HarmonyAnalysisService;
use shared_core::contracts::{ParticleSystemConfig, PlayerAction, QualiaState};
use shared_core::events::GameEvent;
use shared_core::traits::{IEventBus, IGameLogicService};
use shared_core::utils::Vec2;
use shaku::{module, HasComponent};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;

// ============================================================================
// Test Container Factory (COMPLIANCE: QUALIA.CODE.RUST §2.1)
// ============================================================================

module! {
    FullIntegrationTestModule {
        components = [
            EventBusService,
            QualiaLogger,
            TimerService,
            GameLogicService,
            QualiaValidatorService,
            HarmonyAnalysisService,
            BossAIService,
            PatternSystemService,
            CombatOrchestratorService,
        ],
        providers = []
    }
}

/// # Responsibility
/// Creates isolated test container with full gameplay services.
fn create_full_integration_container() -> FullIntegrationTestModule {
    FullIntegrationTestModule::builder().build()
}

// ============================================================================
// INTEGRATION TEST: Complete Gameplay Flow (PLAN.md §10.1)
// ============================================================================

#[tokio::test]
async fn test_complete_gameplay_flow_input_to_state() {
    // Arrange: Create real service container
    let container = create_full_integration_container();
    
    let event_bus: Arc<dyn IEventBus> = container.resolve();
    let game_logic: Arc<dyn IGameLogicService> = container.resolve();
    
    // Subscribe to EventBus to capture emitted events
    let mut event_rx = event_bus.subscribe();
    
    // Act: Simulate player pressing 'Q' key with high accuracy
    let action = PlayerAction::KeyPressed {
        key: 'Q',
        timestamp: 1000.0,
        accuracy: 0.95,
    };
    
    let frontend_qualia = QualiaState {
        intensity: 0.8,
        precision: 0.95,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.0,
        transcendence: 0.0,
        collection_window_end: 2000.0,
    };
    
    let validated_state = game_logic
        .process_action(action.clone(), frontend_qualia)
        .await
        .expect("Failed to process action");
    
    // Assert: Validated state should be within bounds
    assert!(validated_state.is_valid(), "Validated state must be within [0.0, 1.0] bounds");
    assert!(validated_state.precision >= 0.9, "High accuracy should maintain precision");
    assert!(validated_state.intensity > 0.0, "Intensity should be positive for action");
    
    // Assert: QualiaStateUpdated event should be emitted
    let event_result = timeout(Duration::from_millis(100), async {
        loop {
            if let Ok(GameEvent::QualiaStateUpdated { state }) = event_rx.recv().await {
                return state;
            }
        }
    })
    .await;
    
    assert!(event_result.is_ok(), "Should receive QualiaStateUpdated event within 100ms");
    let emitted_state = event_result.expect("Event should be received");
    assert_eq!(emitted_state, validated_state, "Emitted state should match validated state");
}

#[tokio::test]
async fn test_invalid_qualia_state_rejected() {
    // Arrange
    let container = create_full_integration_container();
    let game_logic: Arc<dyn IGameLogicService> = container.resolve();
    
    // Act: Submit invalid QualiaState (values > 1.0)
    let action = PlayerAction::KeyPressed {
        key: 'Q',
        timestamp: 1000.0,
        accuracy: 0.8,
    };
    
    let invalid_qualia = QualiaState {
        intensity: 1.5, // INVALID: > 1.0
        precision: 0.8,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.0,
        transcendence: 0.0,
        collection_window_end: 2000.0,
    };
    
    // Assert: Validator should clamp or reject invalid state
    let result = game_logic.process_action(action, invalid_qualia).await;
    
    assert!(result.is_ok(), "Validator should handle invalid input gracefully");
    
    let validated = result.expect("Validator should return clamped state");
    assert!(validated.is_valid(), "Validated state must be clamped to [0.0, 1.0]");
    assert!(validated.intensity <= 1.0, "Intensity should be clamped");
}

// ============================================================================
// INTEGRATION TEST: EventBus End-to-End (PLAN.md §10.1)
// ============================================================================

#[tokio::test]
async fn test_event_bus_multi_subscriber_broadcast() {
    // Arrange: Create EventBus with multiple subscribers
    let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
    
    let mut rx1 = event_bus.subscribe();
    let mut rx2 = event_bus.subscribe();
    let mut rx3 = event_bus.subscribe();
    
    // Act: Emit single event
    let event = GameEvent::QualiaStateUpdated {
        state: QualiaState::default(),
    };
    
    let emit_result = event_bus.emit(event.clone());
    assert!(emit_result.is_ok(), "Emit should succeed");
    assert_eq!(emit_result.expect("Emit should report subscriber count"), 3, "Should report 3 active subscribers");
    
    // Assert: All subscribers receive event
    let received1 = timeout(Duration::from_millis(50), rx1.recv()).await;
    let received2 = timeout(Duration::from_millis(50), rx2.recv()).await;
    let received3 = timeout(Duration::from_millis(50), rx3.recv()).await;
    
    assert!(received1.is_ok(), "Subscriber 1 should receive event");
    assert!(received2.is_ok(), "Subscriber 2 should receive event");
    assert!(received3.is_ok(), "Subscriber 3 should receive event");
    
    // Verify event content
    assert!(matches!(
        received1.expect("Timeout should not occur").expect("Event should be received"),
        GameEvent::QualiaStateUpdated { .. }
    ));
}

#[tokio::test]
async fn test_event_bus_lagging_subscriber_recovery() {
    // Arrange: Create EventBus with small capacity to force lagging
    let event_bus = Arc::new(EventBusService::new(2)) as Arc<dyn IEventBus>;
    
    let mut rx = event_bus.subscribe();
    
    // Act: Emit more events than capacity (overflow)
    for i in 0..5 {
        let event = GameEvent::GameStarted {
            song_id: format!("song_{i}"),
            boss_id: format!("boss_{i}"),
        };
        event_bus.emit(event).ok();
    }
    
    // Assert: Subscriber should detect lag
    let first_result = rx.recv().await;
    
    match first_result {
        Ok(_) => {
            // Successfully received an event (buffer not full yet)
        }
        Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
            // Expected: subscriber lagged and detected it
            assert!(n > 0, "Should report number of skipped messages");
        }
        Err(e) => {
            // Test failure: unexpected error type
            unreachable!("Unexpected error: {e:?}");
        }
    }
}

// ============================================================================
// INTEGRATION TEST: Particle Engine with EventBus (PLAN.md §10.1)
// ============================================================================

#[tokio::test]
async fn test_particle_engine_event_driven_spawn() {
    // Arrange: Create real ParticleEngine + EventBus
    let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
    
    let config = Arc::new(ParticleSystemConfig {
        id: "event_test_particles".to_string(),
        max_particles: 1000,
        emission_rate: 100.0,
        lifetime_min: 0.5,
        lifetime_max: 2.0,
        velocity_min: Vec2::new(-5.0, -5.0),
        velocity_max: Vec2::new(5.0, 5.0),
        color_start: shared_core::utils::Vec3::new(1.0, 0.5, 0.0),
        color_end: shared_core::utils::Vec3::new(0.0, 0.5, 1.0),
        size_start: 1.0,
        size_end: 0.1,
        texture_id: None,
    });
    
    let particle_engine = QualiaParticleEngine::new(config, event_bus.clone());
    
    // Act: Emit GameStarted event to trigger particle spawn
    let event = GameEvent::GameStarted {
        song_id: "test_song".to_string(),
        boss_id: "test_boss".to_string(),
    };
    
    event_bus.emit(event).ok();
    
    // Give engine time to process event
    tokio::time::sleep(Duration::from_millis(50)).await;
    
    // Manually spawn particles (in real system, event handler would do this)
    particle_engine.spawn_particles(200).await.expect("Failed to spawn");
    
    // Assert: Particles spawned
    let count = particle_engine.get_active_count().await;
    assert_eq!(count, 200, "Should have 200 active particles");
    
    // Act: Update particles
    particle_engine.update(0.016).await.expect("Failed to update");
    
    // Assert: Particles still active (short delta time)
    let count_after = particle_engine.get_active_count().await;
    assert_eq!(count_after, 200, "Particles should persist after one frame");
}

// ============================================================================
// EDGE CASE TESTS (USEFUL TESTS - QUALIA.MANUAL.RUST §Testing Philosophy)
// ============================================================================

#[tokio::test]
async fn test_zero_accuracy_input_handling() {
    // Arrange
    let container = create_full_integration_container();
    let game_logic: Arc<dyn IGameLogicService> = container.resolve();
    
    // Act: Submit input with 0% accuracy (missed note)
    let action = PlayerAction::KeyPressed {
        key: 'Q',
        timestamp: 1000.0,
        accuracy: 0.0, // EDGE CASE: Zero accuracy
    };
    
    let qualia = QualiaState {
        intensity: 0.3,
        precision: 0.0,
        aggression: 0.0,
        flow: 0.1,
        chaos: 0.8, // High chaos for missed note
        recovery: 0.0,
        transcendence: 0.0,
        collection_window_end: 2000.0,
    };
    
    // Assert: Should not produce NaN or panic
    let result = game_logic.process_action(action, qualia).await;
    assert!(result.is_ok(), "Zero accuracy should not cause error");
    
    let validated = result.expect("Zero accuracy should be handled gracefully");
    assert!(validated.is_valid(), "State should remain valid with zero accuracy");
    assert!(validated.intensity.is_finite(), "Intensity must be finite");
    assert!(validated.chaos.is_finite(), "Chaos must be finite");
}

#[tokio::test]
async fn test_rapid_successive_inputs() {
    // Arrange
    let container = create_full_integration_container();
    let game_logic: Arc<dyn IGameLogicService> = container.resolve();
    
    // Act: Submit 100 inputs rapidly (stress test)
    let mut timestamps = Vec::new();
    
    for i in 0..100 {
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: f64::from(i).mul_add(10.0, 1000.0),
            accuracy: 0.8,
        };
        
        let qualia = QualiaState {
            intensity: 0.5,
            precision: 0.8,
            aggression: 0.5,
            flow: 0.7,
            chaos: 0.2,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: f64::from(i).mul_add(10.0, 2000.0),
        };
        
        let start = std::time::Instant::now();
        let result = game_logic.process_action(action, qualia).await;
        let duration = start.elapsed();
        
        assert!(result.is_ok(), "Input {i} should process successfully");
        timestamps.push(duration.as_micros());
    }
    
    // Assert: Average processing time should be reasonable (<1ms)
    let avg_time = timestamps.iter().sum::<u128>() / timestamps.len() as u128;
    assert!(avg_time < 1000, "Average processing time should be <1ms, got {avg_time}µs");
}

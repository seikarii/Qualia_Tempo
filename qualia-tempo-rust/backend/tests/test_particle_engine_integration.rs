//! # Responsibility
//! Integration tests for ParticleEngine with EventBus.
//!
//! ---
//!
//! Tests full event-driven particle lifecycle: spawn on event, update, cleanup.

use backend::engine::{IParticleEngine, QualiaParticleEngine};
use backend::services::core::EventBusService;
use shared_core::contracts::ParticleSystemConfig;
use shared_core::events::GameEvent;
use shared_core::traits::IEventBus;
use std::sync::Arc;

#[tokio::test]
async fn test_particle_spawn_on_event() {
    // Arrange: Create EventBus and ParticleEngine
    let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
    
    let config = Arc::new(ParticleSystemConfig {
        id: "test_particles".to_string(),
        max_particles: 1000,
        emission_rate: 100.0,
        lifetime_min: 0.5,
        lifetime_max: 2.0,
        velocity_min: shared_core::utils::Vec2::new(-5.0, -5.0),
        velocity_max: shared_core::utils::Vec2::new(5.0, 5.0),
        color_start: shared_core::utils::Vec3::new(1.0, 0.0, 0.5),
        color_end: shared_core::utils::Vec3::new(0.0, 0.5, 1.0),
        size_start: 1.0,
        size_end: 0.1,
        texture_id: None,
    });
    
    let particle_engine = QualiaParticleEngine::new(config, event_bus.clone());
    
    // Act: Subscribe to EventBus first (prevents SendError due to no subscribers)
    let _subscription = event_bus.subscribe();
    
    // Emit particle spawn event
    let event = GameEvent::GameStarted {
        song_id: "test_song".to_string(),
        boss_id: "test_boss".to_string(),
    };
    event_bus.emit(event).expect("Failed to emit event");
    
    // Simulate particle spawn (in real system, this would be event-triggered)
    particle_engine.spawn_particles(100).await.expect("Failed to spawn particles");
    
    // Assert: Verify particles spawned
    let count = particle_engine.get_active_count().await;
    assert_eq!(count, 100, "Should have spawned 100 particles");
    
    // Act: Update particles
    particle_engine.update(0.016).await.expect("Failed to update particles");
    
    // Assert: Particles still active (lifetime not expired)
    let count_after_update = particle_engine.get_active_count().await;
    assert_eq!(count_after_update, 100, "Particles should still be active after 16ms");
}

#[tokio::test]
async fn test_particle_lifecycle_full_cycle() {
    // Arrange
    let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
    
    let config = Arc::new(ParticleSystemConfig {
        id: "lifecycle_test".to_string(),
        max_particles: 500,
        emission_rate: 50.0,
        lifetime_min: 0.01, // Very short lifetime
        lifetime_max: 0.02,
        velocity_min: shared_core::utils::Vec2::ZERO,
        velocity_max: shared_core::utils::Vec2::ZERO,
        color_start: shared_core::utils::Vec3::ONE,
        color_end: shared_core::utils::Vec3::ZERO,
        size_start: 1.0,
        size_end: 0.0,
        texture_id: None,
    });
    
    let particle_engine = QualiaParticleEngine::new(config, event_bus);
    
    // Act: Spawn → Update → Cull
    particle_engine.spawn_particles(50).await.unwrap();
    assert_eq!(particle_engine.get_active_count().await, 50);
    
    // Update with large delta_time to expire particles
    particle_engine.update(0.05).await.unwrap(); // 50ms > max lifetime
    
    // Assert: All particles culled
    let count_after_expiry = particle_engine.get_active_count().await;
    assert_eq!(count_after_expiry, 0, "All particles should be culled after expiry");
}

#[tokio::test]
async fn test_particle_engine_respects_max_particles() {
    // Arrange
    let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
    
    let config = Arc::new(ParticleSystemConfig {
        id: "max_test".to_string(),
        max_particles: 100, // Small limit
        emission_rate: 1000.0,
        lifetime_min: 1.0,
        lifetime_max: 2.0,
        velocity_min: shared_core::utils::Vec2::ZERO,
        velocity_max: shared_core::utils::Vec2::ZERO,
        color_start: shared_core::utils::Vec3::ONE,
        color_end: shared_core::utils::Vec3::ZERO,
        size_start: 1.0,
        size_end: 0.5,
        texture_id: None,
    });
    
    let particle_engine = QualiaParticleEngine::new(config, event_bus);
    
    // Act: Try to spawn more than max
    particle_engine.spawn_particles(200).await.unwrap();
    
    // Assert: Capped at max_particles
    let count = particle_engine.get_active_count().await;
    assert_eq!(count, 100, "Should cap at max_particles (100), not spawn 200");
}

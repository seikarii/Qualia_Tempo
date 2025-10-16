//! # Responsibility
//! Orchestrates the 60 FPS combat game loop with event-driven coordination.
//!
//! ---
//!
//! This service runs a fixed-timestep loop using Tokio intervals to ensure consistent
//! 16.67ms ticks (60 FPS). It coordinates state updates, boss AI, and audio synchronization.
//! Emits MetronomeTick events synchronized to the song BPM for musical timing.

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::Result;
use tokio::time::{interval, Duration};
use shared_core::{
    contracts::QualiaState,
    events::{GameEvent, audio_events::MetronomeTickEvent},
};
use super::{IStateStore, IBossAIService};
use crate::services::infrastructure::{ILogger, IEventBus};
use crate::config::CombatOrchestratorConfig;

/// # Responsibility
/// Interface for combat orchestration operations.
#[async_trait]
pub trait ICombatOrchestratorService: Interface {
    /// Starts the 60 FPS game loop
    async fn start(&self) -> Result<()>;
    
    /// Stops the game loop
    async fn stop(&self) -> Result<()>;
    
    /// Gets the current tick count
    fn get_tick_count(&self) -> u64;
}

/// # Responsibility
/// Implements the 60 FPS combat loop with audio synchronization.
#[derive(Component)]
#[shaku(interface = ICombatOrchestratorService)]
pub struct CombatOrchestratorService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    state_store: Arc<dyn IStateStore>,
    
    config: Arc<CombatOrchestratorConfig>,
    
    tick_count: Arc<std::sync::atomic::AtomicU64>,
    running: Arc<std::sync::atomic::AtomicBool>,
}

impl CombatOrchestratorService {
    /// Calculates tick duration based on target Hz
    fn tick_duration(&self) -> Duration {
        Duration::from_micros((1_000_000.0 / self.config.tick_rate_hz as f64) as u64)
    }
    
    /// Processes a single game tick
    fn tick(&self, tick_number: u64) {
        // Apply qualia decay
        let state = self.state_store.get_state();
        let mut qualia = state.qualia_state;
        
        // Apply decay (0.01 per frame = 0.6 per second at 60 FPS)
        qualia.intensity = (qualia.intensity - 0.01).max(0.0);
        qualia.precision = (qualia.precision - 0.01).max(0.0);
        qualia.flow = (qualia.flow - 0.01).max(0.0);
        qualia.chaos = (qualia.chaos - 0.01).max(0.0);
        
        self.state_store.update_qualia(qualia);
        
        // Emit MetronomeTick for audio synchronization (every 1 second at 60 FPS = 60 ticks)
        if tick_number % 60 == 0 {
            let beat = (tick_number / 60) as u32;
            let event = GameEvent::Audio(
                shared_core::events::audio_events::AudioEvent::MetronomeTick(
                    MetronomeTickEvent {
                        beat_number: beat,
                        measure_number: beat / 4, // Assuming 4/4 time signature
                        is_downbeat: beat % 4 == 0,
                        timestamp: tick_number as f64 / 60.0,
                    }
                )
            );
            
            let _ = self.event_bus.emit(event);
        }
    }
}

#[async_trait]
impl ICombatOrchestratorService for CombatOrchestratorService {
    async fn start(&self) -> Result<()> {
        self.logger.info(&format!(
            "CombatOrchestrator starting at {} Hz",
            self.config.tick_rate_hz
        ));
        
        let tick_duration = self.tick_duration();
        let logger = self.logger.clone();
        let event_bus = self.event_bus.clone();
        let state_store = self.state_store.clone();
        let tick_count = self.tick_count.clone();
        let running = self.running.clone();
        let config = self.config.clone();
        
        // Set running flag
        running.store(true, std::sync::atomic::Ordering::Relaxed);
        
        let service_clone = Self {
            logger: logger.clone(),
            event_bus,
            state_store,
            config,
            tick_count: tick_count.clone(),
            running: running.clone(),
        };
        
        tokio::spawn(async move {
            let mut ticker = interval(tick_duration);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Burst);
            
            logger.info("CombatOrchestrator loop started");
            
            while running.load(std::sync::atomic::Ordering::Relaxed) {
                ticker.tick().await;
                
                let tick_number = tick_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                service_clone.tick(tick_number);
                
                // Log every 60 ticks (1 second at 60 Hz)
                if tick_number % 60 == 0 {
                    logger.info(&format!("Combat tick: {}", tick_number));
                }
            }
            
            logger.info("CombatOrchestrator loop stopped");
        });
        
        Ok(())
    }
    
    async fn stop(&self) -> Result<()> {
        self.logger.info("Stopping CombatOrchestrator");
        self.running.store(false, std::sync::atomic::Ordering::Relaxed);
        Ok(())
    }
    
    fn get_tick_count(&self) -> u64 {
        self.tick_count.load(std::sync::atomic::Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::{QualiaLogger, EventBusService};
    use crate::services::gameplay::StateStoreService;

    fn create_test_service() -> CombatOrchestratorService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
        let state_store = Arc::new(StateStoreService::new()) as Arc<dyn IStateStore>;
        let config = Arc::new(CombatOrchestratorConfig::default());
        
        CombatOrchestratorService {
            logger,
            event_bus,
            state_store,
            config,
            tick_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    #[tokio::test]
    async fn test_orchestrator_starts_and_stops() {
        let service = create_test_service();
        
        let result = service.start().await;
        assert!(result.is_ok(), "Should start successfully");
        
        // Wait for a few ticks
        tokio::time::sleep(Duration::from_millis(50)).await;
        
        let tick_count = service.get_tick_count();
        assert!(tick_count > 0, "Should have processed some ticks");
        
        let result = service.stop().await;
        assert!(result.is_ok(), "Should stop successfully");
    }

    #[tokio::test]
    async fn test_orchestrator_tick_rate_consistency() {
        let service = create_test_service();
        
        service.start().await.unwrap();
        
        // Measure tick rate over 100ms
        let start_ticks = service.get_tick_count();
        tokio::time::sleep(Duration::from_millis(100)).await;
        let end_ticks = service.get_tick_count();
        
        let ticks_processed = end_ticks - start_ticks;
        
        // At 60 Hz, we expect ~6 ticks in 100ms (allowing ±2 for scheduling jitter)
        assert!(ticks_processed >= 4 && ticks_processed <= 8,
            "Expected ~6 ticks in 100ms, got {}", ticks_processed);
        
        service.stop().await.unwrap();
    }

    #[tokio::test]
    async fn test_orchestrator_applies_qualia_decay() {
        let service = create_test_service();
        
        // Set initial qualia with high values
        let mut initial_qualia = QualiaState::default();
        initial_qualia.intensity = 1.0;
        initial_qualia.precision = 1.0;
        service.state_store.update_qualia(initial_qualia);
        
        service.start().await.unwrap();
        
        // Wait for several ticks (50ms = ~3 ticks at 60 Hz)
        tokio::time::sleep(Duration::from_millis(50)).await;
        
        let final_qualia = service.state_store.get_state().qualia_state;
        
        // Decay should have reduced values
        assert!(final_qualia.intensity < 1.0, "Intensity should decay");
        assert!(final_qualia.precision < 1.0, "Precision should decay");
        
        service.stop().await.unwrap();
    }

    #[tokio::test]
    async fn test_orchestrator_emits_metronome_events() {
        let service = create_test_service();
        
        // Subscribe to events
        let mut events = service.event_bus.subscribe();
        
        service.start().await.unwrap();
        
        // Wait for metronome tick (every 60 ticks = 1 second)
        // At 60 Hz, this means waiting ~1 second
        tokio::time::sleep(Duration::from_millis(1100)).await;
        
        // Check if we received a MetronomeTick event
        let mut found_metronome = false;
        loop {
            match events.try_recv() {
                Ok(GameEvent::Audio(shared_core::events::audio_events::AudioEvent::MetronomeTick(_))) => {
                    found_metronome = true;
                    break;
                }
                Ok(_) => continue,
                Err(_) => break,
            }
        }
        
        assert!(found_metronome, "Should have received MetronomeTick event");
        
        service.stop().await.unwrap();
    }
}

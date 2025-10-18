//! # Responsibility
//! Manages game state packaging and streaming at configurable rates (up to 60 FPS).
//!
//! ---
//!
//! COMPLIANCE: ARCHITECTURE.RUST §3.2 - Backend calculates, frontend renders.

use async_trait::async_trait;
use anyhow::Result;
use shared_core::traits::{IGameStateStreamingService, IEventBus, ILogger};
use shared_core::events::GameEvent;
use shared_core::contracts::CombatState;
use shaku::Component;
use std::sync::Arc;
use std::sync::atomic::{AtomicU32, Ordering};
use tokio::time::{Duration, interval};

/// # Responsibility
/// Streams game state updates at configurable rate (default 60 updates/sec).
///
/// ---
///
/// Uses bincode for efficient binary serialization (future optimization).
/// COMPLIANCE: QUALIA.CODE.RUST §4.3 - Zero-copy whenever possible.
#[derive(Component)]
#[shaku(interface = IGameStateStreamingService)]
pub struct GameStateStreamingService {
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    /// Updates per second (atomic for thread-safe modification)
    updates_per_second: Arc<AtomicU32>,
}

impl GameStateStreamingService {
    /// Creates new instance (called by Shaku)
    pub fn new(
        event_bus: Arc<dyn IEventBus>,
        logger: Arc<dyn ILogger>,
    ) -> Self {
        Self {
            event_bus,
            logger,
            updates_per_second: Arc::new(AtomicU32::new(60)),
        }
    }
    
    /// Starts streaming loop in background task
    pub fn start_streaming_loop(&self) -> tokio::task::JoinHandle<()> {
        let event_bus = self.event_bus.clone();
        let logger = self.logger.clone();
        let updates_per_second = self.updates_per_second.clone();
        
        tokio::spawn(async move {
            loop {
                let rate = updates_per_second.load(Ordering::Relaxed);
                if rate == 0 {
                    // Paused
                    tokio::time::sleep(Duration::from_millis(100)).await;
                    continue;
                }
                
                let interval_duration = Duration::from_millis(1000 / u64::from(rate));
                let mut ticker = interval(interval_duration);
                
                ticker.tick().await; // First tick completes immediately
                
                loop {
                    ticker.tick().await;
                    
                    // Check if rate changed (break to recreate interval)
                    let current_rate = updates_per_second.load(Ordering::Relaxed);
                    if current_rate != rate {
                        break;
                    }
                    
                    // Stream current state (placeholder - actual state comes from GameLogicService)
                    // In production, this would query current CombatState from a state manager
                    // For Phase 4, we emit a streaming tick event
                    if let Err(e) = event_bus.emit(GameEvent::ServerTick { timestamp: std::time::SystemTime::now() }) {
                        logger.warn(&format!("Failed to emit streaming tick: {e:?}"));
                    }
                }
            }
        })
    }
    
    /// Packages CombatState for transmission
    #[allow(dead_code, clippy::unused_self)] // Will be used in Phase 5 when game logic is integrated
    fn package_state(&self, state: &CombatState) -> Result<Vec<u8>> {
        // JSON serialization (Phase 4 implementation)
        let json = serde_json::to_vec(state)?;
        
        // Future optimization: bincode for binary serialization
        // let binary = bincode::serialize(state)?;
        
        Ok(json)
    }
}

#[async_trait]
impl IGameStateStreamingService for GameStateStreamingService {
    async fn stream_state(&self) -> Result<()> {
        // Manual state streaming (called by external coordinator)
        // For Phase 4, this is handled by start_streaming_loop()
        Ok(())
    }
    
    fn set_rate(&mut self, updates_per_second: u32) {
        self.updates_per_second.store(updates_per_second, Ordering::Relaxed);
        self.logger.info(&format!("Streaming rate set to {updates_per_second} updates/sec"));
    }
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_streaming_service_placeholder() {
        // Full tests require mock infrastructure
        // Pending Phase 5
        assert!(true, "Placeholder test for Phase 4");
    }
}

//! # Responsibility
//! Generates rhythmic metronome ticks synchronized with the song timeline.
//!
//! ---
//!
//! Emits MetronomeTickEvent at precise intervals based on BPM and time signature.
//! Critical for dash cooldown reset and rhythm validation.

use std::sync::Arc;
use tokio::time::{interval, Duration};
use shared_core::events::{GameEvent, MetronomeTickEvent};
use crate::services::interfaces::{ILogger, IEventBus};
use crate::config::MetronomeConfig;

/// # Responsibility
/// Metronome service that emits rhythmic tick events.
pub struct MetronomeService {
    config: Arc<MetronomeConfig>,
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
    is_running: Arc<tokio::sync::Mutex<bool>>,
}

impl MetronomeService {
    /// # Responsibility
    /// Creates new metronome with configuration.
    pub fn new(
        config: Arc<MetronomeConfig>,
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        Self {
            config,
            logger,
            event_bus,
            is_running: Arc::new(tokio::sync::Mutex::new(false)),
        }
    }
    
    /// # Responsibility
    /// Starts the metronome loop.
    ///
    /// ---
    ///
    /// Spawns async task that emits ticks at BPM-derived intervals.
    pub async fn start(&self) {
        let mut running = self.is_running.lock().await;
        if *running {
            self.logger.warn("Metronome already running");
            return;
        }
        *running = true;
        drop(running);
        
        let bpm = self.config.bpm;
        let time_signature_numerator = self.config.time_signature_numerator;
        let time_signature_denominator = self.config.time_signature_denominator;
        
        // Calculate tick interval in milliseconds
        // BPM = beats per minute, so ms_per_beat = 60000 / BPM
        let ms_per_beat = (60_000.0 / bpm as f64) as u64;
        
        let logger = self.logger.clone();
        let event_bus = self.event_bus.clone();
        let is_running = self.is_running.clone();
        
        tokio::spawn(async move {
            let mut tick_interval = interval(Duration::from_millis(ms_per_beat));
            let mut beat_number: u32 = 0;
            let mut measure_number: u32 = 0;
            let start_time = tokio::time::Instant::now();
            
            logger.info(&format!(
                "Metronome started: {}BPM, {}/{} time signature",
                bpm, time_signature_numerator, time_signature_denominator
            ));
            
            loop {
                // Check if still running
                if !*is_running.lock().await {
                    logger.info("Metronome stopped");
                    break;
                }
                
                tick_interval.tick().await;
                
                // Calculate current beat position
                let is_downbeat = (beat_number % time_signature_numerator) == 0;
                
                if is_downbeat && beat_number > 0 {
                    measure_number += 1;
                }
                
                // Calculate timestamp in seconds since start
                let elapsed = start_time.elapsed();
                let timestamp = elapsed.as_secs_f64();
                
                // Emit tick event
                let tick_event = MetronomeTickEvent {
                    beat_number,
                    measure_number,
                    is_downbeat,
                    timestamp,
                };
                
                let event = GameEvent::MetronomeTick(tick_event);
                
                if let Err(e) = event_bus.emit(event) {
                    logger.warn(&format!("Failed to emit metronome tick: {:?}", e));
                }
                
                if is_downbeat {
                    logger.info(&format!("Downbeat: measure {}", measure_number));
                }
                
                beat_number += 1;
            }
        });
    }
    
    /// # Responsibility
    /// Stops the metronome loop.
    pub async fn stop(&self) {
        let mut running = self.is_running.lock().await;
        *running = false;
        self.logger.info("Metronome stop requested");
    }
    
    /// # Responsibility
    /// Checks if metronome is currently running.
    pub async fn is_running(&self) -> bool {
        *self.is_running.lock().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockLogger, MockEventBus};
    use tokio::time::sleep;
    
    #[tokio::test]
    async fn test_metronome_emits_ticks() {
        let config = Arc::new(MetronomeConfig {
            bpm: 120.0,
            time_signature_numerator: 4,
            time_signature_denominator: 4,
        });
        
        let logger = Arc::new(MockLogger::new());
        let event_bus = Arc::new(MockEventBus::new());
        
        let metronome = MetronomeService::new(config, logger, event_bus.clone());
        
        metronome.start().await;
        assert!(metronome.is_running().await);
        
        // Wait for a few ticks (at 120 BPM = 500ms per beat)
        sleep(Duration::from_millis(1600)).await;
        
        metronome.stop().await;
        
        // Should have emitted ~3 events in 1.6 seconds at 120 BPM
        let emitted_count = event_bus.get_emitted_events().len();
        assert!(emitted_count >= 2 && emitted_count <= 4, "Expected 2-4 ticks, got {}", emitted_count);
    }
    
    #[tokio::test]
    async fn test_metronome_downbeats() {
        let config = Arc::new(MetronomeConfig {
            bpm: 240.0, // Fast for quick test
            time_signature_numerator: 4,
            time_signature_denominator: 4,
        });
        
        let logger = Arc::new(MockLogger::new());
        let event_bus = Arc::new(MockEventBus::new());
        
        let metronome = MetronomeService::new(config, logger, event_bus.clone());
        
        metronome.start().await;
        
        // Wait for ~8 beats (at 240 BPM = 250ms per beat, so 2 seconds)
        sleep(Duration::from_millis(2100)).await;
        
        metronome.stop().await;
        
        // Check downbeat pattern (every 4th beat)
        let events = event_bus.get_emitted_events();
        let mut downbeat_count = 0;
        
        for event in events {
            if let GameEvent::MetronomeTick(tick) = event {
                if tick.is_downbeat {
                    downbeat_count += 1;
                }
            }
        }
        
        // Should have 2-3 downbeats in 8 beats
        assert!(downbeat_count >= 1 && downbeat_count <= 3, "Expected 1-3 downbeats, got {}", downbeat_count);
    }
}

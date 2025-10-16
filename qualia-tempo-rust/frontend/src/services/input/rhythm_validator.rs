//! # Responsibility
//! Validates player actions against the music's rhythmic timeline.
//!
//! ---
//!
//! Subscribes to metronome ticks and PlayerAction events, calculates
//! timing accuracy, and emits validated actions with accuracy scores.

use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use shared_core::{PlayerAction, GameEvent};
use crate::services::core::{ILogger, IEventBus};

/// # Responsibility
/// Configuration for rhythm validation.
#[derive(Debug, Clone)]
pub struct RhythmValidationConfig {
    /// Perfect timing window (±ms from beat)
    pub perfect_window_ms: f64,
    
    /// Good timing window (±ms from beat)
    pub good_window_ms: f64,
    
    /// OK timing window (±ms from beat)
    pub ok_window_ms: f64,
    
    /// Maximum number of recent beats to track
    pub beat_history_size: usize,
}

impl Default for RhythmValidationConfig {
    fn default() -> Self {
        Self {
            perfect_window_ms: 50.0,   // ±50ms for Perfect
            good_window_ms: 100.0,     // ±100ms for Good
            ok_window_ms: 150.0,       // ±150ms for OK
            beat_history_size: 10,
        }
    }
}

/// # Responsibility
/// Represents timing accuracy for a player action.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TimingAccuracy {
    /// Perfect timing (±50ms)
    Perfect,
    /// Good timing (±100ms)
    Good,
    /// OK timing (±150ms)
    Ok,
    /// Miss (outside timing windows)
    Miss,
}

impl TimingAccuracy {
    /// # Responsibility
    /// Converts timing accuracy to normalized score [0.0, 1.0].
    pub fn to_score(&self) -> f32 {
        match self {
            Self::Perfect => 1.0,
            Self::Good => 0.75,
            Self::Ok => 0.5,
            Self::Miss => 0.0,
        }
    }
    
    /// # Responsibility
    /// Gets display color for UI feedback.
    pub fn to_color(&self) -> &'static str {
        match self {
            Self::Perfect => "#FFD700", // Gold
            Self::Good => "#90EE90",    // Light Green
            Self::Ok => "#FFA500",      // Orange
            Self::Miss => "#FF4444",    // Red
        }
    }
}

/// # Responsibility
/// Tracks recent beat timestamps for timing validation.
struct BeatTracker {
    beats: VecDeque<u64>, // Microsecond timestamps
    max_size: usize,
}

impl BeatTracker {
    fn new(max_size: usize) -> Self {
        Self {
            beats: VecDeque::with_capacity(max_size),
            max_size,
        }
    }
    
    /// # Responsibility
    /// Adds a new beat timestamp.
    fn add_beat(&mut self, timestamp: u64) {
        if self.beats.len() >= self.max_size {
            self.beats.pop_front();
        }
        self.beats.push_back(timestamp);
    }
    
    /// # Responsibility
    /// Finds the closest beat to a given timestamp.
    ///
    /// Returns (beat_timestamp, distance_in_microseconds).
    fn find_closest_beat(&self, timestamp: u64) -> Option<(u64, i64)> {
        self.beats.iter().map(|&beat| {
            let distance = (timestamp as i64) - (beat as i64);
            (beat, distance.abs())
        }).min_by_key(|&(_, dist)| dist)
    }
}

/// # Responsibility
/// Validates player actions against musical timing.
pub struct RhythmValidatorService {
    config: RhythmValidationConfig,
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
    beat_tracker: Arc<Mutex<BeatTracker>>,
}

impl RhythmValidatorService {
    /// # Responsibility
    /// Creates new rhythm validator with configuration.
    pub fn new(
        config: RhythmValidationConfig,
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        let beat_tracker = Arc::new(Mutex::new(
            BeatTracker::new(config.beat_history_size)
        ));
        
        Self {
            config,
            logger,
            event_bus,
            beat_tracker,
        }
    }
    
    /// # Responsibility
    /// Starts listening to events and validating timing.
    ///
    /// ---
    ///
    /// Subscribes to MetronomeTick and PlayerAction events.
    pub async fn start(&self) {
        let mut events = self.event_bus.subscribe();
        let beat_tracker = self.beat_tracker.clone();
        let config = self.config.clone();
        let logger = self.logger.clone();
        let event_bus = self.event_bus.clone();
        
        // Spawn validation task
        wasm_bindgen_futures::spawn_local(async move {
            loop {
                match events.recv().await {
                    Ok(GameEvent::MetronomeTick(tick_event)) => {
                        // Convert timestamp from seconds to microseconds
                        let timestamp_us = (tick_event.timestamp * 1_000_000.0) as u64;
                        
                        // Track beat for validation
                        beat_tracker.lock().unwrap().add_beat(timestamp_us);
                        logger.info(&format!("Beat tracked: {} µs (beat #{})", timestamp_us, tick_event.beat_number));
                    }
                    
                    Ok(GameEvent::PlayerAction(action)) => {
                        // Validate timing
                        let action_timestamp = match *action {
                            PlayerAction::KeyPressed { timestamp, .. } => timestamp,
                            PlayerAction::Dash { timestamp, .. } => timestamp,
                            _ => continue,
                        };
                        
                        // Convert f64 milliseconds to u64 microseconds
                        let action_timestamp_us = (action_timestamp * 1000.0) as u64;
                        
                        let tracker = beat_tracker.lock().unwrap();
                        if let Some((beat_ts, distance_us)) = tracker.find_closest_beat(action_timestamp_us) {
                            let distance_ms = (distance_us as f64) / 1000.0;
                            
                            // Calculate accuracy
                            let accuracy = if distance_ms.abs() <= config.perfect_window_ms {
                                TimingAccuracy::Perfect
                            } else if distance_ms.abs() <= config.good_window_ms {
                                TimingAccuracy::Good
                            } else if distance_ms.abs() <= config.ok_window_ms {
                                TimingAccuracy::Ok
                            } else {
                                TimingAccuracy::Miss
                            };
                            
                            logger.info(&format!(
                                "Action validated: {:?}, Distance: {:.1}ms",
                                accuracy, distance_ms
                            ));
                            
                            // Emit validated action
                            let validated_event = GameEvent::PlayerActionValidated {
                                action: action.clone(),
                                accuracy: accuracy.to_score(),
                                timing_offset_ms: distance_ms as f32,
                            };
                            
                            if let Err(e) = event_bus.emit(validated_event) {
                                logger.warn(&format!("Failed to emit validated action: {:?}", e));
                            }
                        } else {
                            // No beats tracked yet - auto-miss
                            logger.warn("No beats available for validation");
                            
                            let validated_event = GameEvent::PlayerActionValidated {
                                action: action.clone(),
                                accuracy: 0.0,
                                timing_offset_ms: 999.0,
                            };
                            
                            if let Err(e) = event_bus.emit(validated_event) {
                                logger.warn(&format!("Failed to emit validated action: {:?}", e));
                            }
                        }
                    }
                    
                    Err(e) => {
                        logger.error(&format!("EventBus error: {:?}", e));
                        break;
                    }
                    
                    _ => {}
                }
            }
        });
        
        self.logger.info("Rhythm validator started");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_timing_accuracy_to_score() {
        assert_eq!(TimingAccuracy::Perfect.to_score(), 1.0);
        assert_eq!(TimingAccuracy::Good.to_score(), 0.75);
        assert_eq!(TimingAccuracy::Ok.to_score(), 0.5);
        assert_eq!(TimingAccuracy::Miss.to_score(), 0.0);
    }
    
    #[test]
    fn test_beat_tracker_add_and_find() {
        let mut tracker = BeatTracker::new(5);
        
        // Add beats at 0, 500ms, 1000ms
        tracker.add_beat(0);
        tracker.add_beat(500_000);
        tracker.add_beat(1_000_000);
        
        // Action at 510ms should be closest to 500ms beat
        let result = tracker.find_closest_beat(510_000);
        assert_eq!(result, Some((500_000, 10_000)));
        
        // Action at 50ms should be closest to 0ms beat
        let result = tracker.find_closest_beat(50_000);
        assert_eq!(result, Some((0, 50_000)));
    }
    
    #[test]
    fn test_beat_tracker_capacity() {
        let mut tracker = BeatTracker::new(3);
        
        // Add 5 beats - should only keep last 3
        for i in 0..5 {
            tracker.add_beat(i * 1_000_000);
        }
        
        assert_eq!(tracker.beats.len(), 3);
        assert_eq!(tracker.beats[0], 2_000_000);
        assert_eq!(tracker.beats[2], 4_000_000);
    }
    
    #[test]
    fn test_rhythm_config_defaults() {
        let config = RhythmValidationConfig::default();
        assert_eq!(config.perfect_window_ms, 50.0);
        assert_eq!(config.good_window_ms, 100.0);
        assert_eq!(config.ok_window_ms, 150.0);
        assert_eq!(config.beat_history_size, 10);
    }
}

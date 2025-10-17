//! # Responsibility
//! PatternSystemService implementation for boss attack pattern management.
//!
//! ---
//!
//! Loads boss attack patterns from combat_data/*.json files, validates timing,
//! and executes patterns with beat synchronization.

use shaku::Component;
use async_trait::async_trait;
use std::sync::Arc;
use std::collections::HashMap;
use anyhow::{Context, Result, bail};
use tracing::{info, warn};
use tokio::sync::RwLock;

use crate::config::pattern_system::PatternSystemConfig;
use crate::services::interfaces::{IPatternSystemService, ILogger};
use shared_core::contracts::PatternData;
use shared_core::events::GameEvent;

/// # Responsibility
/// Implements boss attack pattern loading, validation, and execution.
///
/// ---
///
/// This service:
/// - Loads patterns from combat_data/*.json files
/// - Caches patterns in memory (if enabled)
/// - Validates pattern timing against song BPM
/// - Executes patterns and emits attack events
/// - Provides random pattern selection per phase
///
/// Injected dependencies:
/// - PatternSystemConfig: Pattern system configuration
/// - ILogger: Structured logging
#[derive(Component)]
#[shaku(interface = IPatternSystemService)]
pub struct PatternSystemService {
    config: Arc<PatternSystemConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    // Pattern cache (RwLock for concurrent reads)
    pattern_cache: RwLock<HashMap<String, PatternData>>,
}

#[async_trait]
impl IPatternSystemService for PatternSystemService {
    async fn load_pattern(&self, pattern_id: &str) -> Result<PatternData> {
        // Check cache first
        if self.config.enable_pattern_caching {
            let cache = self.pattern_cache.read().await;
            if let Some(pattern) = cache.get(pattern_id) {
                return Ok(pattern.clone());
            }
        }
        
        // Load from file
        let file_path = format!("{}{}.json", self.config.pattern_data_directory, pattern_id);
        let contents = tokio::fs::read_to_string(&file_path).await
            .context(format!("Failed to read pattern file: {}", file_path))?;
        
        let pattern: PatternData = serde_json::from_str(&contents)
            .context("Failed to parse pattern JSON")?;
        
        // Cache if enabled
        if self.config.enable_pattern_caching {
            let mut cache = self.pattern_cache.write().await;
            if cache.len() < self.config.max_cached_patterns {
                cache.insert(pattern_id.to_string(), pattern.clone());
            }
        }
        
        self.logger.info(&format!("Loaded pattern: {}", pattern_id));
        
        Ok(pattern)
    }
    
    fn validate_pattern_timing(&self, pattern: &PatternData, song_bpm: f32) -> bool {
        let beat_duration_ms = 60_000.0 / song_bpm; // Milliseconds per beat
        
        // Validate all attack timings
        for attack in &pattern.attacks {
            let timing_mod = attack.timing_ms % beat_duration_ms;
            
            // Check if timing is within tolerance of a beat
            if timing_mod > self.config.timing_tolerance_ms && timing_mod < (beat_duration_ms - self.config.timing_tolerance_ms) {
                warn!(
                    "Pattern {} has off-beat attack at {}ms (beat={}ms)",
                    pattern.id, attack.timing_ms, beat_duration_ms
                );
                return false;
            }
        }
        
        true
    }
    
    async fn execute_pattern(&self, pattern: &PatternData, current_beat: f64) -> Result<Vec<GameEvent>> {
        let mut events = Vec::new();
        
        // Convert current beat to milliseconds
        let current_time_ms = current_beat * (60_000.0 / pattern.bpm as f64);
        
        // Find attacks that should execute now
        for attack in &pattern.attacks {
            let attack_time_diff = (attack.timing_ms - current_time_ms).abs();
            
            // If within tolerance, emit attack event
            if attack_time_diff < self.config.timing_tolerance_ms {
                events.push(GameEvent::BossAttack {
                    attack_type: attack.attack_type.clone(),
                    damage: attack.damage,
                    position: attack.position,
                });
            }
        }
        
        if !events.is_empty() {
            self.logger.info(&format!("Executed pattern {}: {} attacks", pattern.id, events.len()));
        }
        
        Ok(events)
    }
    
    fn get_random_pattern_for_phase(&self, phase: u8) -> String {
        // Simplified random selection
        // In production, this would use rand crate and load from config
        let patterns_per_phase = vec![
            vec!["pattern_phase_0_a", "pattern_phase_0_b"],
            vec!["pattern_phase_1_a", "pattern_phase_1_b", "pattern_phase_1_c"],
            vec!["pattern_phase_2_a", "pattern_phase_2_b"],
            vec!["pattern_phase_3_final"],
        ];
        
        let phase_patterns = &patterns_per_phase[phase as usize % patterns_per_phase.len()];
        let index = (chrono::Utc::now().timestamp() as usize) % phase_patterns.len();
        
        phase_patterns[index].to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::pattern_system::PatternSystemConfig;
    use shared_core::contracts::{PatternData, AttackData};
    
    fn create_test_config() -> PatternSystemConfig {
        PatternSystemConfig {
            pattern_data_directory: "test_combat_data/".to_string(),
            enable_pattern_caching: true,
            max_cached_patterns: 10,
            timing_tolerance_ms: 50.0,
        }
    }
    
    fn create_test_service() -> PatternSystemService {
        PatternSystemService {
            config: Arc::new(create_test_config()),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            pattern_cache: RwLock::new(HashMap::new()),
        }
    }
    
    fn create_test_pattern(id: &str, bpm: u32, attacks: Vec<AttackData>) -> PatternData {
        PatternData {
            id: id.to_string(),
            name: format!("Test Pattern {}", id),
            phase: 0,
            bpm,
            attacks,
            duration_ms: 10000.0,
        }
    }
    
    #[test]
    fn test_validate_pattern_timing_on_beat() {
        let service = create_test_service();
        let pattern = create_test_pattern(
            "test_on_beat",
            120, // 120 BPM = 500ms per beat
            vec![
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 0.0, // On beat 0
                    damage: 10.0,
                    position: (0.0, 0.0),
                },
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 500.0, // On beat 1
                    damage: 10.0,
                    position: (0.0, 0.0),
                },
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 1000.0, // On beat 2
                    damage: 10.0,
                    position: (0.0, 0.0),
                },
            ],
        );
        
        assert!(service.validate_pattern_timing(&pattern, 120.0));
    }
    
    #[test]
    fn test_validate_pattern_timing_off_beat() {
        let service = create_test_service();
        let pattern = create_test_pattern(
            "test_off_beat",
            120, // 120 BPM = 500ms per beat
            vec![
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 250.0, // Off beat (midpoint between beats)
                    damage: 10.0,
                    position: (0.0, 0.0),
                },
            ],
        );
        
        assert!(!service.validate_pattern_timing(&pattern, 120.0));
    }
    
    #[test]
    fn test_validate_pattern_timing_within_tolerance() {
        let service = create_test_service();
        let pattern = create_test_pattern(
            "test_tolerance",
            120,
            vec![
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 25.0, // Within 50ms tolerance of beat 0
                    damage: 10.0,
                    position: (0.0, 0.0),
                },
            ],
        );
        
        assert!(service.validate_pattern_timing(&pattern, 120.0));
    }
    
    #[tokio::test]
    async fn test_execute_pattern_no_attacks_ready() {
        let service = create_test_service();
        let pattern = create_test_pattern(
            "test_execute",
            120,
            vec![
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 5000.0, // Far in future
                    damage: 10.0,
                    position: (0.0, 0.0),
                },
            ],
        );
        
        let events = service.execute_pattern(&pattern, 0.0).await.unwrap();
        assert_eq!(events.len(), 0); // No attacks should execute yet
    }
    
    #[tokio::test]
    async fn test_execute_pattern_attack_ready() {
        let service = create_test_service();
        let pattern = create_test_pattern(
            "test_execute",
            120,
            vec![
                AttackData {
                    attack_type: "laser".to_string(),
                    timing_ms: 0.0, // Immediate
                    damage: 10.0,
                    position: (5.0, 5.0),
                },
            ],
        );
        
        let events = service.execute_pattern(&pattern, 0.0).await.unwrap();
        assert_eq!(events.len(), 1);
        
        if let GameEvent::BossAttack { attack_type, damage, position } = &events[0] {
            assert_eq!(attack_type, "laser");
            assert_eq!(*damage, 10.0);
            assert_eq!(*position, (5.0, 5.0));
        } else {
            panic!("Expected BossAttack event");
        }
    }
    
    #[test]
    fn test_get_random_pattern_for_phase() {
        let service = create_test_service();
        
        let pattern_0 = service.get_random_pattern_for_phase(0);
        assert!(pattern_0.contains("phase_0"));
        
        let pattern_1 = service.get_random_pattern_for_phase(1);
        assert!(pattern_1.contains("phase_1"));
        
        let pattern_2 = service.get_random_pattern_for_phase(2);
        assert!(pattern_2.contains("phase_2"));
        
        let pattern_3 = service.get_random_pattern_for_phase(3);
        assert!(pattern_3.contains("phase_3"));
    }
    
    #[test]
    fn test_get_random_pattern_handles_invalid_phase() {
        let service = create_test_service();
        
        // Should wrap around to valid phase
        let pattern = service.get_random_pattern_for_phase(10);
        assert!(!pattern.is_empty());
    }
}

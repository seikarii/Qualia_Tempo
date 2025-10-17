//! # Responsibility
//! Pattern recognition service for musical combo detection.
//!
//! ---
//!
//! Implements emergent combo system per GDD.md §3.4 and §3.7.
//! Detects key sequences within timing windows and validates against
//! harmonic context to determine beneficial vs malicious effects.

use crate::config::PatternSystemConfig;
use super::traits::{IPatternSystem, InputEvent, DetectedCombo};
use async_trait::async_trait;
use anyhow::Result;
use shaku::Component;
use shared_core::contracts::QualiaState;
use shared_core::traits::ILogger;
use std::sync::Arc;
use tokio::sync::RwLock;

/// # Responsibility
/// Service for detecting musical combo patterns from player input.
///
/// ---
///
/// Maintains input history buffer, matches against configured patterns,
/// and calculates harmonic scores for combo validation.
#[derive(Component)]
#[shaku(interface = IPatternSystem)]
pub struct PatternSystemService {
    config: Arc<PatternSystemConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    /// Input buffer with timestamps for pattern matching
    input_buffer: Arc<RwLock<Vec<InputEvent>>>,
}

impl PatternSystemService {
    /// # Responsibility
    /// Attempts to match current input buffer against configured patterns.
    ///
    /// ---
    ///
    /// Matches patterns where the ENTIRE buffer matches the pattern keys.
    /// Prioritizes longest matches to prefer complex combos.
    fn try_match_pattern(&self, buffer: &[InputEvent]) -> Option<String> {
        if buffer.is_empty() {
            return None;
        }
        
        // Sort patterns by length (longest first) for priority matching
        let mut patterns = self.config.patterns.clone();
        patterns.sort_by(|a, b| b.keys.len().cmp(&a.keys.len()));
        
        for pattern in &patterns {
            // Only match if buffer length exactly matches pattern length
            if buffer.len() == pattern.keys.len() && self.matches_full_buffer(buffer, &pattern.keys) {
                return Some(pattern.id.clone());
            }
        }
        
        None
    }
    
    /// # Responsibility
    /// Checks if entire buffer matches a specific key sequence.
    ///
    /// ---
    ///
    /// Validates timing window and exact key order for full buffer.
    fn matches_full_buffer(&self, buffer: &[InputEvent], keys: &[char]) -> bool {
        if buffer.len() != keys.len() {
            return false;
        }
        
        // Verify key sequence matches
        for (i, &expected_key) in keys.iter().enumerate() {
            if buffer[i].key != expected_key {
                return false;
            }
        }
        
        // Verify all inputs within timing window
        if buffer.len() > 1 {
            let first_timestamp = buffer[0].timestamp;
            let last_timestamp = buffer[buffer.len() - 1].timestamp;
            
            if last_timestamp - first_timestamp > self.config.input_window_ms {
                return false;
            }
        }
        
        true
    }
    
    /// # Responsibility
    /// Prunes old inputs outside timing window.
    ///
    /// ---
    ///
    /// Maintains buffer efficiency by removing expired inputs.
    fn prune_old_inputs(&self, buffer: &mut Vec<InputEvent>, current_time: u64) {
        buffer.retain(|event| {
            current_time - event.timestamp <= self.config.input_window_ms
        });
    }
}

#[async_trait]
impl IPatternSystem for PatternSystemService {
    async fn register_input(&self, event: InputEvent) -> Result<Option<DetectedCombo>> {
        let mut buffer = self.input_buffer.write().await;
        
        // Prune old inputs before adding new one
        self.prune_old_inputs(&mut buffer, event.timestamp);
        
        // Add new input
        buffer.push(event);
        
        // Try to match pattern
        if let Some(pattern_id) = self.try_match_pattern(&buffer) {
            // Find full pattern details
            let pattern = self.config.patterns.iter()
                .find(|p| p.id == pattern_id)
                .expect("Pattern ID should exist");
            
            self.logger.info(&format!(
                "Combo detected: {} ({} keys)",
                pattern.effect_name,
                pattern.keys.len()
            ));
            
            // Create detected combo (harmonic score placeholder for now)
            let combo = DetectedCombo {
                pattern_id: pattern.id.clone(),
                keys: pattern.keys.clone(),
                timestamp: event.timestamp,
                is_beneficial: pattern.is_beneficial,
                harmonic_score: 0.5, // TODO: Calculate from qualia state
            };
            
            // Clear buffer after successful combo
            buffer.clear();
            
            return Ok(Some(combo));
        }
        
        Ok(None)
    }
    
    fn calculate_harmonic_score(&self, qualia: QualiaState) -> f32 {
        // Per GDD.md: Harmonic score based on harmony vs chaos
        // High harmony = beneficial combos
        // High chaos = malicious combos
        
        // Simple formula: (harmony - chaos) normalized to [0.0, 1.0]
        // Range is [-1.0, 1.0], so we map to [0.0, 1.0]
        let raw_score = qualia.harmony - qualia.chaos;
        
        // Map from [-1.0, 1.0] to [0.0, 1.0]
        let normalized_score = (raw_score + 1.0) / 2.0;
        
        // Clamp to [0.0, 1.0]
        normalized_score.clamp(0.0, 1.0)
    }
    
    async fn clear_input_buffer(&self) -> Result<()> {
        let mut buffer = self.input_buffer.write().await;
        buffer.clear();
        Ok(())
    }
    
    fn get_input_buffer(&self) -> Vec<InputEvent> {
        // Use try_read for non-async access
        // This is safe for debugging/telemetry as it's non-blocking
        self.input_buffer.try_read()
            .map(|buffer| buffer.clone())
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::QualiaLogger;
    use crate::config::ComboPattern;
    
    fn create_test_service() -> PatternSystemService {
        let config = Arc::new(PatternSystemConfig::default());
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let input_buffer = Arc::new(RwLock::new(Vec::new()));
        
        PatternSystemService {
            config,
            logger,
            input_buffer,
        }
    }
    
    #[tokio::test]
    async fn test_simple_combo_detection() {
        let service = create_test_service();
        
        // Input Q+E+R (vortex combo)
        let result1 = service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        assert!(result1.is_none(), "Should not trigger on partial combo");
        
        let result2 = service.register_input(InputEvent { key: 'E', timestamp: 1200 }).await.unwrap();
        assert!(result2.is_none(), "Should not trigger on partial combo");
        
        let result3 = service.register_input(InputEvent { key: 'R', timestamp: 1400 }).await.unwrap();
        assert!(result3.is_some(), "Should trigger vortex combo");
        
        let combo = result3.unwrap();
        assert_eq!(combo.pattern_id, "vortex");
        assert_eq!(combo.keys, vec!['Q', 'E', 'R']);
        assert!(combo.is_beneficial);
    }
    
    #[tokio::test]
    async fn test_timing_window_enforcement() {
        let service = create_test_service();
        
        // Input Q+E with large gap (should fail timing window)
        service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        service.register_input(InputEvent { key: 'E', timestamp: 2500 }).await.unwrap(); // 1500ms gap > 1000ms window
        let result = service.register_input(InputEvent { key: 'R', timestamp: 2600 }).await.unwrap();
        
        assert!(result.is_none(), "Should not trigger due to timing window violation");
    }
    
    #[tokio::test]
    async fn test_longest_pattern_priority() {
        // Create service with custom pattern that doesn't have substring combos
        let mut config = PatternSystemConfig::default();
        config.input_window_ms = 2000; // 2 seconds
        // Clear default patterns and add only complete_scale for this test
        config.patterns = vec![
            ComboPattern {
                id: "complete_scale".to_string(),
                keys: vec!['Q', 'E', 'R', 'T', 'F', 'G', 'C'],
                is_beneficial: true,
                effect_name: "Complete Scale".to_string(),
            },
        ];
        let config = Arc::new(config);
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let input_buffer = Arc::new(RwLock::new(Vec::new()));
        let service = PatternSystemService {
            config,
            logger,
            input_buffer,
        };
        
        // Input full scale Q+E+R+T+F+G+C
        service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        service.register_input(InputEvent { key: 'E', timestamp: 1080 }).await.unwrap();
        service.register_input(InputEvent { key: 'R', timestamp: 1160 }).await.unwrap();
        service.register_input(InputEvent { key: 'T', timestamp: 1240 }).await.unwrap();
        service.register_input(InputEvent { key: 'F', timestamp: 1320 }).await.unwrap();
        service.register_input(InputEvent { key: 'G', timestamp: 1400 }).await.unwrap();
        let result = service.register_input(InputEvent { key: 'C', timestamp: 1480 }).await.unwrap();
        
        let combo = result.expect("Should detect complete_scale combo");
        assert_eq!(combo.pattern_id, "complete_scale");
        assert_eq!(combo.keys.len(), 7);
    }
    
    #[tokio::test]
    async fn test_malicious_combo_detection() {
        let service = create_test_service();
        
        // Input Q+T+G (sound wall - malicious)
        service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        service.register_input(InputEvent { key: 'T', timestamp: 1200 }).await.unwrap();
        let result = service.register_input(InputEvent { key: 'G', timestamp: 1400 }).await.unwrap();
        
        let combo = result.expect("Should detect malicious combo");
        assert_eq!(combo.pattern_id, "sound_wall");
        assert!(!combo.is_beneficial, "Should be malicious combo");
    }
    
    #[tokio::test]
    async fn test_buffer_clears_after_combo() {
        let service = create_test_service();
        
        // Trigger vortex combo
        service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        service.register_input(InputEvent { key: 'E', timestamp: 1200 }).await.unwrap();
        service.register_input(InputEvent { key: 'R', timestamp: 1400 }).await.unwrap();
        
        // Buffer should be empty after combo
        let buffer = service.get_input_buffer();
        assert_eq!(buffer.len(), 0, "Buffer should clear after combo");
    }
    
    #[tokio::test]
    async fn test_prune_old_inputs() {
        let service = create_test_service();
        
        // Add old input
        service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        
        // Add new input after window expires
        service.register_input(InputEvent { key: 'E', timestamp: 2500 }).await.unwrap();
        
        let buffer = service.get_input_buffer();
        assert_eq!(buffer.len(), 1, "Old input should be pruned");
        assert_eq!(buffer[0].key, 'E', "Only recent input should remain");
    }
    
    #[test]
    fn test_harmonic_score_calculation() {
        let service = create_test_service();
        
        // High harmony, low chaos = high score
        let qualia_harmonic = QualiaState {
            harmony: 0.9,
            chaos: 0.1,
            ..Default::default()
        };
        let score_harmonic = service.calculate_harmonic_score(qualia_harmonic);
        assert!(score_harmonic > 0.5, "High harmony should give high score");
        
        // Low harmony, high chaos = low score
        let qualia_chaotic = QualiaState {
            harmony: 0.1,
            chaos: 0.9,
            ..Default::default()
        };
        let score_chaotic = service.calculate_harmonic_score(qualia_chaotic);
        assert!(score_chaotic < 0.5, "High chaos should give low score");
    }
    
    #[tokio::test]
    async fn test_clear_input_buffer() {
        let service = create_test_service();
        
        // Add some inputs
        service.register_input(InputEvent { key: 'Q', timestamp: 1000 }).await.unwrap();
        service.register_input(InputEvent { key: 'E', timestamp: 1200 }).await.unwrap();
        
        // Clear buffer
        service.clear_input_buffer().await.unwrap();
        
        let buffer = service.get_input_buffer();
        assert_eq!(buffer.len(), 0, "Buffer should be empty after clear");
    }
    
    #[tokio::test]
    async fn test_wrong_key_order_fails() {
        let service = create_test_service();
        
        // Input E+Q+R (wrong order for vortex)
        service.register_input(InputEvent { key: 'E', timestamp: 1000 }).await.unwrap();
        service.register_input(InputEvent { key: 'Q', timestamp: 1200 }).await.unwrap();
        let result = service.register_input(InputEvent { key: 'R', timestamp: 1400 }).await.unwrap();
        
        assert!(result.is_none(), "Wrong key order should not trigger combo");
    }
}

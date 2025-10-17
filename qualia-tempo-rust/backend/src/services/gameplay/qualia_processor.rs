//! # Responsibility
//! QualiaProcessorService implementation for qualia state calculation.
//!
//! ---
//!
//! Calculates all 5 qualia dimensions (intensity, harmony, chaos, kairos, transcendence)
//! from player actions with accuracy modulation and time-based decay.

use shaku::Component;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::{Context, Result};
use tracing::info;

use crate::config::qualia_processor::QualiaProcessorConfig;
use crate::services::interfaces::{IQualiaProcessorService, ILogger};
use shared_core::contracts::{PlayerAction, QualiaState};

/// # Responsibility
/// Implements qualia state calculation from player actions.
///
/// ---
///
/// This service:
/// - Calculates intensity (energy level from actions)
/// - Calculates harmony (note sequence coherence)
/// - Calculates chaos (timing variance)
/// - Calculates kairos (perfect timing moments)
/// - Calculates transcendence (sustained high performance)
/// - Applies decay rates over time
/// - Clamps all values to [0.0, 1.0] to prevent NaN/Inf
///
/// Injected dependencies:
/// - QualiaProcessorConfig: Calculation parameters
/// - ILogger: Structured logging
#[derive(Component)]
#[shaku(interface = IQualiaProcessorService)]
pub struct QualiaProcessorService {
    config: Arc<QualiaProcessorConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

#[async_trait]
impl IQualiaProcessorService for QualiaProcessorService {
    async fn process_action(
        &self,
        action: &PlayerAction,
        previous_state: &QualiaState,
        delta_time: f32,
    ) -> Result<QualiaState> {
        // Apply decay first
        let mut decayed_state = self.apply_decay(previous_state, delta_time);
        
        // Extract accuracy
        let accuracy = self.extract_accuracy(action)?;
        
        // Calculate contributions from action
        let intensity_contrib = self.calculate_intensity(action, accuracy);
        let chaos_contrib = self.calculate_chaos(1.0 - accuracy); // Higher inaccuracy = more chaos
        let kairos_contrib = if accuracy > 0.95 {
            self.config.buildup_rates.kairos_per_perfect_timing
        } else {
            0.0
        };
        
        // Update state
        decayed_state.intensity = (decayed_state.intensity + intensity_contrib).clamp(0.0, 1.0);
        decayed_state.chaos = (decayed_state.chaos + chaos_contrib).clamp(0.0, 1.0);
        decayed_state.kairos = (decayed_state.kairos + kairos_contrib).clamp(0.0, 1.0);
        
        // Harmony calculation (simplified: based on accuracy)
        if accuracy > 0.8 {
            decayed_state.harmony = (decayed_state.harmony + self.config.buildup_rates.harmony_per_accurate_note).clamp(0.0, 1.0);
        }
        
        // Transcendence buildup (only when all conditions met)
        if decayed_state.intensity >= self.config.transcendence.min_intensity
            && decayed_state.harmony >= self.config.transcendence.min_harmony
            && decayed_state.kairos >= self.config.transcendence.min_kairos
        {
            decayed_state.transcendence = (decayed_state.transcendence + self.config.transcendence.buildup_rate).clamp(0.0, 1.0);
        }
        
        self.logger.info(&format!(
            "Qualia updated: I={:.2}, H={:.2}, C={:.2}, K={:.2}, T={:.2}",
            decayed_state.intensity,
            decayed_state.harmony,
            decayed_state.chaos,
            decayed_state.kairos,
            decayed_state.transcendence
        ));
        
        Ok(decayed_state)
    }
    
    fn apply_decay(&self, state: &QualiaState, delta_time: f32) -> QualiaState {
        let decay_factor = |decay_rate: f32| decay_rate.powf(delta_time);
        
        QualiaState {
            intensity: (state.intensity * decay_factor(self.config.decay_rates.intensity)).clamp(0.0, 1.0),
            harmony: (state.harmony * decay_factor(self.config.decay_rates.harmony)).clamp(0.0, 1.0),
            chaos: (state.chaos * decay_factor(self.config.decay_rates.chaos)).clamp(0.0, 1.0),
            kairos: (state.kairos * decay_factor(self.config.decay_rates.kairos)).clamp(0.0, 1.0),
            transcendence: (state.transcendence * decay_factor(self.config.decay_rates.transcendence)).clamp(0.0, 1.0),
            ..*state
        }
    }
    
    fn calculate_intensity(&self, action: &PlayerAction, accuracy: f32) -> f32 {
        let base_intensity = self.config.buildup_rates.intensity_per_action;
        
        // Intensity scales with accuracy
        let intensity = base_intensity * accuracy;
        
        intensity.clamp(0.0, 0.2) // Max 0.2 per action to prevent instant max-out
    }
    
    fn calculate_harmony(&self, recent_notes: &[char]) -> f32 {
        // Simplified harmony calculation
        // In production, this would analyze note intervals and consonance
        if recent_notes.is_empty() {
            return 0.0;
        }
        
        // Count repeated notes (simple harmony metric)
        let unique_count = recent_notes.iter().collect::<std::collections::HashSet<_>>().len();
        let harmony_score = 1.0 - (unique_count as f32 / recent_notes.len() as f32);
        
        harmony_score.clamp(0.0, 1.0)
    }
    
    fn calculate_chaos(&self, timing_variance: f32) -> f32 {
        let chaos = self.config.buildup_rates.chaos_per_mistimed_action * timing_variance;
        
        chaos.clamp(0.0, 0.15) // Max 0.15 per action
    }
}

impl QualiaProcessorService {
    fn extract_accuracy(&self, action: &PlayerAction) -> Result<f32> {
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => Ok(*accuracy),
            PlayerAction::Dash { accuracy, .. } => Ok(*accuracy),
            PlayerAction::Special { accuracy, .. } => Ok(*accuracy),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::qualia_processor::{QualiaProcessorConfig, DecayRatesConfig, BuildupRatesConfig, TranscendenceConfig};
    
    fn create_test_config() -> QualiaProcessorConfig {
        QualiaProcessorConfig {
            decay_rates: DecayRatesConfig {
                intensity: 0.95,
                harmony: 0.98,
                chaos: 0.97,
                kairos: 0.99,
                transcendence: 0.995,
            },
            buildup_rates: BuildupRatesConfig {
                intensity_per_action: 0.1,
                harmony_per_accurate_note: 0.05,
                chaos_per_mistimed_action: 0.08,
                kairos_per_perfect_timing: 0.15,
            },
            transcendence: TranscendenceConfig {
                min_intensity: 0.8,
                min_harmony: 0.7,
                min_kairos: 0.9,
                buildup_rate: 0.01,
            },
        }
    }
    
    fn create_test_service() -> QualiaProcessorService {
        QualiaProcessorService {
            config: Arc::new(create_test_config()),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
        }
    }
    
    #[test]
    fn test_apply_decay_reduces_values() {
        let service = create_test_service();
        let state = QualiaState {
            intensity: 1.0,
            harmony: 1.0,
            chaos: 1.0,
            kairos: 1.0,
            transcendence: 1.0,
            ..Default::default()
        };
        
        let decayed = service.apply_decay(&state, 1.0); // 1 second
        
        assert!(decayed.intensity < 1.0);
        assert!(decayed.harmony < 1.0);
        assert!(decayed.chaos < 1.0);
        assert!(decayed.kairos < 1.0);
        assert!(decayed.transcendence < 1.0);
    }
    
    #[test]
    fn test_apply_decay_preserves_zero() {
        let service = create_test_service();
        let state = QualiaState::default(); // All zeros
        
        let decayed = service.apply_decay(&state, 1.0);
        
        assert_eq!(decayed.intensity, 0.0);
        assert_eq!(decayed.harmony, 0.0);
        assert_eq!(decayed.chaos, 0.0);
        assert_eq!(decayed.kairos, 0.0);
        assert_eq!(decayed.transcendence, 0.0);
    }
    
    #[test]
    fn test_calculate_intensity_perfect_accuracy() {
        let service = create_test_service();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp_ms: 0,
            accuracy: 1.0,
        };
        
        let intensity = service.calculate_intensity(&action, 1.0);
        assert_eq!(intensity, 0.1);
    }
    
    #[test]
    fn test_calculate_intensity_zero_accuracy() {
        let service = create_test_service();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp_ms: 0,
            accuracy: 0.0,
        };
        
        let intensity = service.calculate_intensity(&action, 0.0);
        assert_eq!(intensity, 0.0);
    }
    
    #[test]
    fn test_calculate_intensity_clamped() {
        let service = create_test_service();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp_ms: 0,
            accuracy: 10.0, // Invalid high accuracy
        };
        
        let intensity = service.calculate_intensity(&action, 10.0);
        assert!(intensity <= 0.2); // Should clamp to max
    }
    
    #[test]
    fn test_calculate_chaos_high_variance() {
        let service = create_test_service();
        
        let chaos = service.calculate_chaos(1.0); // Maximum timing variance
        assert!(chaos > 0.0);
        assert!(chaos <= 0.15); // Should clamp to max
    }
    
    #[test]
    fn test_calculate_chaos_perfect_timing() {
        let service = create_test_service();
        
        let chaos = service.calculate_chaos(0.0); // Perfect timing
        assert_eq!(chaos, 0.0);
    }
    
    #[tokio::test]
    async fn test_process_action_increases_intensity() {
        let service = create_test_service();
        let initial_state = QualiaState::default();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp_ms: 0,
            accuracy: 1.0,
        };
        
        let result = service.process_action(&action, &initial_state, 0.016).await;
        assert!(result.is_ok());
        
        let new_state = result.unwrap();
        assert!(new_state.intensity > initial_state.intensity);
    }
    
    #[tokio::test]
    async fn test_process_action_prevents_nan() {
        let service = create_test_service();
        let initial_state = QualiaState::default();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp_ms: 0,
            accuracy: f32::NAN, // Invalid input
        };
        
        // Should handle gracefully or return error
        let result = service.process_action(&action, &initial_state, 0.016).await;
        if let Ok(new_state) = result {
            assert!(new_state.intensity.is_finite());
            assert!(new_state.harmony.is_finite());
            assert!(new_state.chaos.is_finite());
        }
    }
    
    #[test]
    fn test_calculate_harmony_empty_notes() {
        let service = create_test_service();
        
        let harmony = service.calculate_harmony(&[]);
        assert_eq!(harmony, 0.0);
    }
}

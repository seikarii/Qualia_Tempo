//! # Responsibility
//! QualiaProcessor - Core qualia state calculation engine.

use shared_core::contracts::{PlayerAction, QualiaState};
use crate::config::GameLogicConfig;
use std::sync::Arc;

/// # Responsibility
/// Calculates qualia state based on player actions and timing.
///
/// ---
///
/// This is the mathematical heart of the game. It transforms player input
/// into the emotional/musical state that drives visuals, audio, and difficulty.
/// All calculations follow GDD.md §3.1 specifications.
pub struct QualiaProcessor {
    config: Arc<GameLogicConfig>,
}

impl QualiaProcessor {
    /// Create a new QualiaProcessor with configuration.
    pub fn new(config: Arc<GameLogicConfig>) -> Self {
        Self { config }
    }
    
    /// Process a player action and update qualia state.
    ///
    /// # Arguments
    /// * `current_state` - The current qualia state
    /// * `action` - The player action to process
    /// * `delta_time_ms` - Time elapsed since last update (for decay calculations)
    ///
    /// # Returns
    /// The new calculated qualia state, clamped to [0.0, 1.0]
    pub fn process_action(
        &self,
        current_state: QualiaState,
        action: &PlayerAction,
        delta_time_ms: u64,
    ) -> QualiaState {
        let mut new_state = current_state;
        
        // Apply natural decay/growth based on time
        self.apply_time_decay(&mut new_state, delta_time_ms);
        
        // Process action-specific effects
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                self.apply_key_press_effects(&mut new_state, *accuracy);
            }
            PlayerAction::Dash { perfect_timing, .. } => {
                self.apply_dash_effects(&mut new_state, *perfect_timing);
            }
            PlayerAction::QualiaCollected { value, .. } => {
                self.apply_qualia_collection(&mut new_state, *value);
            }
            PlayerAction::Parry { successful, .. } => {
                self.apply_parry_effects(&mut new_state, *successful);
            }
            PlayerAction::UltimateActivated { .. } => {
                self.apply_ultimate_effects(&mut new_state);
            }
        }
        
        // Clamp all values to valid range
        self.clamp_state(&mut new_state);
        
        // Update timestamp
        new_state.timestamp = action.timestamp();
        
        new_state
    }
    
    /// Apply natural time-based decay and growth.
    fn apply_time_decay(&self, state: &mut QualiaState, delta_time_ms: u64) {
        let delta_sec = delta_time_ms as f32 / 1000.0;
        
        // Harmony decays naturally (GDD: represents sustained focus)
        state.harmony = (state.harmony - self.config.harmony_decay_rate * delta_sec).max(0.0);
        
        // Chaos grows naturally (GDD: entropy increases without action)
        state.chaos = (state.chaos + self.config.chaos_growth_rate * delta_sec).min(1.0);
        
        // Intensity decays slowly when no actions
        state.intensity = (state.intensity - 0.01 * delta_sec).max(0.0);
    }
    
    /// Apply effects from a key press (musical note).
    fn apply_key_press_effects(&self, state: &mut QualiaState, accuracy: f32) {
        // Intensity increases based on accuracy
        let intensity_gain = accuracy * self.config.intensity_multiplier * 0.1;
        state.intensity += intensity_gain;
        
        // High accuracy increases harmony
        if accuracy > 0.8 {
            state.harmony += 0.05;
        }
        
        // Perfect timing (>0.95) triggers kairos
        if accuracy > 0.95 {
            state.kairos = 1.0;
        } else {
            state.kairos *= 0.5; // Decay kairos if not perfect
        }
    }
    
    /// Apply effects from a dash action.
    fn apply_dash_effects(&self, state: &mut QualiaState, perfect_timing: bool) {
        // Dash generates intensity
        state.intensity += 0.08;
        
        if perfect_timing {
            // Perfect dash: major harmony boost, kairos trigger
            state.harmony += 0.1;
            state.kairos = 1.0;
            state.chaos -= 0.05; // Perfect execution reduces chaos
        } else {
            // Imperfect dash: slight chaos increase
            state.chaos += 0.02;
        }
    }
    
    /// Apply effects from collecting qualia orbs.
    fn apply_qualia_collection(&self, state: &mut QualiaState, value: f32) {
        // Collecting qualia is the primary chaos reducer
        state.chaos = (state.chaos - value * 0.15).max(0.0);
        
        // Also provides small intensity boost
        state.intensity += value * 0.05;
        
        // High-value collection (>0.8) boosts harmony
        if value > 0.8 {
            state.harmony += 0.03;
        }
    }
    
    /// Apply effects from a parry action.
    fn apply_parry_effects(&self, state: &mut QualiaState, success: bool) {
        if success {
            // Successful parry: major defensive achievement
            state.harmony += 0.15; // High harmony boost
            state.intensity += 0.1;
            state.chaos -= 0.1; // Significant chaos reduction
            state.kairos = 1.0; // Perfect timing trigger
        } else {
            // Failed parry: penalty
            state.chaos += 0.1;
            state.harmony -= 0.05;
        }
    }
    
    /// Apply effects from ultimate ability activation.
    fn apply_ultimate_effects(&self, state: &mut QualiaState) {
        // Ultimate is a full reset to peak performance
        state.intensity = 1.0;
        state.harmony = 0.8;
        state.chaos = 0.1;
        state.kairos = 1.0;
    }
    
    /// Clamp all state values to [0.0, 1.0] range.
    fn clamp_state(&self, state: &mut QualiaState) {
        state.intensity = state.intensity.clamp(0.0, 1.0);
        state.harmony = state.harmony.clamp(0.0, 1.0);
        state.chaos = state.chaos.clamp(0.0, 1.0);
        state.kairos = state.kairos.clamp(0.0, 1.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::Vec2;

    fn create_test_config() -> Arc<GameLogicConfig> {
        Arc::new(GameLogicConfig {
            intensity_multiplier: 1.0,
            harmony_decay_rate: 0.05,
            chaos_growth_rate: 0.02,
            kairos_threshold_ms: 50,
            base_combo_multiplier: 1.5,
        })
    }

    #[test]
    fn test_key_press_with_perfect_accuracy_triggers_kairos() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState::default();
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.96, // Above 0.95 threshold
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        assert!(new_state.kairos > 0.9, "Perfect timing should trigger kairos");
        assert!(new_state.intensity > initial_state.intensity, "Intensity should increase");
        assert!(new_state.harmony > initial_state.harmony, "Harmony should increase");
    }

    #[test]
    fn test_time_decay_reduces_harmony_increases_chaos() {
        let processor = QualiaProcessor::new(create_test_config());
        let mut state = QualiaState {
            intensity: 0.5,
            harmony: 0.8,
            chaos: 0.2,
            kairos: 0.0,
            timestamp: 1000,
            ..Default::default()
        };
        
        // Simulate 1 second passing with no action
        processor.apply_time_decay(&mut state, 1000);
        
        assert!(state.harmony < 0.8, "Harmony should decay");
        assert!(state.chaos > 0.2, "Chaos should grow");
    }

    #[test]
    fn test_qualia_collection_reduces_chaos() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState {
            chaos: 0.5,
            ..Default::default()
        };
        
        let action = PlayerAction::QualiaCollected {
            position: Vec2 { x: 0.0, y: 0.0 },
            timestamp: 1000,
            value: 1.0, // Maximum value
            qualia_type: "harmonic".to_string(),
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        assert!(new_state.chaos < initial_state.chaos, "Chaos should decrease");
        assert!(new_state.chaos >= 0.0, "Chaos should not go negative");
    }

    #[test]
    fn test_perfect_dash_boosts_harmony_and_kairos() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState::default();
        
        let action = PlayerAction::Dash {
            direction: Vec2 { x: 1.0, y: 0.0 },
            timestamp: 1000,
            perfect_timing: true,
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        assert!(new_state.kairos > 0.9, "Perfect dash should trigger kairos");
        assert!(new_state.harmony > initial_state.harmony, "Harmony should increase");
        assert!(new_state.chaos < initial_state.chaos || initial_state.chaos == 0.0, "Chaos should decrease or stay at 0");
    }

    #[test]
    fn test_successful_parry_major_benefits() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState {
            chaos: 0.5,
            harmony: 0.3,
            ..Default::default()
        };
        
        let action = PlayerAction::Parry {
            timestamp: 1000,
            successful: true,
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        assert!(new_state.harmony > initial_state.harmony, "Harmony should increase significantly");
        assert!(new_state.chaos < initial_state.chaos, "Chaos should decrease");
        assert!(new_state.kairos > 0.9, "Successful parry should trigger kairos");
    }

    #[test]
    fn test_failed_parry_penalty() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState {
            chaos: 0.3,
            harmony: 0.5,
            ..Default::default()
        };
        
        let action = PlayerAction::Parry {
            timestamp: 1000,
            successful: false,
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        assert!(new_state.chaos > initial_state.chaos, "Chaos should increase");
        assert!(new_state.harmony < initial_state.harmony, "Harmony should decrease");
    }

    #[test]
    fn test_ultimate_resets_to_peak_performance() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState {
            intensity: 0.2,
            harmony: 0.1,
            chaos: 0.9,
            kairos: 0.0,
            timestamp: 1000,
            ..Default::default()
        };
        
        let action = PlayerAction::UltimateActivated { 
            timestamp: 2000,
            combo_level: 5,
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        assert_eq!(new_state.intensity, 1.0, "Intensity should be max");
        assert_eq!(new_state.kairos, 1.0, "Kairos should be max");
        assert!(new_state.harmony > 0.7, "Harmony should be high");
        assert!(new_state.chaos < 0.2, "Chaos should be low");
    }

    #[test]
    fn test_all_values_clamped_to_valid_range() {
        let processor = QualiaProcessor::new(create_test_config());
        
        // Start with extreme values
        let mut state = QualiaState {
            intensity: 2.0, // Over limit
            harmony: -0.5,  // Under limit
            chaos: 1.5,     // Over limit
            kairos: -1.0,   // Under limit
            timestamp: 1000,
            ..Default::default()
        };
        
        processor.clamp_state(&mut state);
        
        assert!(state.intensity <= 1.0 && state.intensity >= 0.0);
        assert!(state.harmony <= 1.0 && state.harmony >= 0.0);
        assert!(state.chaos <= 1.0 && state.chaos >= 0.0);
        assert!(state.kairos <= 1.0 && state.kairos >= 0.0);
    }

    #[test]
    fn test_zero_accuracy_edge_case() {
        let processor = QualiaProcessor::new(create_test_config());
        let initial_state = QualiaState::default();
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.0, // Worst possible accuracy
        };
        
        let new_state = processor.process_action(initial_state, &action, 0);
        
        // Should not crash, all values should be finite
        assert!(new_state.intensity.is_finite());
        assert!(new_state.harmony.is_finite());
        assert!(new_state.chaos.is_finite());
        assert!(new_state.kairos.is_finite());
    }
}

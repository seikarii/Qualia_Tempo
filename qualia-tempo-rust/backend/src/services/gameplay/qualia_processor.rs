//! # Responsibility
//! Calculates QualiaState from PlayerAction with accuracy scoring and modifiers.
//!
//! ---
//!
//! This service encapsulates the core qualia calculation math, applying
//! combos, accuracy, timing, and decay logic according to GDD.md rules.

#![allow(clippy::cast_precision_loss)]
#![allow(clippy::suboptimal_flops)]

use crate::config::GameLogicConfig;
use crate::services::interfaces::ILogger;
use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use shared_core::contracts::{PlayerAction, QualiaState};
use shared_core::traits::IQualiaProcessorService;
use std::sync::Arc;
use tracing::{debug, instrument};

/// # Responsibility
/// Implements qualia state calculation logic.
///
/// ---
///
/// Processes player actions and applies mathematical transformations
/// to produce normalized qualia values in [0.0, 1.0] range.
#[derive(Component)]
#[shaku(interface = IQualiaProcessorService)]
pub struct QualiaProcessorService {
    config: Arc<GameLogicConfig>,

    #[shaku(inject)]
    #[allow(dead_code)] // Will be used for logging calculation details
    logger: Arc<dyn ILogger>,
}

#[async_trait]
impl IQualiaProcessorService for QualiaProcessorService {
    #[instrument(skip(self))]
    async fn calculate_qualia(
        &self,
        action: &PlayerAction,
        previous_state: &QualiaState,
    ) -> Result<QualiaState> {
        debug!("Calculating qualia from action: {:?}", action);

        let new_state = match action {
            PlayerAction::KeyPressed {
                accuracy,
                timestamp,
                ..
            } => self.calculate_from_key_press(*accuracy, *timestamp, previous_state),
            PlayerAction::Dash { timestamp, .. } => self.calculate_from_dash(*timestamp, previous_state),
            PlayerAction::Parry { timestamp } => self.calculate_from_parry(*timestamp, previous_state),
            PlayerAction::ActivateUltimate { timestamp } => self.calculate_from_ultimate_activation(*timestamp, previous_state),
            PlayerAction::DeactivateUltimate { timestamp } => self.calculate_from_ultimate_deactivation(*timestamp, previous_state),
            PlayerAction::Move { .. } => *previous_state, // Movement doesn't affect qualia
        };

        // Clamp all values to [0.0, 1.0]
        Ok(Self::clamp_state(new_state))
    }

    fn apply_decay(&self, state: &QualiaState, dt: f32) -> QualiaState {
        let decay_rate = self.config.harmony_decay_rate * dt;

        QualiaState {
            intensity: (state.intensity - decay_rate).max(0.0),
            precision: (state.precision - decay_rate * 0.5).max(0.0),
            aggression: (state.aggression - decay_rate * 0.3).max(0.0),
            flow: (state.flow - decay_rate * 0.7).max(0.0),
            chaos: (state.chaos - decay_rate * 1.5).max(0.0), // Chaos decays faster
            recovery: (state.recovery - decay_rate * 0.5).max(0.0),
            transcendence: state.transcendence, // Transcendence doesn't decay naturally
            collection_window_end: state.collection_window_end,
        }
    }

    fn get_combo_multiplier(&self, combo: u32) -> f32 {
        let base_multiplier = self.config.combo_multiplier;
        1.0 + (combo as f32 * base_multiplier).min(3.0) // Cap at 4x total (1 + 3)
    }
}

impl QualiaProcessorService {
    /// # Responsibility
    /// Calculate qualia from key press action.
    fn calculate_from_key_press(
        &self,
        accuracy: f32,
        timestamp: f64,
        previous: &QualiaState,
    ) -> QualiaState {
        let intensity_boost = accuracy * self.config.base_intensity_multiplier;

        QualiaState {
            intensity: (previous.intensity + intensity_boost).min(1.0),
            precision: (previous.precision + accuracy * 0.1).min(1.0),
            aggression: previous.aggression,
            flow: (previous.flow + accuracy * 0.15).min(1.0),
            chaos: if accuracy < 0.5 {
                (previous.chaos + (1.0 - accuracy) * 0.2).min(1.0)
            } else {
                previous.chaos
            },
            recovery: previous.recovery,
            transcendence: previous.transcendence,
            collection_window_end: timestamp + 1000.0, // 1 second window
        }
    }

    /// # Responsibility
    /// Calculate qualia from dash action.
    #[allow(clippy::unused_self)]
    fn calculate_from_dash(&self, timestamp: f64, previous: &QualiaState) -> QualiaState {
        QualiaState {
            intensity: (previous.intensity + 0.1).min(1.0),
            precision: previous.precision,
            aggression: (previous.aggression + 0.2).min(1.0),
            flow: previous.flow,
            chaos: previous.chaos,
            recovery: previous.recovery,
            transcendence: previous.transcendence,
            collection_window_end: timestamp,
        }
    }

    /// # Responsibility
    /// Calculate qualia from parry action.
    #[allow(clippy::unused_self)]
    fn calculate_from_parry(&self, timestamp: f64, previous: &QualiaState) -> QualiaState {
        QualiaState {
            intensity: (previous.intensity + 0.15).min(1.0),
            precision: (previous.precision + 0.3).min(1.0),
            aggression: previous.aggression,
            flow: (previous.flow + 0.2).min(1.0),
            chaos: (previous.chaos - 0.2).max(0.0), // Parry reduces chaos
            recovery: previous.recovery,
            transcendence: previous.transcendence,
            collection_window_end: timestamp,
        }
    }

    /// # Responsibility
    /// Calculate qualia from ultimate activation.
    #[allow(clippy::unused_self)]
    const fn calculate_from_ultimate_activation(&self, timestamp: f64, previous: &QualiaState) -> QualiaState {
        QualiaState {
            intensity: 1.0, // Max intensity
            precision: previous.precision,
            aggression: 1.0, // Max aggression
            flow: previous.flow,
            chaos: previous.chaos,
            recovery: previous.recovery,
            transcendence: 1.0, // Transcendence active
            collection_window_end: timestamp,
        }
    }

    /// # Responsibility
    /// Calculate qualia from ultimate deactivation.
    #[allow(clippy::unused_self)]
    fn calculate_from_ultimate_deactivation(&self, timestamp: f64, previous: &QualiaState) -> QualiaState {
        QualiaState {
            intensity: previous.intensity * 0.5, // Drop to half
            precision: previous.precision,
            aggression: previous.aggression * 0.5,
            flow: previous.flow,
            chaos: previous.chaos,
            recovery: previous.recovery,
            transcendence: 0.0, // Transcendence inactive
            collection_window_end: timestamp,
        }
    }

    /// # Responsibility
    /// Clamp all qualia values to valid range [0.0, 1.0].
    const fn clamp_state(state: QualiaState) -> QualiaState {
        QualiaState {
            intensity: state.intensity.clamp(0.0, 1.0),
            precision: state.precision.clamp(0.0, 1.0),
            aggression: state.aggression.clamp(0.0, 1.0),
            flow: state.flow.clamp(0.0, 1.0),
            chaos: state.chaos.clamp(0.0, 1.0),
            recovery: state.recovery.clamp(0.0, 1.0),
            transcendence: state.transcendence.clamp(0.0, 1.0),
            collection_window_end: state.collection_window_end,
        }
    }
}

impl Default for QualiaProcessorService {
    fn default() -> Self {
        Self {
            config: Arc::new(GameLogicConfig::default()),
            logger: Arc::new(crate::services::core::QualiaLogger),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::GameLogicConfig;
    use crate::services::tests::mocks::MockLogger;
    use shared_core::utils::Vec2;

    fn create_test_processor() -> QualiaProcessorService {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());

        QualiaProcessorService {
            config: Arc::new(GameLogicConfig {
                base_intensity_multiplier: 1.0,
                harmony_decay_rate: 0.1,
                chaos_threshold: 0.5,
                combo_multiplier: 0.1,
                combo_threshold: 5,
                max_combo: 100,
            }),
            logger: Arc::new(mock_logger),
        }
    }

    fn default_qualia_state() -> QualiaState {
        QualiaState {
            intensity: 0.5,
            precision: 0.5,
            aggression: 0.5,
            flow: 0.5,
            chaos: 0.5,
            recovery: 0.5,
            transcendence: 0.0,
            collection_window_end: 1000.0,
        }
    }

    #[tokio::test]
    async fn test_calculate_qualia_from_high_accuracy_key_press() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95,
        };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.intensity > previous.intensity, "High accuracy should increase intensity");
        assert!(new_state.precision > previous.precision, "High accuracy should increase precision");
        assert!(new_state.flow > previous.flow, "High accuracy should increase flow");
        assert!(new_state.chaos <= previous.chaos, "High accuracy should not increase chaos");
    }

    #[tokio::test]
    async fn test_calculate_qualia_from_low_accuracy_key_press() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.2,
        };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.chaos > previous.chaos, "Low accuracy should increase chaos");
    }

    #[tokio::test]
    async fn test_calculate_qualia_from_dash() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::Dash {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 1000.0,
        };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.aggression > previous.aggression, "Dash should increase aggression");
        assert!(new_state.intensity > previous.intensity, "Dash should increase intensity");
    }

    #[tokio::test]
    async fn test_calculate_qualia_from_parry() {
        let processor = create_test_processor();
        let previous = QualiaState {
            chaos: 0.8,
            ..default_qualia_state()
        };
        let action = PlayerAction::Parry { timestamp: 1000.0 };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.precision > previous.precision, "Parry should increase precision");
        assert!(new_state.chaos < previous.chaos, "Parry should reduce chaos");
        assert!(new_state.flow > previous.flow, "Parry should increase flow");
    }

    #[tokio::test]
    async fn test_calculate_qualia_from_ultimate_activation() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::ActivateUltimate { timestamp: 1000.0 };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert_eq!(new_state.intensity, 1.0, "Ultimate should maximize intensity");
        assert_eq!(new_state.aggression, 1.0, "Ultimate should maximize aggression");
        assert_eq!(new_state.transcendence, 1.0, "Ultimate should activate transcendence");
    }

    #[tokio::test]
    async fn test_calculate_qualia_from_ultimate_deactivation() {
        let processor = create_test_processor();
        let previous = QualiaState {
            intensity: 1.0,
            aggression: 1.0,
            transcendence: 1.0,
            ..default_qualia_state()
        };
        let action = PlayerAction::DeactivateUltimate { timestamp: 1000.0 };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.intensity < previous.intensity, "Deactivation should reduce intensity");
        assert!(new_state.aggression < previous.aggression, "Deactivation should reduce aggression");
        assert_eq!(new_state.transcendence, 0.0, "Transcendence should deactivate");
    }

    #[tokio::test]
    async fn test_movement_does_not_affect_qualia() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::Move {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 1000.0,
        };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert_eq!(new_state, previous, "Movement should not change qualia state");
    }

    #[test]
    fn test_apply_decay_reduces_values() {
        let processor = create_test_processor();
        let state = QualiaState {
            intensity: 1.0,
            precision: 1.0,
            aggression: 1.0,
            flow: 1.0,
            chaos: 1.0,
            recovery: 1.0,
            transcendence: 1.0,
            collection_window_end: 1000.0,
        };

        let decayed = processor.apply_decay(&state, 1.0);

        assert!(decayed.intensity < state.intensity, "Intensity should decay");
        assert!(decayed.precision < state.precision, "Precision should decay");
        assert!(decayed.aggression < state.aggression, "Aggression should decay");
        assert!(decayed.flow < state.flow, "Flow should decay");
        assert!(decayed.chaos < state.chaos, "Chaos should decay (faster)");
        assert!(decayed.recovery < state.recovery, "Recovery should decay");
        assert_eq!(decayed.transcendence, state.transcendence, "Transcendence should not decay");
    }

    #[test]
    fn test_apply_decay_never_goes_negative() {
        let processor = create_test_processor();
        let state = QualiaState {
            intensity: 0.01,
            precision: 0.01,
            aggression: 0.01,
            flow: 0.01,
            chaos: 0.01,
            recovery: 0.01,
            transcendence: 0.0,
            collection_window_end: 1000.0,
        };

        // Apply massive decay
        let decayed = processor.apply_decay(&state, 100.0);

        assert!(decayed.intensity >= 0.0, "Intensity should not go negative");
        assert!(decayed.precision >= 0.0, "Precision should not go negative");
        assert!(decayed.aggression >= 0.0, "Aggression should not go negative");
        assert!(decayed.flow >= 0.0, "Flow should not go negative");
        assert!(decayed.chaos >= 0.0, "Chaos should not go negative");
        assert!(decayed.recovery >= 0.0, "Recovery should not go negative");
    }

    #[test]
    fn test_get_combo_multiplier_scales_correctly() {
        let processor = create_test_processor();

        assert_eq!(processor.get_combo_multiplier(0), 1.0);
        assert!(processor.get_combo_multiplier(10) > 1.0);
        assert!(processor.get_combo_multiplier(20) > processor.get_combo_multiplier(10));

        // Should cap at 4x (1 + 3)
        let max_multiplier = processor.get_combo_multiplier(100);
        assert!(max_multiplier <= 4.0, "Multiplier should cap at 4x");
    }

    #[test]
    fn test_clamp_state_enforces_valid_range() {
        let invalid_state = QualiaState {
            intensity: 1.5,
            precision: -0.5,
            aggression: 2.0,
            flow: 1.2,
            chaos: -1.0,
            recovery: 3.0,
            transcendence: 1.8,
            collection_window_end: 1000.0,
        };

        let clamped = QualiaProcessorService::clamp_state(invalid_state);

        assert_eq!(clamped.intensity, 1.0, "Should clamp to 1.0");
        assert_eq!(clamped.precision, 0.0, "Should clamp to 0.0");
        assert_eq!(clamped.aggression, 1.0, "Should clamp to 1.0");
        assert_eq!(clamped.flow, 1.0, "Should clamp to 1.0");
        assert_eq!(clamped.chaos, 0.0, "Should clamp to 0.0");
        assert_eq!(clamped.recovery, 1.0, "Should clamp to 1.0");
        assert_eq!(clamped.transcendence, 1.0, "Should clamp to 1.0");
    }

    #[tokio::test]
    async fn test_zero_accuracy_produces_valid_qualia() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.0, // Edge case: zero accuracy
        };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.intensity.is_finite(), "Intensity should be finite");
        assert!(new_state.precision.is_finite(), "Precision should be finite");
        assert!(new_state.chaos.is_finite(), "Chaos should be finite");
        assert!(new_state.intensity >= 0.0 && new_state.intensity <= 1.0);
    }

    #[tokio::test]
    async fn test_perfect_accuracy_produces_valid_qualia() {
        let processor = create_test_processor();
        let previous = default_qualia_state();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 1.0, // Edge case: perfect accuracy
        };

        let result = processor.calculate_qualia(&action, &previous).await;
        assert!(result.is_ok());

        let new_state = result.unwrap();
        assert!(new_state.intensity >= 0.0 && new_state.intensity <= 1.0);
        assert!(new_state.precision >= 0.0 && new_state.precision <= 1.0);
    }
}

//! # Responsibility
//! Calculates QualiaState from PlayerAction with accuracy scoring and modifiers.
//!
//! ---
//!
//! This service encapsulates the core qualia calculation math, applying
//! combos, accuracy, timing, and decay logic according to GDD.md rules.

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

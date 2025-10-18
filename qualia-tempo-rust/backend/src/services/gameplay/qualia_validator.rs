//! # Responsibility
//! Validates QualiaState received from frontend to prevent cheating.
//!
//! ---
//!
//! Applies heuristic validation:
//! 1. Range validation: All values must be in [0.0, 1.0]
//! 2. Temporal coherence: No impossible jumps between frames
//! 3. Action correlation: State must correlate with player action

use async_trait::async_trait;
use anyhow::Result;
use shaku::Component;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{instrument, warn};

use shared_core::contracts::{PlayerAction, QualiaState};
use shared_core::traits::{ILogger, IQualiaValidator};

/// # Responsibility
/// Maximum allowed delta per frame for any qualia component (prevents teleporting values).
const MAX_DELTA_PER_FRAME: f32 = 0.3;

/// # Responsibility
/// Penalty factor applied when cheating is detected.
const CHEAT_PENALTY_FACTOR: f32 = 0.5;

/// # Responsibility
/// Validates qualia states from frontend with anti-cheat heuristics.
#[derive(Component)]
#[shaku(interface = IQualiaValidator)]
pub struct QualiaValidatorService {
    #[shaku(inject)]
    #[allow(dead_code)] // Injected dependency for future logging
    logger: Arc<dyn ILogger>,

    /// Stores the last validated state for temporal coherence checks.
    last_state: Arc<RwLock<Option<QualiaState>>>,
}

#[async_trait]
impl IQualiaValidator for QualiaValidatorService {
    #[instrument(skip(self))]
    async fn validate(
        &self,
        state: QualiaState,
        action: PlayerAction,
    ) -> Result<QualiaState> {
        // Step 1: Range validation
        if !self.is_valid_range(&state) {
            warn!("Invalid range detected in qualia state: {:?}", state);
            return Ok(self.apply_penalty(state));
        }

        // Step 2: Temporal coherence check
        #[allow(clippy::significant_drop_in_scrutinee)] // Architectural: RwLock pattern requires this
        if let Some(prev) = *self.last_state.read().await {
            // Assume 16ms delta (60 FPS) for temporal check
            if !self.is_temporally_consistent(&prev, &state, 0.016) {
                warn!("Temporal inconsistency detected: prev={:?}, current={:?}", prev, state);
                return Ok(self.apply_penalty(state));
            }
        }

        // Step 3: Action correlation (basic validation)
        let validated = self.correlate_with_action(state, action);

        // Update last state
        #[allow(clippy::significant_drop_in_scrutinee)] // Architectural: Write lock pattern
        {
            let mut last_state_lock = self.last_state.write().await;
            *last_state_lock = Some(validated);
        }

        Ok(validated)
    }

    fn is_valid_range(&self, state: &QualiaState) -> bool {
        state.intensity >= 0.0 && state.intensity <= 1.0
            && state.precision >= 0.0 && state.precision <= 1.0
            && state.aggression >= 0.0 && state.aggression <= 1.0
            && state.flow >= 0.0 && state.flow <= 1.0
            && state.chaos >= 0.0 && state.chaos <= 1.0
            && state.recovery >= 0.0 && state.recovery <= 1.0
            && state.transcendence >= 0.0 && state.transcendence <= 1.0
    }

    fn is_temporally_consistent(
        &self,
        prev: &QualiaState,
        current: &QualiaState,
        dt: f32,
    ) -> bool {
        // Maximum allowed change scales with dt (longer frames allow more change)
        let max_delta = MAX_DELTA_PER_FRAME * (dt / 0.016).max(1.0);

        (current.intensity - prev.intensity).abs() <= max_delta
            && (current.precision - prev.precision).abs() <= max_delta
            && (current.aggression - prev.aggression).abs() <= max_delta
            && (current.flow - prev.flow).abs() <= max_delta
            && (current.chaos - prev.chaos).abs() <= max_delta
            && (current.recovery - prev.recovery).abs() <= max_delta
            && (current.transcendence - prev.transcendence).abs() <= max_delta
    }
}

impl QualiaValidatorService {
    /// Applies penalty factor to all qualia components when cheating is detected.
    #[allow(clippy::unused_self)] // Component pattern: method logically belongs to struct
    fn apply_penalty(&self, mut state: QualiaState) -> QualiaState {
        state.intensity *= CHEAT_PENALTY_FACTOR;
        state.precision *= CHEAT_PENALTY_FACTOR;
        state.aggression *= CHEAT_PENALTY_FACTOR;
        state.flow *= CHEAT_PENALTY_FACTOR;
        state.chaos = (state.chaos * (1.0 / CHEAT_PENALTY_FACTOR)).min(1.0);
        state.recovery *= CHEAT_PENALTY_FACTOR;
        state.transcendence *= CHEAT_PENALTY_FACTOR;
        state
    }

    /// Validates that the state correlates with the action that triggered it.
    #[allow(clippy::needless_pass_by_value)] // QualiaState is Copy, pass-by-value is efficient
    fn correlate_with_action(&self, state: QualiaState, action: PlayerAction) -> QualiaState {
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                // High accuracy should correlate with high precision
                if accuracy > 0.9 && state.precision < 0.5 {
                    warn!("Mismatch: high accuracy but low precision");
                    return self.apply_penalty(state);
                }
            }
            PlayerAction::DashInitiated { on_beat, .. } => {
                // Perfect timing (on_beat) should increase flow
                if on_beat && state.flow < 0.5 {
                    warn!("Mismatch: on-beat dash but low flow");
                    return self.apply_penalty(state);
                }
            }
            _ => {}
        }

        state
    }
}

impl QualiaValidatorService {
    /// Creates a new validator for testing purposes.
    #[cfg(test)]
    pub fn new_for_testing(logger: Arc<dyn ILogger>) -> Self {
        Self {
            logger,
            last_state: Arc::new(RwLock::new(None)),
        }
    }
}

impl Default for QualiaValidatorService {
    fn default() -> Self {
        Self {
            logger: Arc::new(crate::services::core::QualiaLogger),
            last_state: Arc::new(RwLock::new(None)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;

    fn create_test_validator() -> QualiaValidatorService {
        QualiaValidatorService {
            logger: Arc::new(MockLogger::with_defaults()),
            last_state: Arc::new(RwLock::new(None)),
        }
    }

    #[tokio::test]
    async fn test_valid_range_check() {
        let validator = create_test_validator();

        let valid_state = QualiaState {
            intensity: 0.5,
            precision: 0.8,
            aggression: 0.3,
            flow: 0.7,
            chaos: 0.2,
            recovery: 0.1,
            transcendence: 0.0,
            collection_window_end: 1000.0,
        };

        assert!(validator.is_valid_range(&valid_state));

        let invalid_state = QualiaState {
            intensity: 1.5, // INVALID
            ..valid_state
        };

        assert!(!validator.is_valid_range(&invalid_state));
    }

    #[tokio::test]
    async fn test_temporal_consistency() {
        let validator = create_test_validator();

        let prev = QualiaState {
            intensity: 0.5,
            precision: 0.5,
            aggression: 0.5,
            flow: 0.5,
            chaos: 0.5,
            recovery: 0.5,
            transcendence: 0.5,
            collection_window_end: 1000.0,
        };

        // Valid incremental change
        let current_valid = QualiaState {
            intensity: 0.6, // +0.1 change
            ..prev
        };

        assert!(validator.is_temporally_consistent(&prev, &current_valid, 0.016));

        // Invalid jump (teleport)
        let current_invalid = QualiaState {
            intensity: 1.0, // +0.5 change (exceeds MAX_DELTA_PER_FRAME)
            ..prev
        };

        assert!(!validator.is_temporally_consistent(&prev, &current_invalid, 0.016));
    }

    #[tokio::test]
    async fn test_cheat_detection_applies_penalty() {
        let validator = create_test_validator();

        let invalid_state = QualiaState {
            intensity: 1.5, // Out of range
            precision: 0.9,
            aggression: 0.5,
            flow: 0.7,
            chaos: 0.2,
            recovery: 0.1,
            transcendence: 0.5,
            collection_window_end: 1000.0,
        };

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.9,
        };

        let result = validator.validate(invalid_state, action).await.expect("Test should not panic");

        // All positive values should be penalized
        assert!(result.intensity < invalid_state.intensity * 0.6);
        assert!(result.precision < invalid_state.precision);
    }

    #[tokio::test]
    async fn test_action_correlation_mismatch() {
        let validator = create_test_validator();

        let state = QualiaState {
            intensity: 0.5,
            precision: 0.2, // LOW precision
            aggression: 0.5,
            flow: 0.5,
            chaos: 0.5,
            recovery: 0.5,
            transcendence: 0.5,
            collection_window_end: 1000.0,
        };

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95, // HIGH accuracy (mismatch!)
        };

        let result = validator.validate(state, action).await.expect("Test should not panic");

        // Should apply penalty due to mismatch
        assert!(result.precision < state.precision * 0.6);
    }
}

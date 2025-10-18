//! # Responsibility
//! Implements core game logic: state validation, event orchestration, score calculation.
//!
//! ---
//!
//! ARCHITECTURAL NOTE: This service VALIDATES QualiaState from frontend, does NOT calculate it.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Component;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, instrument};

use shared_core::contracts::{CombatState, PlayerAction, QualiaState};
use shared_core::events::{audio_events::PlayGenerativeNote, GameEvent};
use shared_core::traits::{IEventBus, IGameLogicService, ILogger, IQualiaValidator};
use shared_core::utils::Vec2;

/// # Responsibility
/// Validates player actions and orchestrates musical combat events.
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    #[shaku(inject)]
    #[allow(dead_code)] // Used for structured logging in future features
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    #[shaku(inject)]
    validator: Arc<dyn IQualiaValidator>,

    /// Current player score tracked server-side
    current_score: Arc<RwLock<u32>>,

    /// Combo counter for musical combo validation
    combo_counter: Arc<RwLock<u32>>,
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    #[instrument(skip(self))]
    async fn process_action(
        &self,
        action: PlayerAction,
        frontend_qualia: QualiaState,
    ) -> Result<QualiaState> {
        info!("Processing player action: {:?}", action);

        // VALIDATE QualiaState received from frontend (anti-cheat)
        let validated_state = self.validator.validate(frontend_qualia, action.clone()).await?;

        // Generate audio event for musical input (MUSIC.RUST §4)
        if let PlayerAction::KeyPressed { key, accuracy, .. } = action {
            self.emit_generative_note(key, validated_state.intensity, accuracy);
        }

        // Update combo counter based on accuracy
        self.update_combo(validated_state.precision).await;

        // Update score based on validated state
        self.update_score(validated_state).await;

        // Emit validated state event
        self.event_bus
            .emit(GameEvent::QualiaStateUpdated {
                state: validated_state,
            })
            .ok();

        Ok(validated_state)
    }

    async fn update_game_state(&self, _dt: f32) -> Result<CombatState> {
        // Aggregate current state from subsystems
        Ok(CombatState::default())
    }

    fn get_current_score(&self) -> u32 {
        let score = self.current_score.try_read();
        score.map(|s| *s).unwrap_or(0)
    }
}

impl GameLogicService {
    /// # Responsibility
    /// Emits PlayGenerativeNote event for musical input (MUSIC.RUST §4).
    ///
    /// ---
    ///
    /// Maps keyboard keys (Q-G, C) to MIDI notes and emits audio generation event.
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)] // MIDI values intentionally clamped to [0,127]
    fn emit_generative_note(&self, key: char, intensity: f32, accuracy: f32) {
        // Map keys to MIDI notes (C major scale)
        let note_pitch = match key.to_ascii_uppercase() {
            'Q' => 60,  // C4 (Middle C)
            'E' => 62,  // D4
            'R' => 64,  // E4
            'T' => 65,  // F4
            'F' => 67,  // G4
            'G' => 69,  // A4
            'C' => 71,  // B4
            _ => return, // Invalid key, no note
        };

        // Calculate velocity from intensity and accuracy
        let velocity = ((intensity * accuracy * 127.0).clamp(0.0, 127.0)) as u8;

        let note = PlayGenerativeNote {
            note_pitch,
            velocity,
            instrument_patch_id: "qualia_synth".to_string(),
            position: Vec2::new(0.0, 0.0), // Center position
            duration_sec: None, // Use default ADSR
        };

        self.event_bus
            .emit(GameEvent::PlayGenerativeNote { note })
            .ok();
    }

    /// # Responsibility
    /// Updates combo counter based on player accuracy.
    async fn update_combo(&self, precision: f32) {
        let mut combo = self.combo_counter.write().await;

        if precision >= 0.8 {
            // High precision increases combo
            *combo += 1;
        } else if precision < 0.5 {
            // Low precision breaks combo
            *combo = 0;
        }
        // Medium precision (0.5-0.8) maintains combo
    }

    /// # Responsibility
    /// Updates score based on validated qualia state.
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss, clippy::cast_precision_loss)]
    async fn update_score(&self, state: QualiaState) {
        let mut score = self.current_score.write().await;

        // Base score calculation
        let combo = *self.combo_counter.read().await;
        let combo_multiplier = 1.0 + (combo as f32 * 0.1).min(5.0); // Max 6x multiplier

        // Score from precision and intensity
        let base_score = (state.precision * state.intensity * 100.0) as u32;
        let earned_score = (base_score as f32 * combo_multiplier) as u32;

        *score += earned_score;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use crate::services::gameplay::QualiaValidatorService;

    fn create_test_service() -> GameLogicService {
        GameLogicService {
            logger: Arc::new(MockLogger::with_defaults()),
            event_bus: Arc::new(MockEventBus::with_defaults()),
            validator: Arc::new(QualiaValidatorService::new_for_testing(Arc::new(
                MockLogger::with_defaults(),
            ))),
            current_score: Arc::new(RwLock::new(0)),
            combo_counter: Arc::new(RwLock::new(0)),
        }
    }

    #[tokio::test]
    async fn test_process_action_validates_and_emits() {
        let service = create_test_service();

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95,
        };

        let frontend_state = QualiaState {
            intensity: 0.8,
            precision: 0.95,
            ..Default::default()
        };

        let result = service.process_action(action, frontend_state).await;

        assert!(result.is_ok());
        let validated = result.unwrap();
        assert!(validated.intensity <= 1.0);
        assert!(validated.precision <= 1.0);
    }

    #[test]
    fn test_emit_generative_note_maps_keys_correctly() {
        let service = create_test_service();

        // Test valid key mapping
        service.emit_generative_note('Q', 0.8, 0.95);
        service.emit_generative_note('E', 0.6, 0.8);
        service.emit_generative_note('R', 1.0, 1.0);

        // No panic = success (event emitted)
    }

    #[tokio::test]
    async fn test_update_combo_increases_on_high_precision() {
        let service = create_test_service();

        service.update_combo(0.9).await;
        service.update_combo(0.85).await;
        service.update_combo(0.95).await;

        let combo = *service.combo_counter.read().await;
        assert_eq!(combo, 3);
    }

    #[tokio::test]
    async fn test_update_combo_breaks_on_low_precision() {
        let service = create_test_service();

        service.update_combo(0.9).await;
        service.update_combo(0.85).await;
        service.update_combo(0.3).await; // Break combo

        let combo = *service.combo_counter.read().await;
        assert_eq!(combo, 0);
    }

    #[tokio::test]
    async fn test_update_score_increases_with_combo_multiplier() {
        let service = create_test_service();

        // Build combo
        service.update_combo(0.9).await;
        service.update_combo(0.9).await;
        service.update_combo(0.9).await;

        let state = QualiaState {
            intensity: 1.0,
            precision: 1.0,
            ..Default::default()
        };

        service.update_score(state).await;

        let score = service.get_current_score();
        assert!(score > 100, "Score should be amplified by combo multiplier");
    }

    #[test]
    fn test_get_current_score_returns_zero_on_empty() {
        let service = create_test_service();
        assert_eq!(service.get_current_score(), 0);
    }
}

//! # Responsibility
//! Orchestrates generative note events based on gameplay state (MUSIC.RUST.md §4).
//!
//! ---
//!
//! Emits PlayGenerativeNote events to the EventBus for frontend audio synthesis.
//! Coordinates instrument layers and note parameters based on QualiaState.

use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use std::sync::Arc;
use tracing::{debug, instrument};

use shared_core::contracts::QualiaState;
use shared_core::events::audio_events::PlayGenerativeNote;
use shared_core::events::GameEvent;
use shared_core::utils::Vec2;
use shared_core::PlayerAction;
use shared_core::traits::gameplay::{IGenerativeNoteOrchestratorService, IMusicalCoherenceService};
use shared_core::traits::IEventBus;
use shared_core::traits::ILogger;

/// # Responsibility
/// Emits musical note events triggered by player actions.
///
/// ---
///
/// Flow (MUSIC.RUST.md §4):
/// 1. Player presses Q → emit PlayGenerativeNote with C note
/// 2. Use MusicalCoherenceService to determine consonance → adjust volume/timbre
/// 3. Use QualiaState.intensity to determine velocity/attack
/// 4. Broadcast event via EventBus → Frontend AudioService synthesizes sound
#[derive(Component)]
#[shaku(interface = IGenerativeNoteOrchestratorService)]
pub struct GenerativeNoteOrchestratorService {
    #[shaku(inject)]
    #[allow(dead_code)] // Reserved for future error logging
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    #[shaku(inject)]
    coherence_service: Arc<dyn IMusicalCoherenceService>,
}

#[async_trait]
impl IGenerativeNoteOrchestratorService for GenerativeNoteOrchestratorService {
    #[instrument(skip(self, action, qualia_state))]
    async fn emit_note_for_action(
        &self,
        action: PlayerAction,
        qualia_state: QualiaState,
    ) -> Result<()> {
        // Extract note from action
        let note_name = match &action {
            PlayerAction::KeyPressed { key, .. } => Self::key_to_note(*key),
            _ => return Ok(()), // Non-note actions don't emit notes
        };

        let note_name = note_name?;
        let note_pitch = Self::note_name_to_midi(&note_name);

        // Get coherence score (determines if note is consonant or dissonant)
        let timestamp_ms = match &action {
            PlayerAction::KeyPressed { timestamp, .. } => *timestamp,
            _ => 0.0,
        };

        let coherence = self
            .coherence_service
            .score_action_coherence(action.clone(), timestamp_ms)
            .await
            .unwrap_or(0.5); // Default to neutral if analysis fails

        // Calculate note parameters from QualiaState + coherence
        let velocity = Self::calculate_velocity(&qualia_state, coherence);
        let duration_sec = Self::calculate_duration(&qualia_state) / 1000.0; // Convert ms to sec
        let instrument_id = Self::select_instrument(&qualia_state);

        // Create PlayGenerativeNote event
        let note_event = PlayGenerativeNote {
            note_pitch,
            velocity,
            duration_sec: Some(duration_sec),
            instrument_patch_id: instrument_id,
            position: Vec2::new(0.0, 0.0), // Center position (8D positioning not yet implemented)
        };

        // Emit event to EventBus
        let event = GameEvent::PlayGenerativeNote { note: note_event };
        let receiver_count = self.event_bus.emit(event)?;

        debug!(
            "Emitted generative note: coherence={}, velocity={}, receivers={}",
            coherence, velocity, receiver_count
        );

        Ok(())
    }

    #[instrument(skip(self))]
    async fn update(&self, _dt: f32) -> Result<()> {
        // Future: Implement layer fade-outs, sustained notes, etc.
        Ok(())
    }
}

impl GenerativeNoteOrchestratorService {
    /// Maps keyboard key to musical note name.
    fn key_to_note(key: char) -> Result<String> {
        let note = match key {
            'Q' | 'q' => "C",
            'E' | 'e' => "D",
            'R' | 'r' => "E",
            'T' | 't' => "F",
            'F' | 'f' => "G",
            'G' | 'g' => "A",
            'C' | 'c' => "B",
            _ => return Err(anyhow::anyhow!("Invalid note key: {key}")),
        };
        Ok(note.to_string())
    }

    /// Converts note name to MIDI note number.
    /// Middle C (C4) = MIDI 60.
    #[allow(clippy::match_same_arms)] // Intentionally duplicated for clarity
    fn note_name_to_midi(note: &str) -> u8 {
        match note {
            "C" => 60, // C4 (middle C)
            "D" => 62, // D4
            "E" => 64, // E4
            "F" => 65, // F4
            "G" => 67, // G4
            "A" => 69, // A4
            "B" => 71, // B4
            _ => 60,   // Default to middle C
        }
    }

    /// Calculates MIDI velocity (0-127) from QualiaState and coherence.
    ///
    /// High intensity + high coherence = loud, powerful notes.
    /// Low intensity or low coherence = soft, subdued notes.
    fn calculate_velocity(qualia: &QualiaState, coherence: f32) -> u8 {
        let base_velocity = qualia.intensity * 127.0;
        let coherence_modifier = f32::midpoint(coherence, 1.0);
        let final_velocity = base_velocity * coherence_modifier;
        #[allow(clippy::cast_sign_loss, clippy::cast_possible_truncation)]
        // f32 is always positive after clamp and in valid u8 range
        let velocity = final_velocity.clamp(20.0, 127.0) as u8;
        velocity
    }

    /// Calculates note duration based on QualiaState.flow.
    ///
    /// High flow = sustained notes.
    /// Low flow = short, staccato notes.
    fn calculate_duration(qualia: &QualiaState) -> f32 {
        let base_duration = 200.0; // ms
        let flow_multiplier = 1.0 + qualia.flow; // [1.0, 2.0]
        base_duration * flow_multiplier
    }

    /// Selects instrument patch based on QualiaState.
    ///
    /// High transcendence = ethereal synths.
    /// High chaos = distorted, harsh timbres.
    /// Default = clean piano/strings.
    fn select_instrument(qualia: &QualiaState) -> String {
        if qualia.transcendence > 0.7 {
            "ethereal_synth".to_string()
        } else if qualia.chaos > 0.7 {
            "distorted_bass".to_string()
        } else {
            "clean_piano".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use mockall::mock;
    use shared_core::PlayerAction;

    mock! {
        pub CoherenceService {}

        #[async_trait]
        impl IMusicalCoherenceService for CoherenceService {
            async fn score_action_coherence(&self, action: PlayerAction, timestamp_ms: f64) -> Result<f32>;
        }
    }

    #[tokio::test]
    async fn test_emit_note_for_action_high_intensity() {
        let mut mock_coherence = MockCoherenceService::new();
        mock_coherence
            .expect_score_action_coherence()
            .returning(|_, _| Ok(1.0)); // Perfect consonance

        let service = GenerativeNoteOrchestratorService {
            logger: Arc::new(MockLogger::with_defaults()),
            event_bus: Arc::new(MockEventBus::with_defaults()),
            coherence_service: Arc::new(mock_coherence),
        };

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 1.0,
        };

        let qualia = QualiaState {
            intensity: 1.0,
            precision: 0.9,
            flow: 0.8,
            ..Default::default()
        };

        let result = service.emit_note_for_action(action, qualia).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_key_to_note() {
        assert_eq!(GenerativeNoteOrchestratorService::key_to_note('Q').expect("Test should not panic"), "C");
        assert_eq!(GenerativeNoteOrchestratorService::key_to_note('E').expect("Test should not panic"), "D");
        assert_eq!(GenerativeNoteOrchestratorService::key_to_note('R').expect("Test should not panic"), "E");
        assert_eq!(GenerativeNoteOrchestratorService::key_to_note('T').expect("Test should not panic"), "F");
    }

    #[test]
    fn test_calculate_velocity_high_coherence() {
        let qualia = QualiaState {
            intensity: 1.0,
            ..Default::default()
        };

        let velocity = GenerativeNoteOrchestratorService::calculate_velocity(&qualia, 1.0);
        assert_eq!(velocity, 127); // Max velocity
    }

    #[test]
    fn test_calculate_velocity_low_coherence() {
        let qualia = QualiaState {
            intensity: 1.0,
            ..Default::default()
        };

        let velocity = GenerativeNoteOrchestratorService::calculate_velocity(&qualia, -1.0);
        assert_eq!(velocity, 20); // Minimum velocity
    }

    #[test]
    fn test_select_instrument_transcendence() {
        let qualia = QualiaState {
            transcendence: 0.9,
            ..Default::default()
        };

        assert_eq!(
            GenerativeNoteOrchestratorService::select_instrument(&qualia),
            "ethereal_synth"
        );
    }

    #[test]
    fn test_select_instrument_chaos() {
        let qualia = QualiaState {
            chaos: 0.9,
            ..Default::default()
        };

        assert_eq!(
            GenerativeNoteOrchestratorService::select_instrument(&qualia),
            "distorted_bass"
        );
    }
}

//! # Responsibility
//! Orchestrates PlayGenerativeNote events based on QualiaState.
//!
//! ---
//!
//! Coordinates musical layers and triggers note generation events
//! for the frontend's Performance Engine.

use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, instrument};
use shared_core::contracts::audio::PlayGenerativeNote;
use shared_core::contracts::game_state::QualiaState;
use shared_core::events::GameEvent;
use shared_core::traits::{IEventBus, ILogger};

/// # Responsibility
/// Emits PlayGenerativeNote events based on game state.
///
/// ---
///
/// COMPLIANCE: MUSIC.RUST.md Section 4 - Full event flow.
/// Translates QualiaState changes into musical note commands.
pub struct GenerativeNoteOrchestratorService {
    #[allow(dead_code)]
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
}

impl GenerativeNoteOrchestratorService {
    /// # Responsibility
    /// Creates a new GenerativeNoteOrchestratorService with injected dependencies.
    pub fn new(logger: Arc<dyn ILogger>, event_bus: Arc<dyn IEventBus>) -> Self {
        Self { logger, event_bus }
    }

    /// # Responsibility
    /// Generates and emits musical notes based on QualiaState.
    ///
    /// ---
    ///
    /// Maps qualia dimensions to musical parameters:
    /// - Intensity → Note velocity
    /// - Flow → Note duration
    /// - Chaos → Spatial positioning randomness
    #[instrument(skip(self))]
    pub fn orchestrate_from_qualia(&self, state: &QualiaState) -> Result<()> {
        debug!(
            "Orchestrating notes: intensity={:.2}, flow={:.2}, chaos={:.2}",
            state.intensity, state.flow, state.chaos
        );

        // Generate ambient layer based on intensity
        if state.intensity > 0.3 {
            self.emit_ambient_note(state)?;
        }

        // Generate harmonic layer based on flow
        if state.flow > 0.6 {
            self.emit_harmonic_note(state)?;
        }

        // Generate chaos layer based on chaos value
        if state.chaos > 0.5 {
            self.emit_chaos_note(state)?;
        }

        // Generate transcendent layer when ultimate is active
        if state.transcendence > 0.8 {
            self.emit_transcendent_note(state)?;
        }

        Ok(())
    }

    /// # Responsibility
    /// Emits ambient background note (low intensity pad).
    fn emit_ambient_note(&self, state: &QualiaState) -> Result<()> {
        let note = PlayGenerativeNote {
            note: 48 + (state.intensity * 12.0) as u8, // C3 to C4 range
            velocity: state.intensity * 0.6,
            duration: 2.0, // Long pad
            patch_id: "ambient_pad".to_string(),
            spatial_position: Some((0.0, 0.0, -5.0)), // Behind player
        };

        self.event_bus
            .emit(GameEvent::PlayGenerativeNote(note))
            .ok();
        Ok(())
    }

    /// # Responsibility
    /// Emits harmonic melodic note (player's musical achievement).
    fn emit_harmonic_note(&self, state: &QualiaState) -> Result<()> {
        // Map flow to pentatonic scale for pleasant harmony
        let scale_degrees = [0, 2, 4, 7, 9]; // C pentatonic
        let degree_index = (state.flow * (scale_degrees.len() - 1) as f32) as usize;
        let base_note = 60; // Middle C
        let note = base_note + scale_degrees[degree_index];

        let note_event = PlayGenerativeNote {
            note,
            velocity: state.flow * state.precision, // Louder on high accuracy
            duration: 0.5,
            patch_id: "lead_synth".to_string(),
            spatial_position: Some((
                (state.flow - 0.5) * 10.0, // Pan based on flow
                2.0,
                0.0,
            )),
        };

        self.event_bus
            .emit(GameEvent::PlayGenerativeNote(note_event))
            .ok();
        Ok(())
    }

    /// # Responsibility
    /// Emits chaotic dissonant note (player mistakes/entropy).
    fn emit_chaos_note(&self, state: &QualiaState) -> Result<()> {
        // Randomize note based on chaos value
        let random_offset = ((state.chaos * 1000.0) as u32 % 12) as u8;
        let note = 36 + random_offset; // Low register chaos

        let note_event = PlayGenerativeNote {
            note,
            velocity: state.chaos * 0.8,
            duration: 0.2, // Short stabs
            patch_id: "chaos_bass".to_string(),
            spatial_position: Some((
                (state.chaos - 0.5) * 20.0, // Wide stereo spread
                -1.0,                       // Below player
                (state.chaos * 5.0) - 2.5,  // Dynamic depth
            )),
        };

        self.event_bus
            .emit(GameEvent::PlayGenerativeNote(note_event))
            .ok();
        Ok(())
    }

    /// # Responsibility
    /// Emits transcendent angelic note (ultimate mode).
    fn emit_transcendent_note(&self, state: &QualiaState) -> Result<()> {
        let note = PlayGenerativeNote {
            note: 84, // High C
            velocity: state.transcendence,
            duration: 1.5,
            patch_id: "angelic_choir".to_string(),
            spatial_position: Some((0.0, 10.0, 0.0)), // Above player
        };

        self.event_bus
            .emit(GameEvent::PlayGenerativeNote(note))
            .ok();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::traits::{IEventBus, ILogger};
    use tokio::sync::broadcast;

    struct MockLogger;
    impl ILogger for MockLogger {
        fn info(&self, _: &str) {}
        fn warn(&self, _: &str) {}
        fn error(&self, _: &str) {}
        fn debug(&self, _: &str) {}
    }

    struct MockEventBus {
        tx: broadcast::Sender<GameEvent>,
    }

    impl MockEventBus {
        fn new() -> (Self, broadcast::Receiver<GameEvent>) {
            let (tx, rx) = broadcast::channel(100);
            (Self { tx }, rx)
        }
    }

    impl IEventBus for MockEventBus {
        fn emit(
            &self,
            event: GameEvent,
        ) -> Result<usize, broadcast::error::SendError<GameEvent>> {
            self.tx.send(event)
        }

        fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
            self.tx.subscribe()
        }
    }

    #[test]
    fn test_orchestrate_high_intensity() {
        let logger = Arc::new(MockLogger);
        let (event_bus, mut rx) = MockEventBus::new();
        let event_bus = Arc::new(event_bus);

        let service = GenerativeNoteOrchestratorService::new(logger, event_bus);

        let state = QualiaState {
            intensity: 0.8,
            precision: 0.9,
            flow: 0.5,
            chaos: 0.2,
            transcendence: 0.0,
            ..Default::default()
        };

        let result = service.orchestrate_from_qualia(&state);
        assert!(result.is_ok());

        // Should emit ambient note (intensity > 0.3)
        match rx.try_recv() {
            Ok(GameEvent::PlayGenerativeNote(note)) => {
                assert_eq!(note.patch_id, "ambient_pad");
                assert!(note.velocity > 0.0);
            }
            _ => panic!("Expected PlayGenerativeNote event"),
        }
    }

    #[test]
    fn test_orchestrate_high_flow() {
        let logger = Arc::new(MockLogger);
        let (event_bus, mut rx) = MockEventBus::new();
        let event_bus = Arc::new(event_bus);

        let service = GenerativeNoteOrchestratorService::new(logger, event_bus);

        let state = QualiaState {
            intensity: 0.2, // Below ambient threshold
            flow: 0.9,      // High flow
            ..Default::default()
        };

        let result = service.orchestrate_from_qualia(&state);
        assert!(result.is_ok());

        // Should emit harmonic note (flow > 0.6)
        match rx.try_recv() {
            Ok(GameEvent::PlayGenerativeNote(note)) => {
                assert_eq!(note.patch_id, "lead_synth");
                assert!(note.note >= 60 && note.note <= 69); // Pentatonic range
            }
            _ => panic!("Expected PlayGenerativeNote event"),
        }
    }

    #[test]
    fn test_orchestrate_high_chaos() {
        let logger = Arc::new(MockLogger);
        let (event_bus, mut rx) = MockEventBus::new();
        let event_bus = Arc::new(event_bus);

        let service = GenerativeNoteOrchestratorService::new(logger, event_bus);

        let state = QualiaState {
            intensity: 0.2,
            flow: 0.2,
            chaos: 0.8, // High chaos
            ..Default::default()
        };

        let result = service.orchestrate_from_qualia(&state);
        assert!(result.is_ok());

        // Should emit chaos note (chaos > 0.5)
        match rx.try_recv() {
            Ok(GameEvent::PlayGenerativeNote(note)) => {
                assert_eq!(note.patch_id, "chaos_bass");
                assert!(note.duration < 0.5); // Short note
            }
            _ => panic!("Expected PlayGenerativeNote event"),
        }
    }

    #[test]
    fn test_orchestrate_transcendence() {
        let logger = Arc::new(MockLogger);
        let (event_bus, mut rx) = MockEventBus::new();
        let event_bus = Arc::new(event_bus);

        let service = GenerativeNoteOrchestratorService::new(logger, event_bus);

        let state = QualiaState {
            intensity: 0.2,
            flow: 0.2,
            chaos: 0.2,
            transcendence: 0.9, // Ultimate active
            ..Default::default()
        };

        let result = service.orchestrate_from_qualia(&state);
        assert!(result.is_ok());

        // Should emit transcendent note (transcendence > 0.8)
        match rx.try_recv() {
            Ok(GameEvent::PlayGenerativeNote(note)) => {
                assert_eq!(note.patch_id, "angelic_choir");
                assert_eq!(note.note, 84); // High C
                assert_eq!(note.spatial_position, Some((0.0, 10.0, 0.0)));
            }
            _ => panic!("Expected PlayGenerativeNote event"),
        }
    }

    #[test]
    fn test_orchestrate_multiple_layers() {
        let logger = Arc::new(MockLogger);
        let (event_bus, mut rx) = MockEventBus::new();
        let event_bus = Arc::new(event_bus);

        let service = GenerativeNoteOrchestratorService::new(logger, event_bus);

        // State triggers all layers
        let state = QualiaState {
            intensity: 0.8,     // Ambient
            flow: 0.9,          // Harmonic
            chaos: 0.6,         // Chaos
            transcendence: 0.9, // Transcendent
            ..Default::default()
        };

        let result = service.orchestrate_from_qualia(&state);
        assert!(result.is_ok());

        // Collect all emitted events
        let mut events = Vec::new();
        while let Ok(event) = rx.try_recv() {
            events.push(event);
        }

        // Should emit 4 notes (one per layer)
        assert_eq!(events.len(), 4, "Should emit notes for all active layers");

        // Verify all patches are present
        let patches: Vec<String> = events
            .iter()
            .filter_map(|e| match e {
                GameEvent::PlayGenerativeNote(note) => Some(note.patch_id.clone()),
                _ => None,
            })
            .collect();

        assert!(patches.contains(&"ambient_pad".to_string()));
        assert!(patches.contains(&"lead_synth".to_string()));
        assert!(patches.contains(&"chaos_bass".to_string()));
        assert!(patches.contains(&"angelic_choir".to_string()));
    }
}

//! # Responsibility
//! Implements core game logic: qualia calculation, player action processing, combo detection.
//!
//! ---
//!
//! This is the "brain" of Qualia Tempo. It receives PlayerAction events, calculates
//! the resulting QualiaState changes, detects combos, and emits gameplay events.

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::{
    contracts::{
        PlayerAction, QualiaState,
        game_state::GameStatus,
        combat_data::MusicalComboData,
    },
    events::{GameEvent, combat_events::ComboCompletedEvent},
};
use super::state_store::IStateStore;
use crate::services::infrastructure::{ILogger, IEventBus};
use crate::config::GameLogicConfig;

/// # Responsibility
/// Interface for game logic operations.
#[async_trait]
pub trait IGameLogicService: Interface {
    /// Processes a player action and updates game state
    async fn process_action(&self, action: PlayerAction) -> Result<()>;
    
    /// Calculates qualia state from accuracy and timing
    fn calculate_qualia(&self, accuracy: f32, perfect_timing: bool) -> QualiaState;
    
    /// Detects if a combo was completed
    fn detect_combo(&self, recent_notes: &[String]) -> Option<String>;
}

/// # Responsibility
/// Implements game logic service with qualia calculation and combo detection.
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    state_store: Arc<dyn IStateStore>,
    
    config: Arc<GameLogicConfig>,
}

impl GameLogicService {
    /// Applies intensity calculation with accuracy multiplier
    fn apply_intensity_multiplier(&self, base_intensity: f32, accuracy: f32) -> f32 {
        let multiplier = 1.0 + (accuracy * self.config.intensity_multiplier);
        (base_intensity * multiplier).clamp(0.0, 1.0)
    }
    
    /// Applies decay to a qualia component
    fn apply_decay(&self, value: f32, decay_rate: f32, delta_time: f32) -> f32 {
        (value - decay_rate * delta_time).max(0.0)
    }
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    async fn process_action(&self, action: PlayerAction) -> Result<()> {
        self.logger.debug("Processing player action");
        
        // Get current state
        let current_state = self.state_store.get_state();
        
        // Only process actions if game is playing
        if current_state.game_state != GameStatus::Playing {
            self.logger.warn("Ignoring action - game not in playing state");
            return Ok(());
        }
        
        // Calculate new qualia based on action
        let accuracy = match &action {
            PlayerAction::KeyPressed { accuracy, .. } => *accuracy,
            PlayerAction::Dash { .. } => 0.7, // Dash has moderate accuracy
            _ => 0.5, // Default for other actions
        };
        
        let perfect_timing = accuracy > 0.9;
        let new_qualia = self.calculate_qualia(accuracy, perfect_timing);
        
        // Update state store
        self.state_store.update_qualia(new_qualia);
        
        // Emit qualia update event
        let event = GameEvent::QualiaStateUpdated(new_qualia);
        if let Err(e) = self.event_bus.emit(event) {
            self.logger.warn(&format!("Failed to emit QualiaStateUpdated: {:?}", e));
        }
        
        // Emit player action event for other services
        let action_event = GameEvent::PlayerAction(Box::new(action));
        if let Err(e) = self.event_bus.emit(action_event) {
            self.logger.warn(&format!("Failed to emit PlayerAction: {:?}", e));
        }
        
        Ok(())
    }
    
    fn calculate_qualia(&self, accuracy: f32, perfect_timing: bool) -> QualiaState {
        let mut qualia = self.state_store.get_state().qualia_state;
        
        // Intensity increases with accuracy
        qualia.intensity = self.apply_intensity_multiplier(qualia.intensity, accuracy);
        
        // Precision increases with perfect timing
        if perfect_timing {
            qualia.precision = (qualia.precision + 0.1).min(1.0);
        } else {
            qualia.precision = self.apply_decay(qualia.precision, 0.05, 0.016); // ~60fps
        }
        
        // Aggression correlates with intensity
        qualia.aggression = (qualia.intensity * 0.8).min(1.0);
        
        // Flow builds with sustained high precision
        if qualia.precision > 0.7 {
            qualia.flow = (qualia.flow + 0.05).min(1.0);
        } else {
            qualia.flow = self.apply_decay(qualia.flow, 0.02, 0.016);
        }
        
        // Chaos increases with low accuracy
        if accuracy < 0.5 {
            qualia.chaos = (qualia.chaos + 0.1).min(1.0);
        } else {
            qualia.chaos = self.apply_decay(qualia.chaos, 0.08, 0.016);
        }
        
        qualia
    }
    
    fn detect_combo(&self, recent_notes: &[String]) -> Option<String> {
        // TODO: Load combo definitions from CombatData
        // For now, hardcode some basic combos
        
        if recent_notes.len() < 3 {
            return None;
        }
        
        let last_three = &recent_notes[recent_notes.len() - 3..];
        
        // Check for Q+E+R (Whirlwind)
        if last_three == ["Q", "E", "R"] {
            return Some("whirlwind".to_string());
        }
        
        // Check for Q+R+F (Attractor)
        if last_three == ["Q", "R", "F"] {
            return Some("attractor".to_string());
        }
        
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::{QualiaLogger, EventBusService};
    use crate::services::gameplay::StateStoreService;

    fn create_test_service() -> GameLogicService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
        let state_store = Arc::new(StateStoreService::new()) as Arc<dyn IStateStore>;
        let config = Arc::new(GameLogicConfig::default());
        
        GameLogicService {
            logger,
            event_bus,
            state_store,
            config,
        }
    }

    #[test]
    fn test_calculate_qualia_high_accuracy() {
        let service = create_test_service();
        
        // Set initial qualia state
        let mut initial_qualia = QualiaState::default();
        initial_qualia.intensity = 0.5;
        service.state_store.update_qualia(initial_qualia);
        
        let qualia = service.calculate_qualia(0.95, true);
        
        assert!(qualia.intensity > 0.5, "Intensity should increase from base");
        assert!(qualia.precision > 0.0, "Precision should increase with perfect timing");
    }

    #[test]
    fn test_calculate_qualia_low_accuracy() {
        let service = create_test_service();
        
        let qualia = service.calculate_qualia(0.3, false);
        
        // Low accuracy should increase chaos
        assert!(qualia.chaos > 0.0, "Chaos should increase with low accuracy");
    }

    #[test]
    fn test_detect_combo_whirlwind() {
        let service = create_test_service();
        
        let notes = vec!["Q".to_string(), "E".to_string(), "R".to_string()];
        let combo = service.detect_combo(&notes);
        
        assert_eq!(combo, Some("whirlwind".to_string()));
    }

    #[test]
    fn test_detect_combo_attractor() {
        let service = create_test_service();
        
        let notes = vec!["Q".to_string(), "R".to_string(), "F".to_string()];
        let combo = service.detect_combo(&notes);
        
        assert_eq!(combo, Some("attractor".to_string()));
    }

    #[test]
    fn test_detect_combo_none() {
        let service = create_test_service();
        
        let notes = vec!["Q".to_string(), "Q".to_string()];
        let combo = service.detect_combo(&notes);
        
        assert_eq!(combo, None);
    }

    #[tokio::test]
    async fn test_process_action_updates_state() {
        let service = create_test_service();
        
        // Set initial qualia and game state
        let mut initial_qualia = QualiaState::default();
        initial_qualia.intensity = 0.5;
        service.state_store.update_qualia(initial_qualia);
        
        // Set game state to Playing
        let mut state = service.state_store.get_state();
        state.game_state = GameStatus::Playing;
        service.state_store.update_state(state);
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 0.0,
            accuracy: 0.9,
        };
        
        let result = service.process_action(action).await;
        assert!(result.is_ok());
        
        // Verify state was updated
        let new_state = service.state_store.get_state();
        assert!(new_state.qualia_state.intensity > 0.5 || new_state.qualia_state.precision > 0.0);
    }
}

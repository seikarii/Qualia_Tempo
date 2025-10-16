//! # Responsibility
//! Frontend game logic mirror implementing client-side prediction and validation.
//!
//! ---
//!
//! Implements a subset of backend game logic for instant feedback and client-side
//! prediction. All calculations are validated by backend authority.

use std::sync::Arc;
use shared_core::contracts::{CombatState, PlayerAction, QualiaState};
use crate::services::core::{ILogger, IEventBus};
use shared_core::events::GameEvent;

/// # Responsibility
/// Configuration for frontend game logic calculations.
#[derive(Debug, Clone)]
pub struct GameLogicConfig {
    /// Whether to enable client-side prediction
    pub enable_prediction: bool,
    
    /// Health decay rate per second when low
    pub health_decay_rate: f32,
    
    /// Combo multiplier decay rate per second
    pub combo_decay_rate: f32,
    
    /// Maximum combo multiplier
    pub max_combo_multiplier: f32,
    
    /// Score multiplier per combo level
    pub score_per_combo: u32,
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            enable_prediction: true,
            health_decay_rate: 5.0,     // 5 HP/sec in danger zone
            combo_decay_rate: 0.5,      // -0.5x per second
            max_combo_multiplier: 10.0,
            score_per_combo: 100,
        }
    }
}

/// # Responsibility
/// Victory/defeat conditions for game over detection.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameResult {
    Victory,
    Defeat,
    InProgress,
}

/// # Responsibility
/// Implements frontend game logic for client-side prediction and validation.
///
/// ---
///
/// This service mirrors a subset of backend GameLogicService to provide
/// instant feedback before backend validation arrives. Backend is always
/// authoritative - this only predicts locally.
pub struct GameLogicService {
    config: GameLogicConfig,
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
}

impl GameLogicService {
    /// # Responsibility
    /// Creates new game logic service.
    pub fn new(
        config: GameLogicConfig,
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        Self {
            config,
            logger,
            event_bus,
        }
    }
    
    /// # Responsibility
    /// Predicts next game state based on player action (client-side prediction).
    ///
    /// This is a LOCAL prediction only - backend will send authoritative state.
    pub fn predict_next_state(
        &self,
        current: &CombatState,
        action: &PlayerAction,
        delta_time: f64,
    ) -> CombatState {
        if !self.config.enable_prediction {
            return current.clone();
        }
        
        let mut predicted = current.clone();
        
        // Predict player movement based on action
        self.predict_player_movement(&mut predicted, action, delta_time);
        
        // Predict combo updates
        self.predict_combo_update(&mut predicted, action);
        
        // Predict health changes (decay in low health)
        self.predict_health_changes(&mut predicted, delta_time);
        
        // Update elapsed time
        predicted.elapsed_time += delta_time;
        
        predicted
    }
    
    /// # Responsibility
    /// Predicts player movement based on dash action.
    fn predict_player_movement(
        &self,
        state: &mut CombatState,
        action: &PlayerAction,
        delta_time: f64,
    ) {
        // Simple dash prediction (backend will validate)
        match action {
            PlayerAction::Dash { direction, .. } => {
                let dash_speed = 10.0; // units per second
                let movement = dash_speed * delta_time as f32;
                
                state.player.position.x += direction.x * movement;
                state.player.position.y += direction.y * movement;
                
                self.logger.debug(&format!(
                    "Predicted dash: new position ({}, {})",
                    state.player.position.x,
                    state.player.position.y
                ));
            }
            _ => {}
        }
    }
    
    /// # Responsibility
    /// Predicts combo updates based on successful actions.
    fn predict_combo_update(&self, state: &mut CombatState, action: &PlayerAction) {
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                if *accuracy > 0.7 {
                    // Good accuracy increases combo
                    state.combo_streak += 1;
                    
                    // Calculate score gain
                    let score_gain = self.config.score_per_combo * state.combo_streak;
                    state.score += score_gain;
                    
                    self.logger.debug(&format!(
                        "Combo increased: {}x (Score: +{})",
                        state.combo_streak, score_gain
                    ));
                } else if *accuracy < 0.3 {
                    // Poor accuracy breaks combo
                    if state.combo_streak > 0 {
                        self.logger.info(&format!("Combo broken at {}x", state.combo_streak));
                        state.combo_streak = 0;
                    }
                }
            }
            _ => {}
        }
    }
    
    /// # Responsibility
    /// Predicts health decay in low health situations.
    fn predict_health_changes(&self, state: &mut CombatState, delta_time: f64) {
        // Health decay when critically low
        if state.player.health < 20.0 && state.player.health > 0.0 {
            let decay = self.config.health_decay_rate * delta_time as f32;
            state.player.health = (state.player.health - decay).max(0.0);
            
            if state.player.health == 0.0 {
                self.logger.warn("Player health reached zero (predicted)");
            }
        }
        
        // Combo multiplier decay over time
        if state.combo_streak > 0 {
            // Decay not implemented in streak, but could track "time since last hit"
            // For now, backend handles this
        }
    }
    
    /// # Responsibility
    /// Calculates score for a successful action.
    pub fn calculate_score_gain(
        &self,
        action: &PlayerAction,
        combo_multiplier: u32,
        qualia: &QualiaState,
    ) -> u32 {
        let base_score = match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                // Score based on accuracy
                (100.0 * accuracy) as u32
            }
            PlayerAction::Dash { .. } => 50,
            PlayerAction::UltimateActivated { .. } => 500,
            PlayerAction::ParryAttempt { .. } => 200,
        };
        
        // Apply combo multiplier
        let combo_bonus = combo_multiplier.min(self.config.max_combo_multiplier as u32);
        
        // Apply qualia intensity bonus
        let intensity_bonus = (1.0 + qualia.intensity) as u32;
        
        base_score * combo_bonus * intensity_bonus
    }
    
    /// # Responsibility
    /// Checks if victory conditions are met.
    pub fn check_victory_condition(&self, state: &CombatState) -> GameResult {
        // Boss defeated (health = 0)
        if state.boss.health <= 0.0 {
            self.logger.info("Victory condition met: Boss defeated");
            return GameResult::Victory;
        }
        
        // Player defeated (health = 0)
        if state.player.health <= 0.0 {
            self.logger.info("Defeat condition met: Player health depleted");
            return GameResult::Defeat;
        }
        
        // Song ended (elapsed_time >= duration)
        // This would require SongData duration, so backend handles this
        
        GameResult::InProgress
    }
    
    /// # Responsibility
    /// Validates if player action is legal in current state.
    pub fn validate_action(
        &self,
        state: &CombatState,
        action: &PlayerAction,
    ) -> Result<(), String> {
        match action {
            PlayerAction::Dash { .. } => {
                // Check if dash is on cooldown
                if state.player.abilities.dash.cooldown_remaining > 0.0 {
                    return Err(format!(
                        "Dash on cooldown: {:.2}s remaining",
                        state.player.abilities.dash.cooldown_remaining
                    ));
                }
                Ok(())
            }
            PlayerAction::ParryAttempt { .. } => {
                // Check parry cooldown
                if state.player.abilities.parry.cooldown_remaining > 0.0 {
                    return Err("Parry on cooldown".to_string());
                }
                Ok(())
            }
            PlayerAction::UltimateActivated { .. } => {
                // Check if ultimate is charged
                if !state.player.abilities.ultimate.is_active {
                    return Err("Ultimate not charged".to_string());
                }
                Ok(())
            }
            _ => Ok(()), // Key presses always valid
        }
    }
    
    /// # Responsibility
    /// Calculates damage taken from boss attack.
    pub fn calculate_damage_taken(
        &self,
        attack_damage: f32,
        player_buffs: &[String],
    ) -> f32 {
        let mut final_damage = attack_damage;
        
        // Apply defense buffs
        for buff in player_buffs {
            match buff.as_str() {
                "shield" => final_damage *= 0.5,     // 50% damage reduction
                "invulnerable" => final_damage = 0.0, // No damage
                "vulnerable" => final_damage *= 1.5,  // 50% more damage
                _ => {}
            }
        }
        
        final_damage
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::Vector3;
    
    // Mock logger
    struct MockLogger;
    impl ILogger for MockLogger {
        fn trace(&self, _: &str) {}
        fn debug(&self, _: &str) {}
        fn info(&self, _: &str) {}
        fn warn(&self, _: &str) {}
        fn error(&self, _: &str) {}
    }
    
    // Mock event bus
    struct MockEventBus;
    impl IEventBus for MockEventBus {
        fn emit(&self, _event: GameEvent) -> Result<usize, String> {
            Ok(0)
        }
        fn subscribe(&self) -> Result<Box<dyn Iterator<Item = GameEvent>>, String> {
            Err("Not implemented".to_string())
        }
        fn subscriber_count(&self) -> usize {
            0
        }
    }
    
    fn create_test_service() -> GameLogicService {
        GameLogicService::new(
            GameLogicConfig::default(),
            Arc::new(MockLogger),
            Arc::new(MockEventBus),
        )
    }
    
    fn create_test_state() -> CombatState {
        let mut state = CombatState::default();
        state.player.health = 100.0;
        state.player.position = Vector3::new(0.0, 0.0, 0.0);
        state.boss.health = 1000.0;
        state.combo_streak = 0;
        state.score = 0;
        state
    }
    
    #[test]
    fn test_game_logic_creation() {
        let service = create_test_service();
        assert!(service.config.enable_prediction);
        assert_eq!(service.config.max_combo_multiplier, 10.0);
    }
    
    #[test]
    fn test_predict_combo_increase() {
        let service = create_test_service();
        let mut state = create_test_state();
        
        let action = PlayerAction::KeyPressed {
            key: "Q".to_string(),
            timestamp: 0.0,
            accuracy: 0.9, // High accuracy
        };
        
        service.predict_combo_update(&mut state, &action);
        
        assert_eq!(state.combo_streak, 1);
        assert!(state.score > 0);
    }
    
    #[test]
    fn test_predict_combo_break() {
        let service = create_test_service();
        let mut state = create_test_state();
        state.combo_streak = 5; // Start with combo
        
        let action = PlayerAction::KeyPressed {
            key: "Q".to_string(),
            timestamp: 0.0,
            accuracy: 0.2, // Poor accuracy
        };
        
        service.predict_combo_update(&mut state, &action);
        
        assert_eq!(state.combo_streak, 0); // Combo broken
    }
    
    #[test]
    fn test_victory_condition_boss_defeated() {
        let service = create_test_service();
        let mut state = create_test_state();
        state.boss.health = 0.0;
        
        assert_eq!(service.check_victory_condition(&state), GameResult::Victory);
    }
    
    #[test]
    fn test_defeat_condition_player_dead() {
        let service = create_test_service();
        let mut state = create_test_state();
        state.player.health = 0.0;
        
        assert_eq!(service.check_victory_condition(&state), GameResult::Defeat);
    }
    
    #[test]
    fn test_validate_action_dash_cooldown() {
        let service = create_test_service();
        let mut state = create_test_state();
        state.player.abilities.dash.cooldown_remaining = 1.0; // On cooldown
        
        let action = PlayerAction::Dash {
            direction: Vector3::new(1.0, 0.0, 0.0),
            timestamp: 0.0,
        };
        
        let result = service.validate_action(&state, &action);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cooldown"));
    }
    
    #[test]
    fn test_calculate_damage_with_shield() {
        let service = create_test_service();
        
        let damage = service.calculate_damage_taken(100.0, &["shield".to_string()]);
        
        assert_eq!(damage, 50.0); // 50% reduction
    }
    
    #[test]
    fn test_calculate_damage_invulnerable() {
        let service = create_test_service();
        
        let damage = service.calculate_damage_taken(100.0, &["invulnerable".to_string()]);
        
        assert_eq!(damage, 0.0); // No damage
    }
    
    #[test]
    fn test_calculate_score_with_combo() {
        let service = create_test_service();
        
        let action = PlayerAction::KeyPressed {
            key: "Q".to_string(),
            timestamp: 0.0,
            accuracy: 1.0, // Perfect
        };
        
        let qualia = QualiaState {
            intensity: 0.5,
            ..Default::default()
        };
        
        let score = service.calculate_score_gain(&action, 3, &qualia);
        
        // base (100) * combo (3) * intensity_bonus (1.5) = 450
        assert_eq!(score, 450);
    }
}

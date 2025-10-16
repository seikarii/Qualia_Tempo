//! # Responsibility
//! Global game state store using Leptos reactive signals.
//!
//! ---
//!
//! Provided via provide_context at app root. Components access via use_context.
//! Automatically triggers re-renders when state changes.

use leptos::*;
use shared_core::contracts::{
    game_state::{CombatState, PlayerState, BossState, QualiaState, GamePhase},
    input::PlayerAction,
};

/// # Responsibility
/// Global game state store with Leptos reactive signals.
///
/// ---
///
/// This is the frontend's source of truth for all game state.
/// Backend sends CombatState updates via WebSocket, which updates these signals.
#[derive(Clone)]
pub struct GameStateStore {
    /// Complete combat state (synchronized from backend)
    pub combat_state: RwSignal<CombatState>,
    
    /// Player entity state
    pub player_state: RwSignal<PlayerState>,
    
    /// Boss entity state
    pub boss_state: RwSignal<BossState>,
    
    /// Qualia emotional state
    pub qualia_state: RwSignal<QualiaState>,
    
    /// Current game phase
    pub game_phase: RwSignal<GamePhase>,
    
    /// WebSocket connection status
    pub is_connected: RwSignal<bool>,
    
    /// Network latency in milliseconds
    pub connection_latency: RwSignal<u32>,
    
    /// Current combo streak
    pub combo_streak: RwSignal<u32>,
    
    /// Player score
    pub score: RwSignal<u32>,
}

impl GameStateStore {
    /// Creates a new GameStateStore with default values
    pub fn new() -> Self {
        Self {
            combat_state: create_rw_signal(CombatState::default()),
            player_state: create_rw_signal(PlayerState::default()),
            boss_state: create_rw_signal(BossState::default()),
            qualia_state: create_rw_signal(QualiaState::default()),
            game_phase: create_rw_signal(GamePhase::Menu),
            is_connected: create_rw_signal(false),
            connection_latency: create_rw_signal(0),
            combo_streak: create_rw_signal(0),
            score: create_rw_signal(0),
        }
    }
    
    /// Updates all state from a backend CombatState
    pub fn update_from_backend(&self, new_state: CombatState) {
        // Update individual signals to trigger fine-grained reactivity
        self.player_state.set(new_state.player.clone());
        self.boss_state.set(new_state.boss.clone());
        self.qualia_state.set(new_state.qualia_state);
        self.game_phase.set(new_state.game_phase);
        self.combo_streak.set(new_state.combo_streak);
        self.score.set(new_state.score);
        
        // Update complete state last
        self.combat_state.set(new_state);
    }
    
    /// Updates connection status
    pub fn set_connection_status(&self, connected: bool) {
        self.is_connected.set(connected);
    }
    
    /// Updates network latency
    pub fn set_latency(&self, latency_ms: u32) {
        self.connection_latency.set(latency_ms);
    }
    
    /// Gets the current qualia state (read-only)
    pub fn get_qualia_state(&self) -> QualiaState {
        self.qualia_state.get()
    }
    
    /// Gets the current player state (read-only)
    pub fn get_player_state(&self) -> PlayerState {
        self.player_state.get()
    }
    
    /// Gets the current boss state (read-only)
    pub fn get_boss_state(&self) -> BossState {
        self.boss_state.get()
    }
}

impl Default for GameStateStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::math::Vector2;
    
    #[test]
    fn test_game_store_creation() {
        let store = GameStateStore::new();
        assert_eq!(store.game_phase.get(), GamePhase::Menu);
        assert!(!store.is_connected.get());
        assert_eq!(store.combo_streak.get(), 0);
        assert_eq!(store.score.get(), 0);
    }
    
    #[test]
    fn test_update_from_backend() {
        let store = GameStateStore::new();
        
        let mut combat_state = CombatState::default();
        combat_state.combo_streak = 42;
        combat_state.score = 9001;
        combat_state.game_phase = GamePhase::Combat;
        
        store.update_from_backend(combat_state.clone());
        
        assert_eq!(store.combo_streak.get(), 42);
        assert_eq!(store.score.get(), 9001);
        assert_eq!(store.game_phase.get(), GamePhase::Combat);
    }
    
    #[test]
    fn test_connection_status() {
        let store = GameStateStore::new();
        
        assert!(!store.is_connected.get());
        store.set_connection_status(true);
        assert!(store.is_connected.get());
        
        store.set_latency(50);
        assert_eq!(store.connection_latency.get(), 50);
    }
}

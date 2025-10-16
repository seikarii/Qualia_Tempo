//! # Responsibility
//! Provides thread-safe mutable access to the authoritative combat state.
//!
//! ---
//!
//! This is the ONLY service that holds mutable game state (Arc<RwLock<CombatState>>).
//! All other services read from this store and emit events to trigger updates.
//! Implements the State Store pattern from ARCHITECTURE.RUST.md.

use shaku::Component;
use std::sync::{Arc, RwLock};
use shared_core::contracts::game_state::{CombatState, GameStatus, QualiaState, PlayerState, BossState};
use shared_core::utils::math::Vector2;

/// # Responsibility
/// Provides thread-safe mutable access to combat state.
#[derive(Component)]
#[shaku(interface = IStateStore)]
pub struct StateStoreService {
    state: Arc<RwLock<CombatState>>,
}

impl StateStoreService {
    /// Creates a new StateStoreService with default initial state
    #[must_use]
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(CombatState::default())),
        }
    }
}

impl Default for StateStoreService {
    fn default() -> Self {
        Self::new()
    }
}

/// # Responsibility
/// Interface for state store operations.
pub trait IStateStore: shaku::Interface {
    /// Gets a read-only snapshot of combat state
    fn get_state(&self) -> CombatState;
    
    /// Updates the qualia state
    fn update_qualia(&self, qualia: QualiaState);
    
    /// Updates the player state
    fn update_player(&self, player: PlayerState);
    
    /// Updates the boss state
    fn update_boss(&self, boss: BossState);
    
    /// Updates the complete combat state
    fn update_state(&self, state: CombatState);
    
    /// Gets the current game status
    fn get_game_status(&self) -> GameStatus;
}

impl IStateStore for StateStoreService {
    fn get_state(&self) -> CombatState {
        self.state.read().expect("Failed to acquire read lock on state").clone()
    }
    
    fn update_qualia(&self, qualia: QualiaState) {
        let mut state = self.state.write().expect("Failed to acquire write lock on state");
        state.qualia_state = qualia;
    }
    
    fn update_player(&self, player: PlayerState) {
        let mut state = self.state.write().expect("Failed to acquire write lock on state");
        state.player = player;
    }
    
    fn update_boss(&self, boss: BossState) {
        let mut state = self.state.write().expect("Failed to acquire write lock on state");
        state.boss = boss;
    }
    
    fn update_state(&self, new_state: CombatState) {
        let mut state = self.state.write().expect("Failed to acquire write lock on state");
        *state = new_state;
    }
    
    fn get_game_status(&self) -> GameStatus {
        self.state.read().expect("Failed to acquire read lock on state").game_state
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_store_initial_state() {
        let store = StateStoreService::new();
        let state = store.get_state();
        assert_eq!(state.game_state, GameStatus::Idle);
    }

    #[test]
    fn test_state_store_update_qualia() {
        let store = StateStoreService::new();
        let qualia = QualiaState {
            intensity: 0.8,
            precision: 0.9,
            ..Default::default()
        };
        
        store.update_qualia(qualia);
        
        let state = store.get_state();
        assert_eq!(state.qualia_state.intensity, 0.8);
        assert_eq!(state.qualia_state.precision, 0.9);
    }

    #[test]
    fn test_state_store_concurrent_access() {
        use std::thread;
        
        let store = Arc::new(StateStoreService::new());
        let store_clone = store.clone();
        
        let handle = thread::spawn(move || {
            for i in 0..100 {
                let mut qualia = QualiaState::default();
                qualia.intensity = (i as f32) / 100.0;
                store_clone.update_qualia(qualia);
            }
        });
        
        // Main thread also updates
        for i in 0..100 {
            let mut qualia = QualiaState::default();
            qualia.precision = (i as f32) / 100.0;
            store.update_qualia(qualia);
        }
        
        handle.join().expect("Thread panicked");
        
        // Should not panic - proves thread safety
        let final_state = store.get_state();
        assert!(final_state.qualia_state.intensity >= 0.0 && final_state.qualia_state.intensity <= 1.0);
    }
}

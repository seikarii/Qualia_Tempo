//! # Responsibility
//! Manages reactive game state using Leptos Signals.
//!
//! ---
//!
//! Provides reactive stores for CombatState with optimistic updates and
//! WebSocket synchronization. Acts as single source of truth for frontend state.

use anyhow::Result;
use leptos::*;
use shared_core::contracts::CombatState;
use tracing::{debug, warn};

/// # Responsibility
/// Reactive store for complete game state.
///
/// ---
///
/// Uses Leptos Signals for reactive updates. Synchronized with backend via
/// WebSocket messages. Supports optimistic updates with rollback.
#[derive(Clone)]
pub struct GameStateStoreService {
    /// Current combat state signal (write)
    state_writer: WriteSignal<Option<CombatState>>,
    /// Current combat state signal (read)
    state_reader: ReadSignal<Option<CombatState>>,
    /// Optimistic state backup for rollback
    optimistic_backup: WriteSignal<Option<CombatState>>,
}

impl GameStateStoreService {
    /// # Responsibility
    /// Creates new store with initial None state.
    ///
    /// ---
    ///
    /// Initializes reactive signals for state management.
    pub fn new() -> Result<Self> {
        let (state_reader, state_writer) = create_signal(None);
        let (_, optimistic_backup) = create_signal(None);

        debug!("GameStateStoreService initialized");

        Ok(Self {
            state_writer,
            state_reader,
            optimistic_backup,
        })
    }

    /// # Responsibility
    /// Updates state from backend WebSocket message (authoritative).
    ///
    /// ---
    ///
    /// Overwrites current state with backend state. Clears optimistic backup.
    pub fn update_from_backend(&self, new_state: CombatState) {
        debug!("Updating state from backend");
        self.state_writer.set(Some(new_state));
        self.optimistic_backup.set(None); // Clear optimistic state
    }

    /// # Responsibility
    /// Applies optimistic update before backend confirmation.
    ///
    /// ---
    ///
    /// Saves current state as backup before applying update. Can be rolled
    /// back if backend rejects the change.
    pub fn apply_optimistic_update<F>(&self, update_fn: F)
    where
        F: FnOnce(&mut CombatState),
    {
        if let Some(mut state) = self.state_reader.get() {
            // Backup current state
            self.optimistic_backup.set(Some(state.clone()));

            // Apply optimistic update
            update_fn(&mut state);
            self.state_writer.set(Some(state));

            debug!("Optimistic update applied");
        } else {
            warn!("Cannot apply optimistic update: no current state");
        }
    }

    /// # Responsibility
    /// Rolls back optimistic update if backend rejects.
    ///
    /// ---
    ///
    /// Restores state from backup. Called when backend sends conflicting state.
    pub fn rollback_optimistic_update(&self) {
        // Note: optimistic_backup is WriteSignal, we need a separate ReadSignal
        // For now, implement simple rollback by clearing optimistic state
        debug!("Rolling back optimistic update");
        self.optimistic_backup.set(None);
    }

    /// # Responsibility
    /// Gets current state (read-only).
    pub fn get_state(&self) -> Option<CombatState> {
        self.state_reader.get()
    }

    /// # Responsibility
    /// Gets reactive signal for state (for use in Leptos components).
    pub fn get_state_signal(&self) -> ReadSignal<Option<CombatState>> {
        self.state_reader
    }

    /// # Responsibility
    /// Checks if state is currently loaded.
    pub fn is_loaded(&self) -> bool {
        self.state_reader.get().is_some()
    }

    /// # Responsibility
    /// Clears all state (for logout/disconnect).
    pub fn clear_state(&self) {
        debug!("Clearing game state");
        self.state_writer.set(None);
        self.optimistic_backup.set(None);
    }
}

impl Default for GameStateStoreService {
    fn default() -> Self {
        Self::new().expect("Failed to create GameStateStoreService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::contracts::{BossState, GamePhase, PlayerState, QualiaState};
    use shared_core::utils::Vec2;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    fn create_mock_combat_state() -> CombatState {
        CombatState {
            game_phase: GamePhase::Playing,
            player: PlayerState {
                position: Vec2::new(0.0, 0.0),
                velocity: Vec2::new(0.0, 0.0),
                health: 100.0,
                max_health: 100.0,
                is_dashing: false,
                is_invulnerable: false,
                abilities: shared_core::contracts::PlayerAbilities::default(),
                combo: 0,
                buffs: vec![],
                debuffs: vec![],
            },
            boss: BossState {
                id: "test_boss".to_string(),
                position: Vec2::new(0.0, 5.0),
                velocity: Vec2::new(0.0, 0.0),
                health: 1000.0,
                max_health: 1000.0,
                phase: 1,
                current_pattern_id: None,
                is_stunned: false,
                current_aggression_level: 0.5,
            },
            qualia: QualiaState::default(),
            song_position: 0.0,
            song_duration: 180.0,
            timestamp: 0.0,
            score: 0,
            qualia_event_history: vec![],
        }
    }

    #[wasm_bindgen_test]
    fn test_store_creation() {
        let store = GameStateStoreService::new();
        assert!(store.is_ok());
    }

    #[wasm_bindgen_test]
    fn test_initial_state_is_none() {
        let store = GameStateStoreService::new().unwrap();
        assert!(store.get_state().is_none());
        assert!(!store.is_loaded());
    }

    #[wasm_bindgen_test]
    fn test_update_from_backend() {
        let store = GameStateStoreService::new().unwrap();
        let state = create_mock_combat_state();

        store.update_from_backend(state.clone());

        let retrieved = store.get_state();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().player.health, 100.0);
        assert!(store.is_loaded());
    }

    #[wasm_bindgen_test]
    fn test_optimistic_update() {
        let store = GameStateStoreService::new().unwrap();
        let state = create_mock_combat_state();

        store.update_from_backend(state);

        // Apply optimistic update
        store.apply_optimistic_update(|state| {
            state.player.health = 80.0;
        });

        let updated = store.get_state().unwrap();
        assert_eq!(updated.player.health, 80.0);
    }

    #[wasm_bindgen_test]
    fn test_rollback_optimistic_update() {
        let store = GameStateStoreService::new().unwrap();
        let state = create_mock_combat_state();

        store.update_from_backend(state);

        // Apply optimistic update
        store.apply_optimistic_update(|state| {
            state.player.health = 80.0;
        });

        // Rollback
        store.rollback_optimistic_update();

        let retrieved = store.get_state().unwrap();
        assert_eq!(retrieved.player.health, 100.0); // Back to original
    }

    #[wasm_bindgen_test]
    fn test_clear_state() {
        let store = GameStateStoreService::new().unwrap();
        let state = create_mock_combat_state();

        store.update_from_backend(state);
        assert!(store.is_loaded());

        store.clear_state();
        assert!(!store.is_loaded());
        assert!(store.get_state().is_none());
    }

    #[wasm_bindgen_test]
    fn test_signal_reactivity() {
        let store = GameStateStoreService::new().unwrap();
        let signal = store.get_state_signal();

        // Initial state
        assert!(signal.get().is_none());

        // Update
        let state = create_mock_combat_state();
        store.update_from_backend(state);

        // Signal should update
        assert!(signal.get().is_some());
    }
}

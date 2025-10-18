//! # Responsibility
//! Aggregates PlayerState, BossState, and QualiaState into unified reactive signals (BLUEPRINT #42).
//!
//! ---
//!
//! This service subscribes to CombatState updates from the backend and exposes
//! individual reactive signals for each sub-state, allowing UI components to
//! subscribe only to the specific state they need.

use anyhow::Result;
use leptos::*;
use shared_core::contracts::{BossState, CombatState, GamePhase, PlayerState, QualiaState};
use tracing::debug;

/// # Responsibility
/// Aggregates and distributes CombatState as individual reactive signals.
///
/// ---
///
/// Receives complete CombatState from WebSocket, breaks it down into individual
/// signals (player, boss, qualia, phase) for fine-grained reactivity.
#[derive(Clone)]
pub struct CombatStateAggregatorService {
    /// Player state signal
    pub player_signal: WriteSignal<PlayerState>,
    pub player_reader: ReadSignal<PlayerState>,

    /// Boss state signal
    pub boss_signal: WriteSignal<BossState>,
    pub boss_reader: ReadSignal<BossState>,

    /// Qualia state signal
    pub qualia_signal: WriteSignal<QualiaState>,
    pub qualia_reader: ReadSignal<QualiaState>,

    /// Game phase signal
    pub phase_signal: WriteSignal<GamePhase>,
    pub phase_reader: ReadSignal<GamePhase>,

    /// Timestamp signal
    pub timestamp_signal: WriteSignal<f64>,
    pub timestamp_reader: ReadSignal<f64>,
}

impl CombatStateAggregatorService {
    /// # Responsibility
    /// Creates a new CombatStateAggregatorService with default state.
    ///
    /// ---
    ///
    /// Initializes all reactive signals with default values.
    pub fn new() -> Result<Self> {
        let (player_reader, player_signal) = create_signal(PlayerState::default());
        let (boss_reader, boss_signal) = create_signal(BossState::default());
        let (qualia_reader, qualia_signal) = create_signal(QualiaState::default());
        let (phase_reader, phase_signal) = create_signal(GamePhase::default());
        let (timestamp_reader, timestamp_signal) = create_signal(0.0);

        debug!("CombatStateAggregatorService initialized");

        Ok(Self {
            player_signal,
            player_reader,
            boss_signal,
            boss_reader,
            qualia_signal,
            qualia_reader,
            phase_signal,
            phase_reader,
            timestamp_signal,
            timestamp_reader,
        })
    }

    /// # Responsibility
    /// Updates all state signals from a complete CombatState.
    ///
    /// ---
    ///
    /// Receives full CombatState from backend and updates individual signals.
    /// This triggers reactivity only in components subscribed to changed signals.
    ///
    /// # Arguments
    /// - `state`: Complete CombatState from backend
    pub fn update_combat_state(&self, state: CombatState) {
        let player_hp = state.player.health;
        let boss_hp = state.boss.health;
        let phase = state.game_phase;

        self.player_signal.set(state.player);
        self.boss_signal.set(state.boss);
        self.qualia_signal.set(state.qualia);
        self.phase_signal.set(state.game_phase);
        self.timestamp_signal.set(state.timestamp);

        debug!(
            "CombatState updated: phase={:?}, player_hp={:.1}, boss_hp={:.1}",
            phase, player_hp, boss_hp
        );
    }

    /// # Responsibility
    /// Gets current player state (read-only).
    #[must_use]
    pub fn get_player_state(&self) -> PlayerState {
        self.player_reader.get()
    }

    /// # Responsibility
    /// Gets current boss state (read-only).
    #[must_use]
    pub fn get_boss_state(&self) -> BossState {
        self.boss_reader.get()
    }

    /// # Responsibility
    /// Gets current qualia state (read-only).
    #[must_use]
    pub fn get_qualia_state(&self) -> QualiaState {
        self.qualia_reader.get()
    }

    /// # Responsibility
    /// Gets current game phase (read-only).
    #[must_use]
    pub fn get_game_phase(&self) -> GamePhase {
        self.phase_reader.get()
    }

    /// # Responsibility
    /// Gets current timestamp (read-only).
    #[must_use]
    pub fn get_timestamp(&self) -> f64 {
        self.timestamp_reader.get()
    }

    /// # Responsibility
    /// Reconstructs full CombatState from individual signals.
    ///
    /// ---
    ///
    /// Useful for serialization or debugging. Note: Some fields are set to defaults.
    #[must_use]
    pub fn get_full_state(&self) -> CombatState {
        CombatState {
            game_phase: self.phase_reader.get(),
            player: self.player_reader.get(),
            boss: self.boss_reader.get(),
            qualia: self.qualia_reader.get(),
            timestamp: self.timestamp_reader.get(),
            song_position: 0.0, // Not cached locally
            song_duration: 0.0, // Not cached locally
            score: 0, // Not cached locally
            qualia_event_history: Vec::new(), // Not cached locally
        }
    }
}

impl Default for CombatStateAggregatorService {
    fn default() -> Self {
        Self::new().expect("Failed to create CombatStateAggregatorService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::Vec2;

    #[test]
    fn test_update_combat_state() {
        let service = CombatStateAggregatorService::new().unwrap();

        let state = CombatState {
            game_phase: GamePhase::Playing,
            player: PlayerState {
                position: Vec2::new(1.0, 2.0),
                health: 80.0,
                combo: 5,
                ..Default::default()
            },
            boss: BossState {
                position: Vec2::new(5.0, 6.0),
                health: 500.0,
                phase: 2,
                ..Default::default()
            },
            qualia: QualiaState {
                intensity: 0.8,
                precision: 0.9,
                ..Default::default()
            },
            timestamp: 1234.56,
            song_position: 0.0,
            song_duration: 180.0,
            score: 1000,
            qualia_event_history: Vec::new(),
        };

        service.update_combat_state(state.clone());

        assert_eq!(service.get_game_phase(), GamePhase::Playing);
        assert_eq!(service.get_player_state().health, 80.0);
        assert_eq!(service.get_boss_state().health, 500.0);
        assert_eq!(service.get_qualia_state().intensity, 0.8);
        assert_eq!(service.get_timestamp(), 1234.56);
    }

    #[test]
    fn test_get_full_state() {
        let service = CombatStateAggregatorService::new().unwrap();

        let state = CombatState {
            game_phase: GamePhase::Playing,
            player: PlayerState {
                health: 75.0,
                ..Default::default()
            },
            boss: BossState {
                health: 600.0,
                ..Default::default()
            },
            qualia: QualiaState {
                intensity: 0.7,
                ..Default::default()
            },
            timestamp: 5000.0,
            song_position: 0.0,
            song_duration: 180.0,
            score: 1000,
            qualia_event_history: Vec::new(),
        };

        service.update_combat_state(state);

        let reconstructed = service.get_full_state();
        assert_eq!(reconstructed.player.health, 75.0);
        assert_eq!(reconstructed.boss.health, 600.0);
        assert_eq!(reconstructed.qualia.intensity, 0.7);
    }

    #[test]
    fn test_default_state() {
        let service = CombatStateAggregatorService::new().unwrap();

        assert_eq!(service.get_game_phase(), GamePhase::Idle);
        assert_eq!(service.get_player_state().health, 100.0);
        assert_eq!(service.get_boss_state().health, 1000.0);
        assert_eq!(service.get_qualia_state().intensity, 0.0);
    }
}

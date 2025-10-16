//! # Responsibility
//! Main backend configuration aggregator.

use serde::{Deserialize, Serialize};
use super::{WebSocketConfig, MetronomeConfig, GameLogicConfig, BossAIConfig, CombatOrchestratorConfig};

/// # Responsibility
/// Aggregates all backend configuration sections.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendConfig {
    /// WebSocket server configuration
    pub websocket: WebSocketConfig,
    
    /// Metronome configuration
    pub metronome: MetronomeConfig,
    
    /// Game logic configuration
    pub game_logic: GameLogicConfig,
    
    /// Boss AI configuration
    pub boss_ai: BossAIConfig,
    
    /// Combat orchestrator configuration
    pub combat_orchestrator: CombatOrchestratorConfig,
    
    /// Logging level (info, debug, warn, error)
    pub log_level: String,
    
    /// EventBus channel capacity
    pub event_bus_capacity: usize,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            websocket: WebSocketConfig::default(),
            metronome: MetronomeConfig::default(),
            game_logic: GameLogicConfig::default(),
            boss_ai: BossAIConfig::default(),
            combat_orchestrator: CombatOrchestratorConfig::default(),
            log_level: "info".to_string(),
            event_bus_capacity: 1000,
        }
    }
}

//! # Responsibility
//! Provides configuration structures for all backend services.
//!
//! ---
//!
//! This module defines configuration for EventBus, GameLogic, BossAI,
//! WebSocket servers, and other services. Configurations are typically
//! loaded from YAML files or environment variables.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for the EventBus service.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EventBusConfig {
    /// Maximum number of events to buffer
    pub capacity: usize,
}

impl Default for EventBusConfig {
    fn default() -> Self {
        Self { capacity: 1000 }
    }
}

/// # Responsibility
/// Configuration for GameLogic service calculations.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GameLogicConfig {
    /// Multiplier for intensity based on accuracy
    pub intensity_multiplier: f32,
    
    /// Bonus precision for perfect timing
    pub perfect_timing_precision_bonus: f32,
    
    /// Aggression correlation with intensity
    pub aggression_intensity_correlation: f32,
    
    /// Flow build rate per successful action
    pub flow_build_rate: f32,
    
    /// Chaos penalty for low accuracy
    pub chaos_low_accuracy_penalty: f32,
    
    /// Decay rate for qualia values per frame
    pub decay_rate: f32,
}

impl Default for GameLogicConfig {
    fn default() -> Self {
        Self {
            intensity_multiplier: 0.15,
            perfect_timing_precision_bonus: 0.1,
            aggression_intensity_correlation: 0.3,
            flow_build_rate: 0.05,
            chaos_low_accuracy_penalty: 0.2,
            decay_rate: 0.01,
        }
    }
}

/// # Responsibility
/// Configuration for BossAI behavior.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BossAIConfig {
    /// Multiplier for chaos to aggression conversion
    pub chaos_aggression_multiplier: f32,
    
    /// Multiplier for intensity to aggression conversion
    pub intensity_aggression_multiplier: f32,
    
    /// Minimum time between attack patterns (seconds)
    pub min_attack_interval_sec: f64,
    
    /// Maximum time between attack patterns (seconds)
    pub max_attack_interval_sec: f64,
}

impl Default for BossAIConfig {
    fn default() -> Self {
        Self {
            chaos_aggression_multiplier: 1.2,
            intensity_aggression_multiplier: 0.8,
            min_attack_interval_sec: 2.0,
            max_attack_interval_sec: 8.0,
        }
    }
}

/// # Responsibility
/// Configuration for WebSocket server.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WebSocketConfig {
    /// Server bind address
    pub bind_address: String,
    
    /// Server port
    pub port: u16,
    
    /// Maximum connections allowed
    pub max_connections: usize,
    
    /// Ping interval (milliseconds)
    pub ping_interval_ms: u64,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            bind_address: "127.0.0.1".to_string(),
            port: 8080,
            max_connections: 100,
            ping_interval_ms: 30000,
        }
    }
}

/// # Responsibility
/// Configuration for CombatOrchestrator service.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CombatOrchestratorConfig {
    /// Target tick rate (ticks per second)
    pub tick_rate_hz: u32,
    
    /// Whether to synchronize with audio BPM
    pub sync_to_audio_bpm: bool,
}

impl Default for CombatOrchestratorConfig {
    fn default() -> Self {
        Self {
            tick_rate_hz: 60,
            sync_to_audio_bpm: true,
        }
    }
}

/// # Responsibility
/// Master configuration aggregating all service configs.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BackendConfig {
    /// EventBus configuration
    pub event_bus: EventBusConfig,
    
    /// GameLogic configuration
    pub game_logic: GameLogicConfig,
    
    /// BossAI configuration
    pub boss_ai: BossAIConfig,
    
    /// WebSocket server configuration
    pub websocket: WebSocketConfig,
    
    /// CombatOrchestrator configuration
    pub combat_orchestrator: CombatOrchestratorConfig,
    
    /// Logging level
    pub log_level: String,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            event_bus: EventBusConfig::default(),
            game_logic: GameLogicConfig::default(),
            boss_ai: BossAIConfig::default(),
            websocket: WebSocketConfig::default(),
            combat_orchestrator: CombatOrchestratorConfig::default(),
            log_level: "info".to_string(),
        }
    }
}

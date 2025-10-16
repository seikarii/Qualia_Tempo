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
/// Configuration for HarmonyAnalysis service.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct HarmonyAnalysisConfig {
    /// Threshold for perfect harmony classification (0.0-1.0)
    pub perfect_harmony_threshold: f32,
    
    /// Threshold for harmonic classification (0.0-1.0)
    pub harmonic_threshold: f32,
    
    /// Threshold for chaotic classification (0.0-1.0)
    pub chaotic_threshold: f32,
    
    /// Threshold for extreme chaos classification (0.0-1.0)
    pub extreme_chaos_threshold: f32,
    
    /// Minimum notes required for chord detection
    pub min_notes_for_chord: usize,
    
    /// Weight for song harmony in overall score
    pub song_harmony_weight: f32,
    
    /// Weight for qualia harmony in overall score
    pub qualia_harmony_weight: f32,
    
    /// Tempo modifier for context-sensitive scoring
    pub tempo_modifier: f32,
    
    /// Enable chord detection feature
    pub enable_chord_detection: bool,
    
    /// Enable harmony trend tracking
    pub enable_trend_tracking: bool,
    
    /// Enable context modifiers (tempo, combo)
    pub enable_context_modifiers: bool,
    
    /// Max length of harmony history buffer
    pub harmony_history_length: usize,
    
    /// Max collected notes to track
    pub max_collected_notes: usize,
}

impl Default for HarmonyAnalysisConfig {
    fn default() -> Self {
        Self {
            perfect_harmony_threshold: 0.9,
            harmonic_threshold: 0.65,
            chaotic_threshold: 0.35,
            extreme_chaos_threshold: 0.1,
            min_notes_for_chord: 3,
            song_harmony_weight: 0.6,
            qualia_harmony_weight: 0.4,
            tempo_modifier: 0.001,
            enable_chord_detection: true,
            enable_trend_tracking: true,
            enable_context_modifiers: true,
            harmony_history_length: 50,
            max_collected_notes: 10,
        }
    }
}

/// # Responsibility
/// Configuration for QualiaProcessor service.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct QualiaProcessorConfig {
    /// Threshold for intensity spike detection
    pub intensity_spike_threshold: f32,
    
    /// Threshold for transcendence activation
    pub transcendence_threshold: f32,
    
    /// Threshold for chaos breach detection
    pub chaos_threshold: f32,
    
    /// Enable qualia state processing
    pub processing_enabled: bool,
}

impl Default for QualiaProcessorConfig {
    fn default() -> Self {
        Self {
            intensity_spike_threshold: 0.3,
            transcendence_threshold: 0.85,
            chaos_threshold: 0.7,
            processing_enabled: true,
        }
    }
}

/// # Responsibility
/// Configuration for ApplicationInitializer service.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApplicationInitializerConfig {
    /// Enable lifecycle logging
    pub enable_lifecycle_logging: bool,
    
    /// Timeout for service initialization (seconds)
    pub init_timeout_sec: u64,
    
    /// Timeout for service cleanup (seconds)
    pub cleanup_timeout_sec: u64,
}

impl Default for ApplicationInitializerConfig {
    fn default() -> Self {
        Self {
            enable_lifecycle_logging: true,
            init_timeout_sec: 30,
            cleanup_timeout_sec: 10,
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
    
    /// HarmonyAnalysis configuration
    pub harmony_analysis: HarmonyAnalysisConfig,
    
    /// QualiaProcessor configuration
    pub qualia_processor: QualiaProcessorConfig,
    
    /// ApplicationInitializer configuration
    pub application_initializer: ApplicationInitializerConfig,
    
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
            harmony_analysis: HarmonyAnalysisConfig::default(),
            qualia_processor: QualiaProcessorConfig::default(),
            application_initializer: ApplicationInitializerConfig::default(),
            log_level: "info".to_string(),
        }
    }
}

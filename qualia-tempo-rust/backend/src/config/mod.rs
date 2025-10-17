//! # Responsibility
//! Configuration module aggregator.
//!
//! ---
//!
//! Exports all configuration structures for backend services.

pub mod server;
pub mod game_logic;
pub mod boss_ai;
pub mod pattern_system;
pub mod qualia_processor;

pub use server::{ServerConfig, WebSocketConfig, MetronomeConfig};
pub use game_logic::{GameLogicConfig, PlayerConfig, BossConfig, ScoringConfig, ComboConfig};
pub use boss_ai::{BossAIConfig, PatternSelectionConfig};
pub use pattern_system::PatternSystemConfig;
pub use qualia_processor::{QualiaProcessorConfig, DecayRatesConfig, BuildupRatesConfig, TranscendenceConfig};

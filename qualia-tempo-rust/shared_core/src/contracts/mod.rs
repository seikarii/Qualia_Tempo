//! # Responsibility
//! Provides all shared data contract modules.
//!
//! ---
//!
//! Re-exports all contract types for convenient access throughout the codebase.

pub mod audio;
pub mod combat_data;
pub mod effects;
pub mod game_state;
pub mod input;
pub mod leaderboard;
pub mod particles;
pub mod scenes;
pub mod settings;

// Re-export commonly used types
pub use audio::{HarmonyMap, InstrumentPatch, PatchType, SongData};
pub use combat_data::{CombatData, LyricData, MusicalComboData, PatternData};
pub use effects::{ActiveEffect, EffectType, EnvironmentEffect};
pub use game_state::{
    BossState, CombatState, GamePhase, PlayerAbilities, PlayerState, QualiaEvent, QualiaState,
    StatusEffect,
};
pub use input::{MusicalInputAnalysis, PlayerAction};
pub use leaderboard::LeaderboardEntry;
pub use particles::{OptimizedParticle, ParticleSystemConfig};
pub use scenes::{CinematicData, SceneData};
pub use settings::{AccessibilitySettings, GameSettings, GraphicsQuality};

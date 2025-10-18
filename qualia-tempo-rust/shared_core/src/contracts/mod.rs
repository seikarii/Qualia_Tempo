//! # Responsibility
//! Aggregates all contract modules for shared data structures.

pub mod audio;
pub mod combat_data;
pub mod effects;
pub mod game_state;
pub mod input;
pub mod leaderboard;
pub mod particles;
pub mod scenes;
pub mod settings;

pub use audio::{
    AudioEffect, AudioLayer, Chord, EnvelopeSettings, HarmonyMap, InstrumentPatch,
    PlayGenerativeNote, SynthesisType, Waveform,
};
pub use combat_data::{
    AttackPatternType, BeatData, CombatData, LyricData, LyricLine, PatternData, SongData,
    SongSection, TimeSignature,
};
pub use effects::{ActiveEffect, EffectType, EnvironmentEffect, EnvironmentEffectType};
pub use game_state::{
    BossState, CombatState, DashAbilityState, GameStatus, ParryAbilityState, PlayerAbilities,
    PlayerState, QualiaEvent, QualiaState, StatusEffect, UltimateAbilityState,
};
pub use input::PlayerAction;
pub use leaderboard::LeaderboardEntry;
pub use particles::{OptimizedParticle, ParticleSystemConfig};
pub use scenes::{
    CameraInterpolation, CameraKeyframe, CinematicData, DialogueLine, SceneData, SceneTransition,
    SceneType,
};
pub use settings::{
    AccessibilitySettings, AudioQuality, DifficultyLevel, GameSettings, GraphicsQuality,
};

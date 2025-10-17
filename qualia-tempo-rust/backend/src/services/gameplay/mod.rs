//! # Responsibility
//! Gameplay logic services (game loop, qualia processing, boss AI, pattern recognition).

pub mod boss_ai;
pub mod game_logic;
pub mod pattern_system;
pub mod qualia_processor;
pub mod traits;

pub use boss_ai::BossAIService;
pub use game_logic::GameLogicService;
pub use pattern_system::PatternSystemService;
pub use qualia_processor::QualiaProcessor;
pub use traits::*;

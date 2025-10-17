//! # Responsibility
//! Core game components module - main game orchestration.

pub mod qualia_tempo_game;

pub use qualia_tempo_game::{
    QualiaTempoGame, 
    GamePhase, 
    PlayerState, 
    BossState, 
    QualiaState, 
    GameEndData
};

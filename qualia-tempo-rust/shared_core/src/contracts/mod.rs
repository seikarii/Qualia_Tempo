//! # Responsibility
//! Aggregates all contract modules for shared data structures.

pub mod game_state;
pub mod input;

pub use game_state::{
    BossState, CombatState, DashAbilityState, GameStatus, ParryAbilityState, PlayerAbilities,
    PlayerState, QualiaEvent, QualiaState, StatusEffect, UltimateAbilityState,
};
pub use input::PlayerAction;

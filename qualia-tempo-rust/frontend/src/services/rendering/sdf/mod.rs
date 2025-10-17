//! # Responsibility
//! Aggregates SDF raymarching renderers for player and boss avatars.

pub mod player_avatar;
pub mod boss_avatar;

pub use player_avatar::{PlayerAvatarSDFService, PlayerSDFConfig};
pub use boss_avatar::{BossAvatarSDFService, BossSDFConfig};

//! # Responsibility
//! Scene management module (ARCHITECTURE.RUST §6.1.5).

pub mod i_scene;
pub mod combat_scene;

pub use i_scene::IScene;
pub use combat_scene::CombatScene;

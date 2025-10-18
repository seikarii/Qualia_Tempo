//! # Responsibility
//! Scene management module (ARCHITECTURE.RUST §6.1.5).
//!
//! ---
//!
//! Provides the IScene trait and all scene implementations (Menu, Combat, Cinematic).

pub mod i_scene;
pub mod combat_scene;
pub mod menu_scene;
pub mod cinematic_scene;

pub use i_scene::IScene;
pub use combat_scene::CombatScene;
pub use menu_scene::MenuScene;
pub use cinematic_scene::CinematicScene;

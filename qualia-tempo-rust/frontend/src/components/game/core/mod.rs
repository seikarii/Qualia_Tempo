//! # Responsibility
//! Game core components module - main game orchestration and rendering.

pub mod qualia_tempo_game;
pub mod field_container;
pub mod player_renderer;
pub mod boss_renderer;
pub mod input_visualizer;
pub mod audio_visualizer;
pub mod particle_field;

pub use qualia_tempo_game::{QualiaTempoGame, GamePhase, PlayerState, BossState, QualiaState, GameEndData};
pub use field_container::FieldContainer;
pub use player_renderer::{PlayerRenderer, PlayerPosition};
pub use boss_renderer::{BossRenderer, BossPosition, BossPhase};
pub use input_visualizer::{InputVisualizer, InputEvent};
pub use audio_visualizer::AudioVisualizer;
pub use particle_field::{ParticleField, ParticleFieldConfig};

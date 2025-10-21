//! # Responsibility
//! Service layer orchestration and dependency injection.

pub mod audio_analyzer;
pub mod audio_effects;
pub mod audio_player;
pub mod interfaces;
pub mod multi_channel_output;
pub mod visualization_engine;

pub use audio_analyzer::AudioAnalyzerService;
pub use audio_effects::AudioEffectsService;
pub use audio_player::AudioPlayerService;
pub use multi_channel_output::MultiChannelOutputService;
pub use visualization_engine::VisualizationEngineService;

//! # Responsibility
//! Service layer orchestration and dependency injection.

use shaku::module;

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

// Shaku DI module containing all audio-forge services.
// Provides centralized service registration and resolution for:
// - IAudioPlayer → AudioPlayerService
// - IAudioAnalyzer → AudioAnalyzerService
// - IVisualizationEngine → VisualizationEngineService
// - IAudioEffects → AudioEffectsService
// - IMultiChannelOutput → MultiChannelOutputService
module! {
    pub AudioForgeModule {
        components = [
            AudioPlayerService,
            AudioAnalyzerService,
            VisualizationEngineService,
            AudioEffectsService,
            MultiChannelOutputService,
        ],
        providers = []
    }
}

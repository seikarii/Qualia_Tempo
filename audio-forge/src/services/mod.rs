//! # Responsibility
//! Service layer orchestration and dependency injection.

use shaku::module;

pub mod analyzing_source;
pub mod application_services;
pub mod audio_analyzer;
pub mod audio_effects;
pub mod audio_exporter;
pub mod audio_player;
pub mod effects_source;
pub mod event_bus;
pub mod interfaces;
pub mod multi_channel_output;
pub mod sample_counting_source;
pub mod upmixing_source;
pub mod validators;
pub mod visualization_engine;

pub use analyzing_source::{AnalyzingSource, SampleBuffer};
pub use application_services::{ApplicationServices, IApplicationServices};
pub use audio_analyzer::AudioAnalyzerService;
pub use audio_effects::AudioEffectsService;
pub use audio_exporter::AudioExporterService;
pub use audio_player::AudioPlayerService;
pub use effects_source::EffectsSource;
pub use event_bus::{EventBusService, IEventBus};
pub use multi_channel_output::MultiChannelOutputService;
pub use sample_counting_source::SampleCountingSource;
pub use upmixing_source::UpmixingSource;
pub use validators::AudioFileValidator;
pub use visualization_engine::VisualizationEngineService;

// Shaku DI module containing all audio-forge services.
// Provides centralized service registration and resolution for:
// - IAudioPlayer → AudioPlayerService
// - IAudioAnalyzer → AudioAnalyzerService
// - IVisualizationEngine → VisualizationEngineService
// - IAudioEffects → AudioEffectsService
// - IMultiChannelOutput → MultiChannelOutputService
// - IAudioExporter → AudioExporterService (Directive 17)
// - IEventBus → EventBusService (Lock-free pub/sub)
// - IApplicationServices → ApplicationServices (Aggregate pattern)
module! {
    pub AudioForgeModule {
        components = [
            AudioPlayerService,
            AudioAnalyzerService,
            VisualizationEngineService,
            AudioEffectsService,
            MultiChannelOutputService,
            AudioExporterService,
            EventBusService,
            ApplicationServices,
        ],
        providers = []
    }
}

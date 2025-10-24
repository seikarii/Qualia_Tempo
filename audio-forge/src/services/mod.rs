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
pub mod logger;
pub mod multi_channel_output;
pub mod sample_counting_source;
pub mod seekable_source;
pub mod upmixing_source;
pub mod validators;
pub mod visualization_engine;

// High-fidelity mocks for all service interfaces (test-only)
#[cfg(test)]
pub mod mocks;

pub use analyzing_source::{AnalyzingSource, SampleBuffer};
pub use application_services::{ApplicationServices, IApplicationServices};
pub use audio_analyzer::AudioAnalyzerService;
pub use audio_effects::AudioEffectsService;
pub use audio_exporter::AudioExporterService;
pub use audio_player::AudioPlayerService;
pub use effects_source::EffectsSource;
pub use event_bus::{EventBusService, IEventBus};
pub use logger::QualiaLogger;
pub use multi_channel_output::MultiChannelOutputService;
pub use sample_counting_source::SampleCountingSource;
pub use seekable_source::SeekableSource;
pub use upmixing_source::UpmixingSource;
pub use validators::AudioFileValidator;
pub use visualization_engine::VisualizationEngineService;

// Shaku DI module containing all audio-forge services + UI components.
// Provides centralized service registration and resolution for:
// - ILogger → QualiaLogger (Structured logging abstraction)
// - IAudioPlayer → AudioPlayerService
// - IAudioAnalyzer → AudioAnalyzerService
// - IVisualizationEngine → VisualizationEngineService
// - IAudioEffects → AudioEffectsService
// - IMultiChannelOutput → MultiChannelOutputService
// - IAudioExporter → AudioExporterService (Directive 17)
// - IEventBus → EventBusService (Lock-free pub/sub)
// - IApplicationServices → ApplicationServices (Aggregate pattern)
// - IMainWindow → MainWindow (ABSOLUTE DI PURITY - UI as Shaku Component)
module! {
    pub AudioForgeModule {
        components = [
            QualiaLogger,
            AudioPlayerService,
            AudioAnalyzerService,
            VisualizationEngineService,
            AudioEffectsService,
            MultiChannelOutputService,
            AudioExporterService,
            EventBusService,
            ApplicationServices,
            crate::ui::MainWindow,
        ],
        providers = []
    }
}

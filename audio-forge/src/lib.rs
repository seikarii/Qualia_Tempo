//! # Responsibility
//! Audio-forge library public API exports.

pub mod config;
pub mod contracts;
pub mod events;
pub mod services;
pub mod ui;

pub use config::{load_config, save_config, AppConfig, AudioConfig, VisualizationConfig};
pub use contracts::{ChannelConfiguration, ChannelMode, EffectConfig, FrequencySpectrum};
pub use events::AudioForgeEvent;
pub use services::{
    AudioAnalyzerService, AudioEffectsService, AudioForgeModule, AudioPlayerService,
    EventBusService, IEventBus, MultiChannelOutputService, VisualizationEngineService,
};

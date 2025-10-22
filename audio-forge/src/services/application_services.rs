//! # Responsibility
//! Aggregate service container providing unified access to all core services.
//!
//! ---
//!
//! Eliminates Service Locator anti-pattern by wrapping all 7 services
//! into a single injectable component. MainWindow receives this aggregate
//! instead of individual services, reducing coupling.

use crate::services::event_bus::IEventBus;
use crate::services::interfaces::{
    IAudioAnalyzer, IAudioEffects, IAudioExporter, IAudioPlayer, IMultiChannelOutput,
    IVisualizationEngine,
};
use shaku::{Component, Interface};
use std::sync::Arc;

/// # Responsibility
/// Interface for accessing all application services.
///
/// ---
///
/// Provides immutable getter methods for each service.
/// Implementations MUST be thread-safe (Arc<dyn Trait>).
pub trait IApplicationServices: Interface {
    fn audio_player(&self) -> Arc<dyn IAudioPlayer>;
    fn audio_analyzer(&self) -> Arc<dyn IAudioAnalyzer>;
    fn visualization_engine(&self) -> Arc<dyn IVisualizationEngine>;
    fn audio_effects(&self) -> Arc<dyn IAudioEffects>;
    fn audio_exporter(&self) -> Arc<dyn IAudioExporter>;
    fn multi_channel_output(&self) -> Arc<dyn IMultiChannelOutput>;
    fn event_bus(&self) -> Arc<dyn IEventBus>;
}

/// # Responsibility
/// Shaku Component implementation of IApplicationServices.
///
/// ---
///
/// All services are injected via Shaku DI at construction time.
/// This struct is immutable - services cannot be replaced after creation.
#[derive(Component)]
#[shaku(interface = IApplicationServices)]
pub struct ApplicationServices {
    #[shaku(inject)]
    audio_player: Arc<dyn IAudioPlayer>,

    #[shaku(inject)]
    audio_analyzer: Arc<dyn IAudioAnalyzer>,

    #[shaku(inject)]
    visualization_engine: Arc<dyn IVisualizationEngine>,

    #[shaku(inject)]
    audio_effects: Arc<dyn IAudioEffects>,

    #[shaku(inject)]
    audio_exporter: Arc<dyn IAudioExporter>,

    #[shaku(inject)]
    multi_channel_output: Arc<dyn IMultiChannelOutput>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}

impl IApplicationServices for ApplicationServices {
    fn audio_player(&self) -> Arc<dyn IAudioPlayer> {
        self.audio_player.clone()
    }

    fn audio_analyzer(&self) -> Arc<dyn IAudioAnalyzer> {
        self.audio_analyzer.clone()
    }

    fn visualization_engine(&self) -> Arc<dyn IVisualizationEngine> {
        self.visualization_engine.clone()
    }

    fn audio_effects(&self) -> Arc<dyn IAudioEffects> {
        self.audio_effects.clone()
    }

    fn audio_exporter(&self) -> Arc<dyn IAudioExporter> {
        self.audio_exporter.clone()
    }

    fn multi_channel_output(&self) -> Arc<dyn IMultiChannelOutput> {
        self.multi_channel_output.clone()
    }
    
    fn event_bus(&self) -> Arc<dyn IEventBus> {
        self.event_bus.clone()
    }
}

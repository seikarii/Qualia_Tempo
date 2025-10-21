//! # Responsibility
//! Application entry point with egui initialization and Shaku DI.

use audio_forge::services::interfaces::{
    IAudioAnalyzer, IAudioEffects, IAudioPlayer, IMultiChannelOutput, IVisualizationEngine,
};
use audio_forge::ui::MainWindow;
use audio_forge::AudioForgeModule;
use eframe::egui;
use shaku::HasComponent;
use std::sync::Arc;

fn main() -> Result<(), eframe::Error> {
    tracing_subscriber::fmt::init();

    // Build Shaku DI module
    let module = AudioForgeModule::builder().build();

    // Resolve services via DI
    let audio_player: Arc<dyn IAudioPlayer> = module.resolve();
    let audio_analyzer: Arc<dyn IAudioAnalyzer> = module.resolve();
    let visualization_engine: Arc<dyn IVisualizationEngine> = module.resolve();
    let audio_effects: Arc<dyn IAudioEffects> = module.resolve();
    let multi_channel_output: Arc<dyn IMultiChannelOutput> = module.resolve();

    let mut main_window = MainWindow::new(
        audio_player,
        audio_analyzer,
        visualization_engine,
        audio_effects,
        multi_channel_output,
    );

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1280.0, 800.0])
            .with_title("Audio Forge - Phase 1 (DI Architecture Corrected)"),
        ..Default::default()
    };

    eframe::run_simple_native("audio-forge", options, move |ctx, _frame| {
        main_window.update(ctx);
    })
}

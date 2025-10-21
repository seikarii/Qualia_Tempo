//! # Responsibility
//! Application entry point with egui initialization.

use audio_forge::ui::MainWindow;
use audio_forge::{
    AudioAnalyzerService, AudioEffectsService, AudioPlayerService, MultiChannelOutputService,
    VisualizationEngineService,
};
use eframe::egui;
use std::sync::Arc;

fn main() -> Result<(), eframe::Error> {
    tracing_subscriber::fmt::init();

    // Initialize services (use defaults for Phase 4)
    let audio_player = Arc::new(AudioPlayerService::default());
    let audio_analyzer = Arc::new(AudioAnalyzerService::default());
    let visualization_engine = Arc::new(VisualizationEngineService::new());
    let audio_effects = Arc::new(AudioEffectsService::default());
    let multi_channel_output = Arc::new(MultiChannelOutputService::default());

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
            .with_title("Audio Forge - Phase 4 (Multi-Channel Output)"),
        ..Default::default()
    };

    eframe::run_simple_native("audio-forge", options, move |ctx, _frame| {
        main_window.update(ctx);
    })
}

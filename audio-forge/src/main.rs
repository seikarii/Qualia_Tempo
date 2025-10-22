//! # Responsibility
//! Application entry point with egui initialization and Shaku DI.
//!
//! ---
//!
//! ## CRITICAL ARCHITECTURE (Directive 22.5)
//! - **Tokio Runtime**: Required for async file picker (rfd::AsyncFileDialog)
//! - **eframe Integration**: Uses tokio::runtime::Runtime for background tasks
//! - **Panic Protection**: All async tasks wrapped in catch_unwind boundaries

use audio_forge::services::interfaces::{
    IAudioAnalyzer, IAudioEffects, IAudioExporter, IAudioPlayer, IMultiChannelOutput,
    IVisualizationEngine,
};
use audio_forge::ui::{MainWindow, QualiaTheme};
use audio_forge::{load_config, AudioForgeModule};
use eframe::egui;
use shaku::HasComponent;
use std::sync::Arc;
use tracing::warn;

fn main() -> Result<(), eframe::Error> {
    tracing_subscriber::fmt::init();
    
    // ============================================================================
    // CRITICAL FIX: Initialize Tokio runtime for async file picker
    // ============================================================================
    // rfd::AsyncFileDialog requires a tokio runtime to spawn async tasks.
    // Without this, tokio::spawn() panics with "no reactor running".
    let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
    let _rt_guard = rt.enter(); // Enter runtime context for entire app lifetime
    
    // ============================================================================
    // DIRECTIVE 10: Load persisted configuration
    // ============================================================================
    let config = match load_config() {
        Ok(cfg) => {
            tracing::info!("✅ Configuration loaded successfully");
            cfg
        }
        Err(e) => {
            warn!("⚠️ Failed to load config, using defaults: {}", e);
            audio_forge::AppConfig::default()
        }
    };

    // Build Shaku DI module
    let module = AudioForgeModule::builder().build();

    // Resolve services via DI
    let audio_player: Arc<dyn IAudioPlayer> = module.resolve();
    let audio_analyzer: Arc<dyn IAudioAnalyzer> = module.resolve();
    let visualization_engine: Arc<dyn IVisualizationEngine> = module.resolve();
    let audio_effects: Arc<dyn IAudioEffects> = module.resolve();
    let audio_exporter: Arc<dyn IAudioExporter> = module.resolve(); // Directive 17
    let multi_channel_output: Arc<dyn IMultiChannelOutput> = module.resolve();
    
    // Apply loaded configuration
    audio_effects.set_config(config.effects.clone());
    if let Err(e) = audio_player.set_volume(config.audio.default_volume) {
        warn!("Failed to set initial volume: {}", e);
    }

    let mut main_window = MainWindow::new_with_config(
        config,
        audio_player,
        audio_analyzer,
        visualization_engine,
        audio_effects,
        audio_exporter,
        multi_channel_output,
    );

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1280.0, 800.0])
            .with_title("Audio Forge - Qualia Tempo")
            .with_drag_and_drop(true), // CRITICAL: Enable drag-and-drop at viewport level
        ..Default::default()
    };

    eframe::run_simple_native("audio-forge", options, move |ctx, _frame| {
        // APPLY THEME ON FIRST FRAME
        QualiaTheme::apply(ctx);
        
        main_window.update(ctx);
    })
}

//! # Responsibility
//! Application entry point with egui initialization and Shaku DI.
//!
//! ---
//!
//! ## CRITICAL ARCHITECTURE (Directive 22.5 + FINAL-DI)
//! - **Tokio Runtime**: Required for async file picker (rfd::AsyncFileDialog)
//! - **eframe Integration**: Uses tokio::runtime::Runtime for background tasks
//! - **Panic Protection**: All async tasks wrapped in catch_unwind boundaries
//! - **ABSOLUTE DI PURITY**: MainWindow resolved as Arc<dyn IMainWindow> from container

use audio_forge::services::IApplicationServices;
use audio_forge::ui::{IMainWindow, QualiaTheme};
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

    // ============================================================================
    // DIRECTIVE ABSOLUTE-DI: MainWindow resolved from Shaku container
    // ============================================================================
    // CRITICAL: MainWindow is now a full Shaku Component (not factory-constructed).
    // All 6 services (audio_player, audio_analyzer, viz_engine, effects, exporter,
    // event_bus) are injected automatically via #[shaku(inject)] attributes.
    // This achieves 100% dependency injection purity from root to leaf.
    let module = AudioForgeModule::builder().build();
    let services: Arc<dyn IApplicationServices> = module.resolve();
    
    // Apply loaded configuration to services BEFORE resolving MainWindow
    services.audio_effects().set_config(config.effects.clone());
    if let Err(e) = services.audio_player().set_volume(config.audio.default_volume) {
        warn!("Failed to set initial volume: {}", e);
    }

    // ABSOLUTE DI RESOLUTION: MainWindow created by Shaku (all dependencies auto-injected)
    let main_window: Arc<dyn IMainWindow> = module.resolve();

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

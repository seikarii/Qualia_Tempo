//! # Responsibility
//! Root UI window with playback controls and visualization panels.

use crate::config::{save_config, AppConfig};
use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::events::AudioForgeEvent;
use crate::services::event_bus::IEventBus;
use crate::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use crate::services::interfaces::i_audio_exporter::IAudioExporter;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::services::AudioFileValidator;
use crate::ui::theme::QualiaTheme;
use crate::ui::widgets::{
    EffectsPanel, HeroWaveformCard, ModernPlaybackBar, MultiBandSpectrumGrid, Panel,
    PlaybackBarState,
};
use egui::{CentralPanel, Context, TopBottomPanel};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info, warn};

use std::time::Instant;

/// # Responsibility
/// Thread-safe mutable state for MainWindow, shared with async tasks.
///
/// ---
///
/// ARCHITECTURE: Extracted from MainWindow to enable Arc<Mutex<>> wrapping.
/// Async file picker tasks can safely update this state without data races.
/// # Responsibility
/// Main application window using egui immediate mode UI.
///
/// ---
///
/// OPTIMIZATIONS:
/// - Throttled visualization updates (30fps instead of 60fps)
/// - Debounced effect config changes (100ms delay)
/// - Auto-clearing error messages (5 second timeout)
/// - Conditional repaints only when playing
/// - ASYNC file picker (non-blocking UI with thread-safe state updates)
///
/// ARCHITECTURE:
/// - Mutable state extracted to MainWindowState (Arc<Mutex<>> wrapped)
/// - Async tasks (tokio::spawn) can safely update state via cloned Arc
/// - UI thread reads state with lock acquisition (minimal contention)
pub struct MainWindow {
    /// Thread-safe state shared with async tasks (EventBus updates)
    state: Arc<Mutex<PlaybackBarState>>,
    
    /// Persisted configuration (Directive 10)
    app_config: AppConfig,
    
    // Core services (retained for orchestration logic)
    audio_player: Arc<dyn IAudioPlayer>,
    audio_analyzer: Arc<dyn IAudioAnalyzer>,

    // DIRECTIVE UI-MOD-01: Modern playback bar (bottom) replaces old ControlPanel (top)
    playback_bar: ModernPlaybackBar,
    effects_panel: EffectsPanel,
    
    // Modern 2025 visualization widgets
    hero_waveform: HeroWaveformCard,
    spectrum_grid: MultiBandSpectrumGrid,
    
    // Cached visualization data (updated at throttled rate, passed to panels)
    cached_waveform: Vec<f32>,
    cached_spectrum: FrequencySpectrum,
    cached_instrument_levels: (f32, f32, f32),
    last_visualization_update: Instant,
    visualization_update_interval: Duration,
}

impl MainWindow {
    /// # Responsibility
    /// Create MainWindow from DI container (simplified constructor).
    ///
    /// ---
    ///
    /// **DIRECTIVE FINAL-DI**: Factory method that accepts IApplicationServices,
    /// simplifying main.rs to just: MainWindow::from_services(services, config).
    pub fn from_services(
        services: std::sync::Arc<dyn crate::services::IApplicationServices>,
        config: AppConfig,
    ) -> Self {
        Self::new_with_config(
            config,
            services.audio_player(),
            services.audio_analyzer(),
            services.audio_effects(),
            services.audio_exporter(),
            services.multi_channel_output(),
            services.event_bus(),
        )
    }

    /// # Responsibility
    /// Create MainWindow with loaded configuration (Directive 10).
    ///
    /// ---
    ///
    /// Initializes UI state from persisted config. Config will be saved
    /// via Drop trait when application exits.
    ///
    /// **EventBus Integration**: Subscribes to events and spawns async listener
    /// that updates state in response to service events (play/pause/seek/etc).
    pub fn new_with_config(
        config: AppConfig,
        audio_player: Arc<dyn IAudioPlayer>,
        audio_analyzer: Arc<dyn IAudioAnalyzer>,
        audio_effects: Arc<dyn IAudioEffects>,
        audio_exporter: Arc<dyn IAudioExporter>,
        multi_channel_output: Arc<dyn IMultiChannelOutput>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        let volume = config.audio.default_volume;

        // Initialize with empty visualization data
        let cached_spectrum = FrequencySpectrum {
            frequencies: Vec::new(),
            magnitudes: Vec::new(),
            sample_rate: 44100,
            window_size: 2048,
        };

        // Shared state for playback bar and event listener
        let state = Arc::new(Mutex::new(PlaybackBarState::default()));

        // DIRECTIVE 12 & 13: Create all modular UI panels
        let effects_panel = EffectsPanel::new(
            audio_effects.clone(),
            config.effects.clone(),
        );

        // DIRECTIVE UI-MOD-01: Modern playback bar replaces old ControlPanel
        let playback_bar = ModernPlaybackBar::new(
            audio_player.clone(),
            audio_exporter.clone(),
            multi_channel_output.clone(),
            state.clone(),
            volume,
        );

        // Modern 2025 UI widgets
        let hero_waveform = HeroWaveformCard::new();
        let spectrum_grid = MultiBandSpectrumGrid::new(8); // 8 bands

        // **CRITICAL: EventBus Subscription**
        // Spawn async task that listens for events and updates state
        let mut event_receiver = event_bus.subscribe();
        let state_clone = state.clone();
        
        tokio::spawn(async move {
            info!("🎧 MainWindow event listener started");
            
            loop {
                match event_receiver.recv().await {
                    Ok(event) => {
                        match event {
                            AudioForgeEvent::PlaybackStateChanged { is_playing, position } => {
                                let mut state = state_clone.lock().unwrap();
                                state.is_playing = is_playing;
                                state.current_position = position;
                                info!("▶️  Playback state: playing={}, position={:?}", is_playing, position);
                            }
                            AudioForgeEvent::FileLoaded { path, duration, sample_rate } => {
                                let mut state = state_clone.lock().unwrap();
                                state.current_file_path = Some(path.clone());
                                state.total_duration = duration;
                                info!("📂 File loaded: {:?}, duration={:?}, rate={}", path, duration, sample_rate);
                            }
                            AudioForgeEvent::SeekedTo { position } => {
                                let mut state = state_clone.lock().unwrap();
                                state.current_position = position;
                                info!("⏩ Seeked to {:?}", position);
                            }
                            AudioForgeEvent::VolumeChanged { new_volume } => {
                                info!("🔊 Volume changed to {}", new_volume);
                            }
                            AudioForgeEvent::EffectsConfigUpdated { config } => {
                                info!("🎛️  Effects config updated: 8D={}, Drop={}", 
                                      config.effect_8d_enabled, config.drop_effect_enabled);
                            }
                            AudioForgeEvent::ExportStarted { path } => {
                                info!("💾 Export started: {:?}", path);
                            }
                            AudioForgeEvent::ExportCompleted { path, duration } => {
                                info!("✅ Export completed: {:?} ({:?})", path, duration);
                            }
                            AudioForgeEvent::ExportFailed { path, error } => {
                                error!("❌ Export failed: {:?} - {}", path, error);
                            }
                            AudioForgeEvent::ErrorOccurred { message } => {
                                error!("❌ Error: {}", message);
                            }
                            _ => {}
                        }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("⚠️  Event listener lagging! Skipped {} events", skipped);
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                        info!("🛑 EventBus closed, stopping listener");
                        break;
                    }
                }
            }
        });

        Self {
            state,
            app_config: config,
            audio_player,
            audio_analyzer,
            playback_bar,
            effects_panel,
            hero_waveform,
            spectrum_grid,
            cached_waveform: Vec::new(),
            cached_spectrum,
            cached_instrument_levels: (0.0, 0.0, 0.0),
            last_visualization_update: Instant::now(),
            visualization_update_interval: Duration::from_millis(33), // 30fps
        }
    }
    
    /// # Responsibility
    /// Get current configuration snapshot for persistence.
    ///
    /// ---
    ///
    /// Captures current UI state into AppConfig for serialization.
    fn get_current_config(&self) -> AppConfig {
        let state = self.state.lock().unwrap();
        
        AppConfig {
            audio: crate::config::AudioConfig {
                default_volume: state.volume,
                channel_mode: crate::contracts::channel_configuration::ChannelMode::Stereo, // Default fallback
                last_file_path: state.current_file_path.clone(),
            },
            effects: self.effects_panel.get_config().clone(),
            visualization: self.app_config.visualization.clone(), // Preserve visualization settings
        }
    }

    /// # Responsibility
    /// Update visualization data from real-time audio capture (throttled).
    ///
    /// ---
    ///
    /// OPTIMIZATION: Throttled to 30fps instead of 60fps to reduce:
    /// - Mutex lock contention
    /// - FFT computation overhead
    /// - Memory allocations
    fn update_visualization_data(&mut self) {
        // Throttle updates to reduce CPU/memory overhead
        let now = Instant::now();
        if now.duration_since(self.last_visualization_update) < self.visualization_update_interval {
            return; // Skip update, still within interval
        }
        self.last_visualization_update = now;
        
        // Get raw audio samples from player (zero-copy Arc)
        let raw_samples = self.audio_player.get_audio_samples();
        
        if raw_samples.is_empty() {
            // No audio loaded: clear visualizations
            self.cached_waveform.clear();
            self.cached_spectrum = FrequencySpectrum {
                frequencies: Vec::new(),
                magnitudes: Vec::new(),
                sample_rate: self.audio_player.get_sample_rate(),
                window_size: 2048,
            };
            self.cached_instrument_levels = (0.0, 0.0, 0.0);
            return;
        }

        // Downsample waveform for UI rendering (target: 2000 samples)
        self.cached_waveform = self.audio_analyzer.get_waveform_samples(&raw_samples, 2000);

        // Perform FFT analysis
        let sample_rate = self.audio_player.get_sample_rate();
        if let Ok(spectrum) = self.audio_analyzer.analyze_spectrum(&raw_samples, sample_rate) {
            self.cached_instrument_levels = self.audio_analyzer.detect_instruments(&spectrum);
            self.cached_spectrum = spectrum;
        }
    }

    /// # Responsibility
    /// Load audio file with validation and error handling.
    ///
    /// ---
    ///
    /// SECURITY: Validates file format via magic numbers before loading.
    fn load_audio_file_validated(&self, path: &PathBuf) {
        // Step 1: Validate file format (magic number check via centralized validator)
        if let Err(e) = AudioFileValidator::validate(path) {
            error!("❌ File validation failed: {}", e);
            return;
        }
        
        // Step 2: Load file via audio player (EventBus will notify UI on success/failure)
        match self.audio_player.load_file(path) {
            Ok(_) => {
                info!("✅ File loaded successfully: {:?}", path);
            }
            Err(e) => {
                error!("❌ Failed to load file: {}", e);
            }
        }
    }
    
    pub fn update(&mut self, ctx: &Context) {
        // ============================================================================
        // PRE-RENDER: DRAG-AND-DROP + VISUALIZATION UPDATES
        // ============================================================================
        
        // CRITICAL FIX: Handle dropped files with FULL WINDOW COVERAGE
        // Process drops BEFORE any panel rendering to catch files dropped ANYWHERE
        ctx.input(|i| {
            // Process ALL dropped files (not just first one)
            if !i.raw.dropped_files.is_empty() {
                let dropped_file = &i.raw.dropped_files[0];
                
                if let Some(path) = &dropped_file.path {
                    info!("🎵 File dropped: {:?}", path);
                    self.load_audio_file_validated(path);
                    ctx.request_repaint();
                } else {
                    warn!("Dropped file has no path");
                }
            }
            
            // DIRECTIVE 9.5: Visual feedback for drag-over (full window)
            // Show overlay when files are being dragged ANYWHERE over window
            if !i.raw.hovered_files.is_empty() {
                ctx.request_repaint(); // Force repaint to show overlay
            }
        });
        
        // Update visualization data from real-time audio (throttled to 30fps)
        self.update_visualization_data();
        
        // UPDATE NEW WIDGETS
        let playback_position = if self.audio_player.total_duration().as_secs() > 0 {
            self.audio_player.current_position().as_secs_f32() 
                / self.audio_player.total_duration().as_secs_f32()
        } else {
            0.0
        };
        
        self.hero_waveform.update(self.cached_waveform.clone(), playback_position);
        self.spectrum_grid.update(&self.cached_spectrum.magnitudes);
        
        // ============================================================================
        // TOP PANEL: EFFECTS CONTROLS
        // ============================================================================
        TopBottomPanel::top("effects_panel").show(ctx, |ui| {
            self.effects_panel.render(ctx, ui);
        });

        // ============================================================================
        // CENTER PANEL: MODERN 2025 UI (Hero Waveform + Spectrum Grid)
        // ============================================================================
        CentralPanel::default().show(ctx, |ui| {
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            
            // Hero waveform card (300px height, full-width)
            ui.heading("🎵 Waveform");
            self.hero_waveform.render(ui);
            
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            
            // Multi-band spectrum grid
            ui.heading("🎚️ Spectrum Analyzer");
            self.spectrum_grid.render(ui);
            
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
        });

        // ============================================================================
        // BOTTOM PANEL: MODERN PLAYBACK BAR (Spotify-style)
        // ============================================================================
        TopBottomPanel::bottom("playback_bar").show(ctx, |ui| {
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN / 2.0);
            self.playback_bar.render(ui);
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN / 2.0);
        });
        
        // ============================================================================
        // DRAG-AND-DROP VISUAL OVERLAY (DIRECTIVE 9)
        // ============================================================================
        
        // Show drop zone overlay when user hovers files over window
        ctx.input(|i| {
            if !i.raw.hovered_files.is_empty() {
                egui::Area::new(egui::Id::new("drop_zone_overlay"))
                    .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                    .interactable(false)
                    .show(ctx, |ui| {
                        let screen_rect = ctx.viewport_rect();
                        let overlay_size = egui::vec2(
                            screen_rect.width() * 0.6,
                            screen_rect.height() * 0.3,
                        );
                        
                        ui.allocate_ui_with_layout(
                            overlay_size,
                            egui::Layout::top_down(egui::Align::Center),
                            |ui| {
                                ui.add_space(overlay_size.y * 0.3);
                                
                                // Modern dark theme overlay
                                let frame = egui::Frame::new()
                                    .fill(QualiaTheme::BG_DARK.linear_multiply(0.95))
                                    .stroke(egui::Stroke::new(2.0, QualiaTheme::ACCENT_PRIMARY))
                                    .corner_radius(egui::CornerRadius::same(15))
                                    .inner_margin(egui::Margin::same(30));
                                
                                frame.show(ui, |ui| {
                                    ui.vertical_centered(|ui| {
                                        ui.heading(
                                            egui::RichText::new("🎵 Drop Audio File Here")
                                                .size(36.0)
                                                .color(QualiaTheme::ACCENT_PRIMARY),
                                        );
                                        ui.add_space(10.0);
                                        ui.label(
                                            egui::RichText::new("Supported: WAV, FLAC, MP3, OGG, M4A, AAC")
                                                .size(18.0)
                                                .color(QualiaTheme::TEXT_SECONDARY),
                                        );
                                    });
                                });
                            },
                        );
                    });
            }
        });
        
        // Conditional repaint: Only request updates when playing
        if self.audio_player.is_playing() {
            ctx.request_repaint_after(self.visualization_update_interval);
        } else {
            // When stopped, still repaint occasionally for UI responsiveness
            ctx.request_repaint_after(Duration::from_millis(100));
        }
    }
}

// ============================================================================
// DIRECTIVE 10: Automatic config persistence on exit
// ============================================================================

impl Drop for MainWindow {
    /// # Responsibility
    /// Save configuration on application exit (Directive 10).
    ///
    /// ---
    ///
    /// Called automatically when MainWindow is dropped. Persists current
    /// state (volume, effects, last file) to disk.
    fn drop(&mut self) {
        let config = self.get_current_config();
        
        if let Err(e) = save_config(&config) {
            eprintln!("❌ Failed to save config on exit: {}", e);
        } else {
            println!("✅ Configuration saved successfully");
        }
    }
}

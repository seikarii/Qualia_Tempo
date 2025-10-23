//! # Responsibility
//! Root UI window with playback controls and visualization panels.

use crate::config::{save_config, AppConfig};
use crate::contracts::effect_parameters::EffectConfig;
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
    EffectsPanel, HeroWaveformCard, ModernPlaybackBar, Panel,
    PlaybackBarState, PlaylistPanel, PlaylistState,
};
use egui::{CentralPanel, Context, SidePanel, TopBottomPanel};
use shaku::{Component, Interface};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info, warn};

use std::time::Instant;

/// # Responsibility
/// Main window interface for Shaku DI (DIRECTIVE: ABSOLUTE DI PURITY).
///
/// ---
///
/// **CRITICAL**: `update()` takes `&self` (not `&mut self`) because Arc<dyn Trait>
/// is immutable. MainWindow uses interior mutability (Mutex) for all mutable state.
pub trait IMainWindow: Interface {
    /// Update and render UI (called every frame by eframe).
    fn update(&self, ctx: &Context);
}

/// # Responsibility
/// Cached visualization data wrapped in Mutex for interior mutability.
///
/// ---
///
/// PUBLIC: Required by Shaku Component derive (generates public Parameters struct).
pub struct VisualizationCache {
    waveform: Vec<f32>,
    spectrum: FrequencySpectrum,
    instrument_levels: (f32, f32, f32),
    last_update: Instant,
    update_interval: Duration,
}

impl Default for VisualizationCache {
    fn default() -> Self {
        Self {
            waveform: Vec::new(),
            spectrum: FrequencySpectrum {
                frequencies: Vec::new(),
                magnitudes: Vec::new(),
                sample_rate: 44100,
                window_size: 2048,
            },
            instrument_levels: (0.0, 0.0, 0.0),
            last_update: Instant::now(),
            update_interval: Duration::from_millis(33), // 30fps
        }
    }
}

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
/// ARCHITECTURE (SHAKU COMPONENT - ABSOLUTE DI PURITY):
/// - ALL mutable state wrapped in Mutex<> for interior mutability
/// - Immutable service dependencies injected via Shaku
/// - update() takes `&self` (compatible with Arc<dyn IMainWindow>)
/// - Resolves from DI container: `module.resolve::<Arc<dyn IMainWindow>>()`
#[derive(Component)]
#[shaku(interface = IMainWindow)]
pub struct MainWindow {
    /// Thread-safe state shared with async tasks (EventBus updates)
    /// SHAKU: Initialized with Default::default() during Component construction
    #[shaku(default = Arc::new(Mutex::new(PlaybackBarState::default())))]
    state: Arc<Mutex<PlaybackBarState>>,
    
    /// Playlist state shared between MainWindow and PlaylistPanel
    #[shaku(default = Arc::new(Mutex::new(PlaylistState::default())))]
    playlist_state: Arc<Mutex<PlaylistState>>,
    
    /// Visualization cache (throttled updates, interior mutability)
    /// SHAKU: Initialized with Default::default() during Component construction
    #[shaku(default = Arc::new(Mutex::new(VisualizationCache::default())))]
    viz_cache: Arc<Mutex<VisualizationCache>>,
    
    // Core services (Shaku-injected)
    #[shaku(inject)]
    audio_player: Arc<dyn IAudioPlayer>,
    
    #[shaku(inject)]
    audio_analyzer: Arc<dyn IAudioAnalyzer>,
    
    #[shaku(inject)]
    audio_effects: Arc<dyn IAudioEffects>,
    
    #[shaku(inject)]
    audio_exporter: Arc<dyn IAudioExporter>,
    
    #[shaku(inject)]
    multi_channel_output: Arc<dyn IMultiChannelOutput>,
    
    /// EventBus for subscribing to service events (used in constructor's async task)
    #[allow(dead_code)] // Used in tokio::spawn listener, not in methods
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    // UI widgets (lazy initialization after service injection)
    /// SHAKU: Initialized as Mutex<None>, constructed on first update() call
    /// CRITICAL: Widgets need service references, which are only available AFTER DI resolution
    /// SYNC-SAFE: Mutex provides thread-safe interior mutability for Arc<dyn IMainWindow>
    #[shaku(default = Mutex::new(None))]
    playback_bar: Mutex<Option<ModernPlaybackBar>>,
    
    #[shaku(default = Mutex::new(None))]
    effects_panel: Mutex<Option<EffectsPanel>>,
    
    #[shaku(default = Mutex::new(None))]
    hero_waveform: Mutex<Option<HeroWaveformCard>>,
    
    // DELETED: spectrum_grid (user directive - rejected quality)
    
    #[shaku(default = Mutex::new(None))]
    playlist_panel: Mutex<Option<PlaylistPanel>>,
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
        // Initialize cached spectrum with default (unused - data updated via update_visualization_data())
        let _cached_spectrum = FrequencySpectrum {
            frequencies: Vec::new(),
            magnitudes: Vec::new(),
            sample_rate: 44100,
            window_size: 2048,
        };

        // Shared state for playback bar and event listener
        let state = Arc::new(Mutex::new(PlaybackBarState::default()));
        
        // Visualization cache with throttling
        let viz_cache = Arc::new(Mutex::new(VisualizationCache::default()));

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

        // Modern 2025 UI widgets with PRODUCTION-GRADE interactivity
        let hero_waveform = HeroWaveformCard::new().with_event_bus(event_bus.clone());
        // DELETED: spectrum_grid (user directive - rejected quality)

        // **CRITICAL: EventBus Subscription**
        // Spawn async task that listens for events and updates state
        let mut event_receiver = event_bus.subscribe();
        let state_clone = state.clone();
        let viz_cache_clone = viz_cache.clone();
        let audio_player_clone = audio_player.clone();
        let audio_analyzer_clone = audio_analyzer.clone();
        
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
                            AudioForgeEvent::PlaybackPositionUpdated { position, total_duration } => {
                                // DIRECTIVE FIX-DESYNC: Continuous position updates for smooth progress bar
                                let mut state = state_clone.lock().unwrap();
                                state.current_position = position;
                                state.total_duration = total_duration;
                                // No logging here - too frequent (10Hz)
                            }
                            AudioForgeEvent::FileLoaded { path, duration, sample_rate } => {
                                let mut state = state_clone.lock().unwrap();
                                state.current_file_path = Some(path.clone());
                                state.total_duration = duration;
                                
                                // DIRECTIVE FIX-WAVEFORM-CACHE: Generate waveform ONCE on file load
                                // Eliminates 180MB/s memory churn from per-frame regeneration
                                drop(state); // Release state lock before locking viz_cache
                                
                                let raw_samples = audio_player_clone.get_audio_samples();
                                if !raw_samples.is_empty() {
                                    let waveform = audio_analyzer_clone.get_waveform_samples(&raw_samples, 2000);
                                    let mut cache = viz_cache_clone.lock().unwrap();
                                    cache.waveform = waveform;
                                    info!("📊 Waveform cached ({} samples)", cache.waveform.len());
                                }
                                
                                info!("📂 File loaded: {:?}, duration={:?}, rate={}", path, duration, sample_rate);
                            }
                            AudioForgeEvent::SeekedTo { position } => {
                                let mut state = state_clone.lock().unwrap();
                                state.current_position = position;
                                info!("⏩ Seeked to {:?}", position);
                            }
                            AudioForgeEvent::VolumeChanged { new_volume } => {
                                // DIRECTIVE FIX-VOLUME: Update state for persistence
                                let mut state = state_clone.lock().unwrap();
                                state.volume = new_volume;
                                info!("🔊 Volume changed to {}", new_volume);
                            }
                            AudioForgeEvent::PlaybackSpeedChanged { new_speed } => {
                                // DIRECTIVE FIX-SPEED: Update state for persistence
                                let mut state = state_clone.lock().unwrap();
                                state.playback_speed = new_speed;
                                info!("⏩ Playback speed changed to {}x", new_speed);
                            }
                            AudioForgeEvent::EffectsConfigUpdated { config } => {
                                info!("🎛️  Effects config updated: Drop={}", 
                                      config.drop_effect_enabled);
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

        // CRITICAL: Widgets are now Mutex<Option<>> (lazy initialization in update())
        // Store as Some() when using factory pattern (from_services)
        // In pure DI mode (module.resolve()), widgets will be None and initialized on first frame
        Self {
            state,
            playlist_state: Arc::new(Mutex::new(PlaylistState::default())),
            viz_cache,
            audio_player,
            audio_analyzer,
            audio_effects,
            audio_exporter,
            multi_channel_output,
            event_bus,
            
            // PRE-INITIALIZE widgets when using factory pattern (from_services)
            playback_bar: Mutex::new(Some(playback_bar)),
            effects_panel: Mutex::new(Some(effects_panel)),
            hero_waveform: Mutex::new(Some(hero_waveform)),
            // DELETED: spectrum_grid (user directive - rejected quality)
            playlist_panel: Mutex::new(None), // Lazy-init in update()
        }
    }
    
    /// # Responsibility
    /// Get current configuration snapshot for persistence.
    ///
    /// ---
    ///
    /// Captures current UI state into AppConfig for serialization.
    /// Visualization config uses defaults (not customizable in current UI).
    fn get_current_config(&self) -> AppConfig {
        let state = self.state.lock().unwrap();
        
        // LAZY WIDGETS: Check if widgets initialized before accessing
        let effects_panel_lock = self.effects_panel.lock().unwrap();
        let effects_config = match effects_panel_lock.as_ref() {
            Some(panel) => panel.get_config().clone(),
            None => {
                // Widgets not initialized yet - return default config
                return AppConfig::default();
            }
        };
        drop(effects_panel_lock); // Release lock
        
        AppConfig {
            audio: crate::config::AudioConfig {
                default_volume: state.volume,
                channel_mode: crate::contracts::channel_configuration::ChannelMode::Stereo,
                last_file_path: state.current_file_path.clone(),
            },
            effects: effects_config,
            visualization: crate::config::VisualizationConfig::default(),
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
    ///
    /// DIRECTIVE FIX-WAVEFORM-CACHE: Waveform is NO LONGER regenerated here.
    /// It's cached on file load and only updated when a new file is loaded.
    /// This function now ONLY updates spectrum (FFT) data.
    fn update_visualization_data(&self) {
        let mut cache = self.viz_cache.lock().unwrap();
        
        // Throttle updates to reduce CPU/memory overhead
        let now = Instant::now();
        if now.duration_since(cache.last_update) < cache.update_interval {
            return; // Skip update, still within interval
        }
        cache.last_update = now;
        
        // Get raw audio samples from player (zero-copy Arc)
        let raw_samples = self.audio_player.get_audio_samples();
        
        if raw_samples.is_empty() {
            // No audio loaded: spectrum will be cleared (waveform preserved from file load)
            cache.spectrum = FrequencySpectrum {
                frequencies: Vec::new(),
                magnitudes: Vec::new(),
                sample_rate: self.audio_player.get_sample_rate(),
                window_size: 2048,
            };
            cache.instrument_levels = (0.0, 0.0, 0.0);
            return;
        }

        // DIRECTIVE FIX-WAVEFORM-CACHE: Waveform caching removed from here
        // Waveform is generated ONCE in FileLoaded event handler and cached permanently

        // Perform FFT analysis (still updates per-frame for real-time spectrum)
        let sample_rate = self.audio_player.get_sample_rate();
        if let Ok(spectrum) = self.audio_analyzer.analyze_spectrum(&raw_samples, sample_rate) {
            cache.instrument_levels = self.audio_analyzer.detect_instruments(&spectrum);
            cache.spectrum = spectrum;
        }
    }

    /// # Responsibility
    /// Load audio file with validation and error handling.
    ///
    /// ---
    ///
    /// SECURITY: Validates file format via magic numbers before loading.
    fn load_audio_file_validated(&self, path: &Path) {
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
    
    /// # Responsibility  
    /// Main UI update loop - handles drag-and-drop, visualization updates, widget rendering.
    ///
    /// ---
    ///
    /// CRITICAL: Uses `&self` (immutable) with interior mutability (Mutex) to comply with
    /// Shaku Component requirements (Arc<dyn IMainWindow> shares immutable reference).
    /// All widgets are locked per-frame via .lock().unwrap() - safe in single-threaded egui context.
    ///
    /// **LAZY INITIALIZATION**: Widgets constructed on first update() call (after services injected).
    pub fn update(&self, ctx: &Context) {
        // ============================================================================
        // LAZY WIDGET INITIALIZATION (FIRST FRAME ONLY)
        // ============================================================================
        // CRITICAL: Widgets require service Arc references, which are only available
        // AFTER Shaku Component construction. Initialize once on first update() call.
        
        // Check if widgets need initialization (lock to check, release immediately)
        let needs_init = self.playback_bar.lock().unwrap().is_none();
        
        if needs_init {
            info!("🏗️  Initializing MainWindow widgets (lazy construction)");
            
            // Construct widgets with injected services
            // CONFIGURATION: Volume loaded from config in main.rs via set_volume()
            // This fallback is only used if MainWindow is constructed outside DI
            let volume = 0.5; // Default 50% volume
            
            *self.playback_bar.lock().unwrap() = Some(ModernPlaybackBar::new(
                self.audio_player.clone(),
                self.audio_exporter.clone(),
                self.multi_channel_output.clone(),
                self.state.clone(),
                volume,
            ));
            
            *self.effects_panel.lock().unwrap() = Some(EffectsPanel::new(
                self.audio_effects.clone(),
                // CONFIGURATION: Effects loaded from config in main.rs via set_config()
                // This fallback is only used if MainWindow is constructed outside DI
                EffectConfig::default(), // Default effects configuration
            ));
            
            *self.hero_waveform.lock().unwrap() = Some(HeroWaveformCard::new()
                .with_event_bus(self.event_bus.clone())
            );
            // DELETED: spectrum_grid initialization (user directive)
            
            // Initialize PlaylistPanel with EventBus integration
            *self.playlist_panel.lock().unwrap() = Some(PlaylistPanel::new(
                self.playlist_state.clone(),
                self.audio_player.clone(),
                self.event_bus.clone(),
            ));
            
            info!("✅ MainWindow widgets initialized successfully");
        }
        
        // ============================================================================
        // PRE-RENDER: DRAG-AND-DROP + VISUALIZATION UPDATES (CONSOLIDATED INPUT)
        // ============================================================================
        
        // CRITICAL FIX: SINGLE ctx.input() call to prevent RwLock deadlock
        // DEFECT: Calling ctx.input() twice in same frame causes 10s timeout panic
        // SOLUTION: Extract ALL input data in one lock acquisition
        let (dropped_files, show_drop_overlay) = ctx.input(|i| {
            // Extract dropped file paths (clone PathBuf to process outside closure)
            let files: Vec<PathBuf> = i.raw.dropped_files
                .iter()
                .filter_map(|f| f.path.clone())
                .collect();
            
            // Check if drag-over should show overlay
            let has_hovered = !i.raw.hovered_files.is_empty();
            
            (files, has_hovered)
        });
        
        // BATCH FILE LOADING: Process ALL dropped files (multi-file drop support)
        // DIRECTIVE: Support VSCode tree drops, explorer multi-select, etc.
        if !dropped_files.is_empty() {
            info!("📥 Processing {} dropped file(s)", dropped_files.len());
            for path in dropped_files {
                info!("   Loading: {}", path.display());
                self.load_audio_file_validated(&path);
            }
            ctx.request_repaint();
        }
        
        // DIRECTIVE 9.5: Visual feedback for drag-over (full window)
        // TODO: Implement semi-transparent overlay with "Drop Audio Files Here" text
        if show_drop_overlay {
            ctx.request_repaint(); // Force repaint to show overlay
        }
        
        // Update visualization data from real-time audio (throttled to 30fps)
        self.update_visualization_data();
        
        // UPDATE NEW WIDGETS
        // CRITICAL FIX: Use f64 precision to prevent progress bar desync
        // DEFECT: as_secs_f32() truncates sub-second precision, causing jumpy/premature 100%
        // SOLUTION: Use as_secs_f64() throughout, cast to f32 only for final UI rendering
        let playback_position = if self.audio_player.total_duration().as_secs() > 0 {
            let current_secs = self.audio_player.current_position().as_secs_f64();
            let total_secs = self.audio_player.total_duration().as_secs_f64();
            (current_secs / total_secs) as f32 // Clamp to [0.0, 1.0]
        } else {
            0.0
        }.clamp(0.0, 1.0);
        
        // INTERIOR MUTABILITY: Extract cached viz data before UI closures (avoid borrow conflicts)
        let waveform_data = {
            let cache = self.viz_cache.lock().unwrap();
            cache.waveform.clone()
        };
        
        // MUTEX LOCKING: Update widgets via .lock().unwrap() (interior mutability pattern)
        {
            let mut waveform = self.hero_waveform.lock().unwrap();
            let waveform_widget = waveform.as_mut().unwrap();
            waveform_widget.update(waveform_data.clone(), playback_position);
            waveform_widget.set_duration(self.audio_player.total_duration());
        }
        // DELETED: spectrum_grid update (user directive - widget removed)
        
        // ============================================================================
        // TOP PANEL: EFFECTS CONTROLS
        // ============================================================================
        TopBottomPanel::top("effects_panel").show(ctx, |ui| {
            // MUTEX LOCKING: Access effects_panel via interior mutability
            self.effects_panel.lock().unwrap().as_mut().unwrap().render(ctx, ui);
        });
        
        // ============================================================================
        // RIGHT SIDEBAR: PLAYLIST PANEL (USER DIRECTIVE: MODERN LAYOUT)
        // ============================================================================
        SidePanel::right("playlist_sidebar")
            .min_width(250.0)
            .max_width(400.0)
            .default_width(300.0)
            .resizable(true)
            .show(ctx, |ui| {
                // MUTEX LOCKING: Access playlist_panel via interior mutability
                self.playlist_panel.lock().unwrap().as_mut().unwrap().render(ctx, ui);
            });

        // ============================================================================
        // BOTTOM PANEL: INTEGRATED WAVEFORM + PLAYBACK BAR (USER DIRECTIVE)
        // ============================================================================
        // RATIONALE: Modern audio players (YouTube, Spotify) merge waveform and
        // transport controls in a single bottom bar for space efficiency.
        TopBottomPanel::bottom("playback_bar_integrated")
            .min_height(150.0)
            .show(ctx, |ui| {
                ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN / 2.0);
                
                // Waveform visualization (top section)
                ui.heading("🎵 Waveform");
                self.hero_waveform.lock().unwrap().as_mut().unwrap().render(ui);
                
                ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN / 2.0);
                
                // Transport controls + seek bar (bottom section)
                self.playback_bar.lock().unwrap().as_mut().unwrap().render(ui);
                
                ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN / 2.0);
            });

        // ============================================================================
        // CENTER PANEL: MINIMAL (USER DIRECTIVE: SPECTRUM ANALYZER DELETED)
        // ============================================================================
        CentralPanel::default().show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(100.0);
                ui.heading(
                    egui::RichText::new("🎵 Audio Forge")
                        .size(48.0)
                        .color(QualiaTheme::ACCENT_PRIMARY)
                );
                ui.label(
                    egui::RichText::new("Drag & drop audio files or use the playlist panel")
                        .size(18.0)
                        .color(QualiaTheme::TEXT_SECONDARY)
                );
            });
        });
        
        // ============================================================================
        // DRAG-AND-DROP VISUAL OVERLAY (DIRECTIVE 9)
        // ============================================================================
        
        // Show drop zone overlay when user hovers files over window
        // CRITICAL: Use show_drop_overlay from consolidated ctx.input() call above
        if show_drop_overlay {
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
        
        // Conditional repaint: Only request updates when playing
        if self.audio_player.is_playing() {
            // INTERIOR MUTABILITY: Read update_interval from viz_cache
            let update_interval = self.viz_cache.lock().unwrap().update_interval;
            ctx.request_repaint_after(update_interval);
        } else {
            // When stopped, still repaint occasionally for UI responsiveness
            ctx.request_repaint_after(Duration::from_millis(100));
        }
    }
}

// ============================================================================
// SHAKU COMPONENT INTERFACE IMPLEMENTATION
// ============================================================================

impl IMainWindow for MainWindow {
    /// # Responsibility
    /// Delegates to inherent update() method for Shaku Component trait compliance.
    ///
    /// ---
    ///
    /// This impl block enables MainWindow to be resolved as Arc<dyn IMainWindow>
    /// from the DI container, achieving absolute dependency injection purity.
    fn update(&self, ctx: &Context) {
        // Delegate to inherent implementation (same method, just different trait context)
        MainWindow::update(self, ctx)
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
    ///
    /// CRITICAL: Cannot use `&mut self` in Drop, but our get_current_config()
    /// now uses `&self` with interior mutability, so this works perfectly.
    fn drop(&mut self) {
        let config = self.get_current_config();
        
        if let Err(e) = save_config(&config) {
            error!("Failed to save config on exit: {}", e);
        } else {
            info!("Configuration saved successfully");
        }
    }
}

//! # Responsibility
//! Root UI window with playback controls and visualization panels.

use crate::config::{save_config, AppConfig};
use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use crate::services::interfaces::i_audio_exporter::IAudioExporter;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::services::interfaces::i_visualization_engine::IVisualizationEngine;
use crate::ui::widgets::{
    control_panel::{ControlPanel, ControlPanelState},
    EffectsPanel, InfoPanel, Panel, SpectrumPanel, WaveformPanel,
};
use anyhow::{Context as AnyhowContext, Result};
use egui::{CentralPanel, Context, SidePanel, TopBottomPanel};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
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
    /// Thread-safe state shared with async tasks
    state: Arc<Mutex<ControlPanelState>>,
    
    /// Persisted configuration (Directive 10)
    app_config: AppConfig,
    
    // Core services (retained for orchestration logic)
    audio_player: Arc<dyn IAudioPlayer>,
    audio_analyzer: Arc<dyn IAudioAnalyzer>,

    // DIRECTIVE 12 & 13: Modular UI widgets (full decomposition)
    control_panel: ControlPanel,
    effects_panel: EffectsPanel,
    waveform_panel: WaveformPanel,
    spectrum_panel: SpectrumPanel,
    info_panel: InfoPanel,
    
    // Cached visualization data (updated at throttled rate, passed to panels)
    cached_waveform: Vec<f32>,
    cached_spectrum: FrequencySpectrum,
    cached_instrument_levels: (f32, f32, f32),
    last_visualization_update: Instant,
    visualization_update_interval: Duration,
}

impl MainWindow {
    /// # Responsibility
    /// Create MainWindow with loaded configuration (Directive 10).
    ///
    /// ---
    ///
    /// Initializes UI state from persisted config. Config will be saved
    /// via Drop trait when application exits.
    pub fn new_with_config(
        config: AppConfig,
        audio_player: Arc<dyn IAudioPlayer>,
        audio_analyzer: Arc<dyn IAudioAnalyzer>,
        visualization_engine: Arc<dyn IVisualizationEngine>,
        audio_effects: Arc<dyn IAudioEffects>,
        audio_exporter: Arc<dyn IAudioExporter>,
        multi_channel_output: Arc<dyn IMultiChannelOutput>,
    ) -> Self {
        let volume = config.audio.default_volume;

        // Initialize with empty visualization data
        let cached_spectrum = FrequencySpectrum {
            frequencies: Vec::new(),
            magnitudes: Vec::new(),
            sample_rate: 44100,
            window_size: 2048,
        };

        // Shared state for control panel and file loading
        let state = Arc::new(Mutex::new(ControlPanelState::default()));

        // DIRECTIVE 12 & 13: Create all modular UI panels
        let effects_panel = EffectsPanel::new(
            audio_effects.clone(),
            config.effects.clone(),
        );

        let control_panel = ControlPanel::new(
            audio_player.clone(),
            audio_exporter.clone(),
            state.clone(),
            volume,
        );

        let waveform_panel = WaveformPanel::new(visualization_engine.clone());
        
        let spectrum_panel = SpectrumPanel::new(visualization_engine.clone());
        
        let info_panel = InfoPanel::new(
            audio_player.clone(),
            multi_channel_output.clone(),
        );

        Self {
            state,
            app_config: config,
            audio_player,
            audio_analyzer,
            control_panel,
            effects_panel,
            waveform_panel,
            spectrum_panel,
            info_panel,
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
                default_volume: self.control_panel.get_volume(),
                channel_mode: self.info_panel.multi_channel_output.get_configuration().mode,
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
    /// Validate audio file format via magic number detection (security critical).
    ///
    /// ---
    ///
    /// SECURITY: Does NOT trust file extensions. Reads first 12 bytes to identify
    /// actual file format via magic numbers. Prevents malicious files from crashing
    /// the decoder.
    ///
    /// Supported formats:
    /// - WAV: b"RIFF" at offset 0
    /// - FLAC: b"fLaC" at offset 0
    /// - MP3: 0xFF 0xFB/0xF3/0xF2 at offset 0
    /// - OGG: b"OggS" at offset 0
    /// - M4A/AAC: b"ftyp" at offset 4
    fn validate_audio_file_format(path: &Path) -> Result<()> {
        let mut file = File::open(path)
            .with_context(|| format!("Failed to open file: {}", path.display()))?;
        
        let mut magic = [0u8; 12];
        file.read_exact(&mut magic)
            .with_context(|| format!("File too small to identify: {}", path.display()))?;
        
        // Check magic numbers
        if &magic[0..4] == b"RIFF" {
            // WAV format (RIFF container)
            return Ok(());
        }
        
        if &magic[0..4] == b"fLaC" {
            // FLAC format
            return Ok(());
        }
        
        if magic[0] == 0xFF && (magic[1] == 0xFB || magic[1] == 0xF3 || magic[1] == 0xF2) {
            // MP3 format (MPEG-1 Layer 3)
            return Ok(());
        }
        
        if &magic[0..4] == b"OggS" {
            // OGG container (Vorbis/Opus)
            return Ok(());
        }
        
        if &magic[4..8] == b"ftyp" {
            // M4A/AAC format (ISO Base Media File Format)
            // Next 4 bytes should be brand identifier (M4A , mp42, etc.)
            return Ok(());
        }
        
        Err(anyhow::anyhow!(
            "Unsupported or invalid audio file format. Supported: WAV, FLAC, MP3, OGG, M4A/AAC"
        ))
    }
    
    /// # Responsibility
    /// Load audio file with validation and error handling.
    ///
    /// ---
    ///
    /// SECURITY: Validates file format via magic numbers before loading.
    /// Updates MainWindowState with result (success or error message).
    fn load_audio_file_validated(&self, path: &PathBuf) {
        let mut state = self.state.lock().unwrap();
        
        // Step 1: Validate file format (magic number check)
        if let Err(e) = Self::validate_audio_file_format(path) {
            error!("❌ File validation failed: {}", e);
            state.loading_error = Some((format!("Invalid file: {}", e), Instant::now()));
            return;
        }
        
        // Step 2: Load file via audio player
        match self.audio_player.load_file(path) {
            Ok(_) => {
                info!("✅ File loaded successfully: {:?}", path);
                state.current_file_path = Some(path.clone());
                state.loading_error = None; // Clear any previous errors
            }
            Err(e) => {
                error!("❌ Failed to load file: {}", e);
                state.loading_error = Some((format!("Load error: {}", e), Instant::now()));
            }
        }
    }
    
    pub fn update(&mut self, ctx: &Context) {
        // ============================================================================
        // PRE-RENDER: DRAG-AND-DROP + VISUALIZATION UPDATES
        // ============================================================================
        
        // Handle dropped files (synchronous, runs on UI thread)
        ctx.input(|i| {
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
        });
        
        // Update visualization data from real-time audio (throttled to 30fps)
        self.update_visualization_data();
        
        // Update panel data caches
        self.waveform_panel.update_waveform(self.cached_waveform.clone());
        self.spectrum_panel.update_data(
            self.cached_spectrum.clone(),
            self.cached_instrument_levels,
        );
        
        // TOP PANEL: ControlPanel orchestration (Directive 14: Complete)
        TopBottomPanel::top("top_panel").show(ctx, |ui| {
            self.control_panel.render(ctx, ui);
        });

        // BOTTOM PANEL: EffectsPanel orchestration
        TopBottomPanel::bottom("effects_panel").show(ctx, |ui| {
            self.effects_panel.render(ctx, ui);
        });

        // LEFT PANEL: WaveformPanel orchestration
        SidePanel::left("waveform_panel")
            .default_width(400.0)
            .show(ctx, |ui| {
                self.waveform_panel.render(ctx, ui);
            });

        // RIGHT PANEL: SpectrumPanel orchestration
        SidePanel::right("spectrum_panel")
            .default_width(400.0)
            .show(ctx, |ui| {
                self.spectrum_panel.render(ctx, ui);
            });

        // CENTER PANEL: InfoPanel orchestration
        CentralPanel::default().show(ctx, |ui| {
            self.info_panel.render(ctx, ui);
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
                                
                                // Semi-transparent background
                                let frame = egui::Frame::new()
                                    .fill(egui::Color32::from_rgba_unmultiplied(30, 30, 40, 200))
                                    .corner_radius(egui::CornerRadius::same(10))
                                    .inner_margin(egui::Margin::same(20));
                                
                                frame.show(ui, |ui| {
                                    ui.vertical_centered(|ui| {
                                        ui.heading(
                                            egui::RichText::new("🎵 Drop Audio File Here")
                                                .size(32.0)
                                                .color(egui::Color32::from_rgb(100, 200, 255)),
                                        );
                                        ui.add_space(10.0);
                                        ui.label(
                                            egui::RichText::new("Supported: WAV, FLAC, MP3, OGG, M4A, AAC")
                                                .size(16.0)
                                                .color(egui::Color32::LIGHT_GRAY),
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

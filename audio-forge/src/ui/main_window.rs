//! # Responsibility
//! Root UI window with playback controls and visualization panels.

use crate::config::{save_config, AppConfig};
use crate::contracts::channel_configuration::ChannelMode;
use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::services::interfaces::i_visualization_engine::IVisualizationEngine;
use crate::ui::widgets::{effects_panel::EffectsPanel, Panel};
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
#[derive(Default)]
struct MainWindowState {
    /// Currently loaded audio file path (updated from async tasks)
    current_file_path: Option<PathBuf>,
    
    /// Loading error message with timestamp for auto-clear (5s timeout)
    loading_error: Option<(String, Instant)>,
    
    /// Flag to prevent multiple simultaneous file picker dialogs
    file_picker_open: bool,
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
/// ARCHITECTURE:
/// - Mutable state extracted to MainWindowState (Arc<Mutex<>> wrapped)
/// - Async tasks (tokio::spawn) can safely update state via cloned Arc
/// - UI thread reads state with lock acquisition (minimal contention)
pub struct MainWindow {
    /// Thread-safe state shared with async tasks
    state: Arc<Mutex<MainWindowState>>,
    
    /// Persisted configuration (Directive 10)
    app_config: AppConfig,
    
    audio_player: Arc<dyn IAudioPlayer>,
    audio_analyzer: Arc<dyn IAudioAnalyzer>,
    visualization_engine: Arc<dyn IVisualizationEngine>,
    multi_channel_output: Arc<dyn IMultiChannelOutput>,

    // DIRECTIVE 12: Modular UI widgets (extracted from monolith)
    effects_panel: EffectsPanel,
    
    // Cached visualization data (UI-thread only, updated at throttled rate)
    cached_waveform: Vec<f32>,
    cached_spectrum: FrequencySpectrum,
    cached_instrument_levels: (f32, f32, f32),
    last_visualization_update: Instant,
    visualization_update_interval: Duration,
    
    // Playback state (UI-thread only)
    volume: f32,
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

        // DIRECTIVE 12: Create modular effects panel with injected service
        let effects_panel = EffectsPanel::new(
            audio_effects.clone(),
            config.effects.clone(),
        );

        Self {
            state: Arc::new(Mutex::new(MainWindowState::default())),
            app_config: config,
            audio_player,
            audio_analyzer,
            visualization_engine,
            multi_channel_output,
            effects_panel,
            cached_waveform: Vec::new(),
            cached_spectrum,
            cached_instrument_levels: (0.0, 0.0, 0.0),
            last_visualization_update: Instant::now(),
            visualization_update_interval: Duration::from_millis(33), // 30fps
            volume,
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
                default_volume: self.volume,
                channel_mode: self.multi_channel_output.get_configuration().mode,
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
    
    /// # Responsibility
    /// Handle file loading via ASYNC native file picker dialog.
    ///
    /// ---
    ///
    /// ARCHITECTURE: Thread-safe async file picker with state synchronization.
    /// - Uses rfd::AsyncFileDialog to prevent UI freeze
    /// - Spawns tokio task with cloned Arc<Mutex<MainWindowState>>
    /// - Updates state (file path, errors) from async context safely
    /// - UI reflects state changes via request_repaint()
    fn handle_load_file(&self, ctx: &Context) {
        // Check if picker already open (prevent multiple dialogs)
        {
            let mut state = self.state.lock().unwrap();
            if state.file_picker_open {
                return;
            }
            state.file_picker_open = true;
        }
        
        // Clone Arc references for async task
        let state_clone = self.state.clone();
        let audio_player_clone = self.audio_player.clone();
        let ctx_clone = ctx.clone();
        
        // Spawn async file picker (non-blocking)
        tokio::spawn(async move {
            let file_handle = rfd::AsyncFileDialog::new()
                .add_filter("Audio Files", &["mp3", "wav", "flac", "ogg", "m4a", "aac"])
                .set_title("Select Audio File")
                .pick_file()
                .await;
            
            // Lock state to update from async context
            let mut state = state_clone.lock().unwrap();
            state.file_picker_open = false; // Reset flag regardless of outcome
            
            if let Some(file) = file_handle {
                let file_path = file.path().to_path_buf();
                info!("User selected file via picker: {:?}", file_path);
                
                // Release lock before validation (avoid deadlock)
                drop(state);
                
                // Validate and load file (handles state updates internally)
                // Note: This creates a temporary self-like struct for the closure
                // In production, refactor to accept services as parameters
                if let Err(e) = Self::validate_audio_file_format(&file_path) {
                    error!("❌ File validation failed: {}", e);
                    let mut state = state_clone.lock().unwrap();
                    state.loading_error = Some((format!("Invalid file: {}", e), Instant::now()));
                } else {
                    // Load validated file
                    match audio_player_clone.load_file(&file_path) {
                        Ok(_) => {
                            info!("✅ File loaded successfully: {:?}", file_path);
                            let mut state = state_clone.lock().unwrap();
                            state.current_file_path = Some(file_path);
                            state.loading_error = None;
                        }
                        Err(e) => {
                            error!("❌ Failed to load file: {}", e);
                            let mut state = state_clone.lock().unwrap();
                            state.loading_error = Some((format!("Load error: {}", e), Instant::now()));
                        }
                    }
                }
            } else {
                info!("File picker cancelled by user");
            }
            
            ctx_clone.request_repaint(); // Update UI after state change
        });
    }

    pub fn update(&mut self, ctx: &Context) {
        // ============================================================================
        // DRAG-AND-DROP FILE HANDLING (DIRECTIVE 9)
        // ============================================================================
        
        // Handle dropped files (synchronous, runs on UI thread)
        ctx.input(|i| {
            if !i.raw.dropped_files.is_empty() {
                let dropped_file = &i.raw.dropped_files[0];
                
                if let Some(path) = &dropped_file.path {
                    info!("🎵 File dropped: {:?}", path);
                    
                    // Validate and load file (magic number check + load)
                    self.load_audio_file_validated(path);
                    
                    ctx.request_repaint(); // Update UI immediately
                } else {
                    warn!("Dropped file has no path");
                }
            }
        });
        
        // Auto-clear errors after 5 seconds (read from shared state)
        {
            let mut state = self.state.lock().unwrap();
            if let Some((_, timestamp)) = &state.loading_error {
                if timestamp.elapsed() > Duration::from_secs(5) {
                    state.loading_error = None;
                }
            }
        }
        
        // Update visualization data from real-time audio (throttled to 30fps)
        self.update_visualization_data();
        
        TopBottomPanel::top("top_panel").show(ctx, |ui| {
            ui.horizontal(|ui| {
                // File loading button (PRIMARY ACTION - ASYNC)
                if ui.button("📁 Load Audio File")
                    .on_hover_text("Open audio file (MP3, WAV, FLAC, OGG) - Non-blocking")
                    .clicked() 
                {
                    self.handle_load_file(ctx);
                }
                
                ui.separator();
                
                if ui.button("▶ Play")
                    .on_hover_text("Start/resume playback")
                    .clicked()
                {
                    if let Err(e) = self.audio_player.play() {
                        error!("Play failed: {}", e);
                    }
                }

                if ui.button("⏸ Pause")
                    .on_hover_text("Pause playback (preserves position)")
                    .clicked()
                {
                    if let Err(e) = self.audio_player.pause() {
                        error!("Pause failed: {}", e);
                    }
                }

                if ui.button("⏹ Stop")
                    .on_hover_text("Stop playback (resets to beginning)")
                    .clicked()
                {
                    if let Err(e) = self.audio_player.stop() {
                        error!("Stop failed: {}", e);
                    }
                }

                ui.separator();
                
                // Display current file name (read from shared state)
                {
                    let state = self.state.lock().unwrap();
                    if let Some(ref path) = state.current_file_path {
                        ui.label(format!("🎵 {}", path.file_name().unwrap().to_str().unwrap_or("Unknown")));
                    } else {
                        ui.label("No file loaded");
                    }
                }
                
                ui.separator();
                
                // Volume control
                ui.label("🔊 Volume:");
                let volume_response = ui.add(egui::Slider::new(&mut self.volume, 0.0..=1.0)
                    .text("")
                    .show_value(false));
                
                if volume_response.changed() {
                    if let Err(e) = self.audio_player.set_volume(self.volume) {
                        error!("Set volume failed: {}", e);
                    }
                }
                
                ui.label(format!("{}%", (self.volume * 100.0) as u8));
                
                ui.separator();
                
                ui.label(format!(
                    "Duration: {:.2}s",
                    self.audio_player.total_duration().as_secs_f32()
                ));

                ui.label(format!(
                    "Status: {}",
                    if self.audio_player.is_playing() {
                        "🎵 Playing"
                    } else {
                        "⏸ Stopped"
                    }
                ));
            });
            
            // Display loading errors with auto-clear countdown (read from shared state)
            {
                let state = self.state.lock().unwrap();
                if let Some((ref error_msg, timestamp)) = state.loading_error {
                    let elapsed = timestamp.elapsed().as_secs();
                    let remaining = 5_u64.saturating_sub(elapsed);
                    ui.colored_label(
                        egui::Color32::RED, 
                        format!("❌ {} (clears in {}s)", error_msg, remaining)
                    );
                }
            }
            
            // Seek bar (only show if audio is loaded)
            let total_duration = self.audio_player.total_duration();
            if total_duration > Duration::ZERO {
                ui.separator();
                ui.horizontal(|ui| {
                    ui.label("Position:");
                    
                    let current_pos = self.audio_player.current_position();
                    let mut position_secs = current_pos.as_secs_f32();
                    let duration_secs = total_duration.as_secs_f32();
                    
                    // Seek slider
                    let slider = egui::Slider::new(&mut position_secs, 0.0..=duration_secs)
                        .text("s")
                        .show_value(true);
                    
                    if ui.add(slider).changed() {
                        // User dragged slider - seek to new position
                        let new_position = Duration::from_secs_f32(position_secs);
                        if let Err(e) = self.audio_player.seek(new_position) {
                            error!("Seek failed: {}", e);
                        }
                    }
                    
                    // Display formatted time
                    ui.label(format!(
                        "{:02}:{:02} / {:02}:{:02}",
                        (current_pos.as_secs() / 60) % 60,
                        current_pos.as_secs() % 60,
                        (total_duration.as_secs() / 60) % 60,
                        total_duration.as_secs() % 60
                    ));
                });
            }
        });

        // ====================================================================
        // DIRECTIVE 12: Bottom panel delegated to EffectsPanel widget
        // ====================================================================
        TopBottomPanel::bottom("effects_panel").show(ctx, |ui| {
            self.effects_panel.render(ui);
        });

        // Left panel: Waveform visualization
        SidePanel::left("waveform_panel")
            .default_width(400.0)
            .show(ctx, |ui| {
                ui.heading("Waveform (Time Domain)");
                
                if self.cached_waveform.is_empty() {
                    ui.label("🎵 Load an audio file to see waveform");
                } else {
                    self.visualization_engine
                        .render_waveform(ui, &self.cached_waveform);
                }
            });

        // Right panel: Spectrum + Instrument Map
        SidePanel::right("spectrum_panel")
            .default_width(400.0)
            .show(ctx, |ui| {
                ui.heading("Frequency Spectrum");
                
                if self.cached_spectrum.frequencies.is_empty() {
                    ui.label("🎵 Load an audio file to see spectrum");
                } else {
                    self.visualization_engine
                        .render_spectrum(ui, &self.cached_spectrum);
                }

                ui.separator();

                ui.heading("Instrument Detection");
                
                if self.cached_spectrum.frequencies.is_empty() {
                    ui.label("🎵 Load an audio file to see instrument levels");
                } else {
                    let (bass, mid, treble) = self.cached_instrument_levels;
                    self.visualization_engine
                        .render_instrument_map(ui, bass, mid, treble);
                }
            });

        // Center panel: Info
        CentralPanel::default().show(ctx, |ui| {
            ui.heading("Audio Forge - Phase 2 Complete: Real-Time Visualization");
            ui.label("✅ Real-time audio sample capture");
            ui.label("✅ Live waveform rendering from playback");
            ui.label("✅ Live FFT spectrum analysis");
            ui.label("✅ Real-time instrument detection (Bass/Mid/Treble)");
            ui.label("✅ Audio effects: 8D, Drop, Bass/Treble Boost");
            ui.label("✅ 8.1 surround channel support");
            ui.separator();

            // Channel configuration status
            let channel_config = self.multi_channel_output.get_configuration();
            ui.heading("🔊 Channel Configuration");

            ui.horizontal(|ui| {
                ui.label("Current Mode:");
                match channel_config.mode {
                    ChannelMode::Stereo => {
                        ui.colored_label(egui::Color32::LIGHT_BLUE, "Stereo (2.0)");
                    }
                    ChannelMode::Surround8_1 => {
                        ui.colored_label(egui::Color32::GREEN, "Surround (8.1)");
                    }
                }
            });

            ui.horizontal(|ui| {
                ui.label("8.1 Hardware:");
                if channel_config.is_8_1_available {
                    ui.colored_label(egui::Color32::GREEN, "✅ Available");
                } else {
                    ui.colored_label(egui::Color32::GRAY, "❌ Not Available");
                }
            });

            ui.horizontal(|ui| {
                ui.label("Channels:");
                ui.label(format!("{}", channel_config.channel_count()));
            });

            ui.horizontal(|ui| {
                ui.label("Sample Rate:");
                ui.label(format!("{} Hz", channel_config.sample_rate));
            });

            ui.separator();

            // Channel mode toggle
            ui.horizontal(|ui| {
                if channel_config.is_8_1_available {
                    if ui.button("🔁 Switch to Stereo").clicked() {
                        if let Err(e) = self.multi_channel_output.fallback_to_stereo() {
                            error!("Failed to switch to stereo: {}", e);
                        }
                    }

                    if ui.button("🔁 Configure 8.1").clicked() {
                        if let Err(e) = self.multi_channel_output.configure_8_1_channels() {
                            error!("Failed to configure 8.1: {}", e);
                        }
                    }
                } else {
                    ui.label("⚠️ 8.1 hardware not detected - stereo mode only");
                }
            });

            ui.separator();
            ui.label("🎛️ Effects controls available in bottom panel");
            
            // Show audio status
            if self.audio_player.total_duration() > std::time::Duration::ZERO {
                ui.label("✅ Audio file loaded and ready for visualization");
            } else {
                ui.label("⚠️ No audio file loaded. Drag & drop an audio file or click Load Audio File.");
            }
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

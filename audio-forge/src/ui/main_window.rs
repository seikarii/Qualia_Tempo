//! # Responsibility
//! Root UI window with playback controls and visualization panels.

use crate::contracts::channel_configuration::ChannelMode;
use crate::contracts::effect_parameters::EffectConfig;
use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::services::interfaces::i_visualization_engine::IVisualizationEngine;
use egui::{CentralPanel, Context, SidePanel, TopBottomPanel};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info};

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
    
    audio_player: Arc<dyn IAudioPlayer>,
    audio_analyzer: Arc<dyn IAudioAnalyzer>,
    visualization_engine: Arc<dyn IVisualizationEngine>,
    audio_effects: Arc<dyn IAudioEffects>,
    multi_channel_output: Arc<dyn IMultiChannelOutput>,

    // Effect configuration state (UI-thread only)
    effect_config: EffectConfig,
    pending_config_change: bool,
    last_config_update: Instant,
    
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
    pub fn new(
        audio_player: Arc<dyn IAudioPlayer>,
        audio_analyzer: Arc<dyn IAudioAnalyzer>,
        visualization_engine: Arc<dyn IVisualizationEngine>,
        audio_effects: Arc<dyn IAudioEffects>,
        multi_channel_output: Arc<dyn IMultiChannelOutput>,
    ) -> Self {
        let effect_config = audio_effects.get_config();

        // Initialize with empty visualization data
        let cached_spectrum = FrequencySpectrum {
            frequencies: Vec::new(),
            magnitudes: Vec::new(),
            sample_rate: 44100,
            window_size: 2048,
        };

        Self {
            state: Arc::new(Mutex::new(MainWindowState::default())),
            audio_player,
            audio_analyzer,
            visualization_engine,
            audio_effects,
            multi_channel_output,
            effect_config,
            pending_config_change: false,
            last_config_update: Instant::now(),
            cached_waveform: Vec::new(),
            cached_spectrum,
            cached_instrument_levels: (0.0, 0.0, 0.0),
            last_visualization_update: Instant::now(),
            visualization_update_interval: Duration::from_millis(33), // 30fps
            volume: 1.0, // Default 100% volume
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
                info!("User selected file: {:?}", file_path);
                
                // Load file and update state based on result
                match audio_player_clone.load_file(&file_path) {
                    Ok(_) => {
                        info!("✅ File loaded successfully: {:?}", file_path);
                        state.current_file_path = Some(file_path);
                        state.loading_error = None; // Clear any previous errors
                    }
                    Err(e) => {
                        error!("❌ Failed to load file: {}", e);
                        state.loading_error = Some((format!("Load error: {}", e), Instant::now()));
                    }
                }
            } else {
                info!("File picker cancelled by user");
            }
            
            // Release lock before requesting repaint
            drop(state);
            ctx_clone.request_repaint(); // Update UI after state change
        });
    }

    pub fn update(&mut self, ctx: &Context) {
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

        // Bottom panel: Effects controls
        TopBottomPanel::bottom("effects_panel").show(ctx, |ui| {
            ui.heading("🎛️ Audio Effects - Real-Time DSP");
            
            let mut config_changed = false;

            ui.horizontal(|ui| {
                // 8D Effect controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        if ui.checkbox(&mut self.effect_config.effect_8d_enabled, "8D Audio")
                            .on_hover_text("Circular panning effect for immersive spatial audio")
                            .changed() 
                        {
                            config_changed = true;
                        }
                        if self.effect_config.effect_8d_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Intensity:");
                                if ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.effect_8d_intensity,
                                        0.0..=1.0,
                                    )
                                    .text(""),
                                )
                                .on_hover_text("Depth of panning effect (0.0 = subtle, 1.0 = extreme)")
                                .changed() {
                                    config_changed = true;
                                }
                            });
                            ui.horizontal(|ui| {
                                ui.label("Speed (Hz):");
                                if ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.effect_8d_rotation_hz,
                                        0.1..=1.0,
                                    )
                                    .text(""),
                                )
                                .on_hover_text("Rotation frequency (0.1Hz = slow, 1.0Hz = fast)")
                                .changed() {
                                    config_changed = true;
                                }
                            });
                        }
                    });
                });

                ui.separator();

                // Drop Effect controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        if ui.checkbox(&mut self.effect_config.drop_effect_enabled, "Drop Effect")
                            .on_hover_text("Volume reduction effect (sudden drop)")
                            .changed() 
                        {
                            config_changed = true;
                        }
                        if self.effect_config.drop_effect_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Amount:");
                                if ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.drop_amount,
                                        0.0..=1.0,
                                    )
                                    .text(""),
                                )
                                .on_hover_text("Volume attenuation (0.0 = no drop, 1.0 = complete silence)")
                                .changed() {
                                    config_changed = true;
                                }
                            });
                        }
                    });
                });

                ui.separator();

                // Bass Boost controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        if ui.checkbox(&mut self.effect_config.bass_boost_enabled, "Bass Boost")
                            .on_hover_text("Amplify low frequencies (20-250Hz)")
                            .changed() 
                        {
                            config_changed = true;
                        }
                        if self.effect_config.bass_boost_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Gain:");
                                if ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.bass_boost_gain,
                                        1.0..=3.0,
                                    )
                                    .text("x"),
                                )
                                .on_hover_text("Gain multiplier (1.0 = no boost, 3.0 = +9.5dB)")
                                .changed() {
                                    config_changed = true;
                                }
                            });
                        }
                    });
                });

                ui.separator();

                // Treble Boost controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        if ui.checkbox(&mut self.effect_config.treble_boost_enabled, "Treble Boost")
                            .on_hover_text("Amplify high frequencies (4kHz-20kHz)")
                            .changed() 
                        {
                            config_changed = true;
                        }
                        if self.effect_config.treble_boost_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Gain:");
                                if ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.treble_boost_gain,
                                        1.0..=3.0,
                                    )
                                    .text("x"),
                                )
                                .on_hover_text("Gain multiplier (1.0 = no boost, 3.0 = +9.5dB)")
                                .changed() {
                                    config_changed = true;
                                }
                            });
                        }
                    });
                });
            });

            // Debounce config changes to reduce mutex lock spam
            if config_changed {
                self.pending_config_change = true;
            }
            
            // Apply debounced config after 100ms of no changes
            if self.pending_config_change {
                let now = Instant::now();
                if now.duration_since(self.last_config_update) > Duration::from_millis(100) {
                    self.audio_effects.set_config(self.effect_config.clone());
                    self.pending_config_change = false;
                    self.last_config_update = now;
                }
            }
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
                ui.label("⚠️ No audio file loaded. Load a file to see real-time visualization.");
            }
        });
        
        // Conditional repaint: Only request updates when playing or if config pending
        if self.audio_player.is_playing() || self.pending_config_change {
            ctx.request_repaint_after(self.visualization_update_interval);
        } else {
            // When stopped, still repaint occasionally for UI responsiveness
            ctx.request_repaint_after(Duration::from_millis(100));
        }
    }
}

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
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info};

/// # Responsibility
/// Main application window using egui immediate mode UI.
pub struct MainWindow {
    audio_player: Arc<dyn IAudioPlayer>,
    audio_analyzer: Arc<dyn IAudioAnalyzer>,
    visualization_engine: Arc<dyn IVisualizationEngine>,
    audio_effects: Arc<dyn IAudioEffects>,
    multi_channel_output: Arc<dyn IMultiChannelOutput>,

    // Effect configuration state
    effect_config: EffectConfig,
    
    // Cached visualization data (updated each frame)
    cached_waveform: Vec<f32>,
    cached_spectrum: FrequencySpectrum,
    cached_instrument_levels: (f32, f32, f32),
    
    // File loading state
    current_file_path: Option<PathBuf>,
    loading_error: Option<String>,
    
    // Playback state
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
            audio_player,
            audio_analyzer,
            visualization_engine,
            audio_effects,
            multi_channel_output,
            effect_config,
            cached_waveform: Vec::new(),
            cached_spectrum,
            cached_instrument_levels: (0.0, 0.0, 0.0),
            current_file_path: None,
            loading_error: None,
            volume: 1.0, // Default 100% volume
        }
    }

    /// # Responsibility
    /// Update visualization data from real-time audio capture.
    ///
    /// ---
    ///
    /// Called every frame to refresh waveform and spectrum data.
    /// Limits waveform to 2000 samples for UI performance.
    fn update_visualization_data(&mut self) {
        // Get raw audio samples from player
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
    /// Handle file loading via native file picker dialog.
    ///
    /// ---
    ///
    /// Opens async file dialog, validates audio format, loads into player.
    fn handle_load_file(&mut self) {
        // Open file picker (blocking call, but rfd is fast)
        if let Some(file_path) = rfd::FileDialog::new()
            .add_filter("Audio Files", &["mp3", "wav", "flac", "ogg", "m4a", "aac"])
            .set_title("Select Audio File")
            .pick_file()
        {
            info!("User selected file: {:?}", file_path);
            
            // Attempt to load file
            match self.audio_player.load_file(&file_path) {
                Ok(_) => {
                    info!("✅ File loaded successfully: {:?}", file_path);
                    self.current_file_path = Some(file_path);
                    self.loading_error = None;
                }
                Err(e) => {
                    error!("❌ Failed to load file: {}", e);
                    self.loading_error = Some(format!("Load error: {}", e));
                    self.current_file_path = None;
                }
            }
        } else {
            info!("File picker cancelled by user");
        }
    }

    pub fn update(&mut self, ctx: &Context) {
        // Update visualization data from real-time audio
        self.update_visualization_data();
        
        TopBottomPanel::top("top_panel").show(ctx, |ui| {
            ui.horizontal(|ui| {
                // File loading button (PRIMARY ACTION)
                if ui.button("📁 Load Audio File")
                    .on_hover_text("Open audio file (MP3, WAV, FLAC, OGG)")
                    .clicked() 
                {
                    self.handle_load_file();
                }
                
                ui.separator();
                
                if ui.button("▶ Play")
                    .on_hover_text("Start/resume playback")
                    .clicked()
                    && let Err(e) = self.audio_player.play()
                {
                    error!("Play failed: {}", e);
                }

                if ui.button("⏸ Pause")
                    .on_hover_text("Pause playback (preserves position)")
                    .clicked()
                    && let Err(e) = self.audio_player.pause()
                {
                    error!("Pause failed: {}", e);
                }

                if ui.button("⏹ Stop")
                    .on_hover_text("Stop playback (resets to beginning)")
                    .clicked()
                    && let Err(e) = self.audio_player.stop()
                {
                    error!("Stop failed: {}", e);
                }

                ui.separator();
                
                // Display current file name
                if let Some(ref path) = self.current_file_path {
                    ui.label(format!("🎵 {}", path.file_name().unwrap().to_str().unwrap_or("Unknown")));
                } else {
                    ui.label("No file loaded");
                }
                
                ui.separator();
                
                // Volume control
                ui.label("🔊 Volume:");
                let volume_slider = egui::Slider::new(&mut self.volume, 0.0..=1.0)
                    .text("")
                    .show_value(false);
                
                if ui.add(volume_slider)
                    .on_hover_text("Master volume (0% = mute, 100% = full)")
                    .changed()
                    && let Err(e) = self.audio_player.set_volume(self.volume)
                {
                    error!("Failed to set volume: {}", e);
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
            
            // Display loading errors if any
            if let Some(ref error_msg) = self.loading_error {
                ui.colored_label(egui::Color32::RED, format!("❌ {}", error_msg));
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

            // Apply config changes immediately (real-time updates)
            if config_changed {
                self.audio_effects.set_config(self.effect_config.clone());
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
                    if ui.button("🔁 Switch to Stereo").clicked()
                        && let Err(e) = self.multi_channel_output.fallback_to_stereo()
                    {
                        error!("Failed to switch to stereo: {}", e);
                    }

                    if ui.button("🔁 Configure 8.1").clicked()
                        && let Err(e) = self.multi_channel_output.configure_8_1_channels()
                    {
                        error!("Failed to configure 8.1: {}", e);
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
        
        // Request repaint for smooth visualization updates
        ctx.request_repaint();
    }
}

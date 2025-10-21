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
use std::sync::Arc;
use tracing::error;

/// # Responsibility
/// Main application window using egui immediate mode UI.
pub struct MainWindow {
    audio_player: Arc<dyn IAudioPlayer>,
    audio_analyzer: Arc<dyn IAudioAnalyzer>,
    visualization_engine: Arc<dyn IVisualizationEngine>,
    audio_effects: Arc<dyn IAudioEffects>,
    multi_channel_output: Arc<dyn IMultiChannelOutput>,

    // Demo data for visualization (will be replaced with real-time data)
    demo_waveform: Vec<f32>,
    demo_spectrum: FrequencySpectrum,

    // Effect configuration state
    effect_config: EffectConfig,
}

impl MainWindow {
    pub fn new(
        audio_player: Arc<dyn IAudioPlayer>,
        audio_analyzer: Arc<dyn IAudioAnalyzer>,
        visualization_engine: Arc<dyn IVisualizationEngine>,
        audio_effects: Arc<dyn IAudioEffects>,
        multi_channel_output: Arc<dyn IMultiChannelOutput>,
    ) -> Self {
        // Generate demo sine wave for initial visualization
        let demo_waveform: Vec<f32> = (0..1000).map(|i| (i as f32 * 0.05).sin() * 0.5).collect();

        // Generate demo spectrum data
        let demo_spectrum = FrequencySpectrum {
            frequencies: (0..50).map(|i| i as f32 * 100.0).collect(),
            magnitudes: (0..50)
                .map(|i| {
                    let freq = i as f32;
                    // Simulate decreasing magnitude with frequency
                    (1.0 - freq / 50.0).max(0.1)
                })
                .collect(),
            sample_rate: 44100,
            window_size: 2048,
        };

        let effect_config = audio_effects.get_config();

        Self {
            audio_player,
            audio_analyzer,
            visualization_engine,
            audio_effects,
            multi_channel_output,
            demo_waveform,
            demo_spectrum,
            effect_config,
        }
    }

    pub fn update(&mut self, ctx: &Context) {
        TopBottomPanel::top("top_panel").show(ctx, |ui| {
            ui.horizontal(|ui| {
                if ui.button("▶ Play").clicked()
                    && let Err(e) = self.audio_player.play()
                {
                    error!("Play failed: {}", e);
                }

                if ui.button("⏸ Pause").clicked()
                    && let Err(e) = self.audio_player.pause()
                {
                    error!("Pause failed: {}", e);
                }

                if ui.button("⏹ Stop").clicked()
                    && let Err(e) = self.audio_player.stop()
                {
                    error!("Stop failed: {}", e);
                }

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
        });

        // Bottom panel: Effects controls
        TopBottomPanel::bottom("effects_panel").show(ctx, |ui| {
            ui.heading("🎛️ Audio Effects");

            ui.horizontal(|ui| {
                // 8D Effect controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.checkbox(&mut self.effect_config.effect_8d_enabled, "8D Audio");
                        if self.effect_config.effect_8d_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Intensity:");
                                ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.effect_8d_intensity,
                                        0.0..=1.0,
                                    )
                                    .text(""),
                                );
                            });
                            ui.horizontal(|ui| {
                                ui.label("Speed (Hz):");
                                ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.effect_8d_rotation_hz,
                                        0.1..=1.0,
                                    )
                                    .text(""),
                                );
                            });
                        }
                    });
                });

                ui.separator();

                // Drop Effect controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.checkbox(&mut self.effect_config.drop_effect_enabled, "Drop Effect");
                        if self.effect_config.drop_effect_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Amount:");
                                ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.drop_amount,
                                        0.0..=1.0,
                                    )
                                    .text(""),
                                );
                            });
                        }
                    });
                });

                ui.separator();

                // Bass Boost controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.checkbox(&mut self.effect_config.bass_boost_enabled, "Bass Boost");
                        if self.effect_config.bass_boost_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Gain:");
                                ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.bass_boost_gain,
                                        1.0..=3.0,
                                    )
                                    .text("x"),
                                );
                            });
                        }
                    });
                });

                ui.separator();

                // Treble Boost controls
                ui.group(|ui| {
                    ui.vertical(|ui| {
                        ui.checkbox(&mut self.effect_config.treble_boost_enabled, "Treble Boost");
                        if self.effect_config.treble_boost_enabled {
                            ui.horizontal(|ui| {
                                ui.label("Gain:");
                                ui.add(
                                    egui::Slider::new(
                                        &mut self.effect_config.treble_boost_gain,
                                        1.0..=3.0,
                                    )
                                    .text("x"),
                                );
                            });
                        }
                    });
                });
            });

            // Update audio effects service with new config
            if ui.button("Apply Effects").clicked() {
                self.audio_effects.set_config(self.effect_config.clone());
                ui.label("✅ Effects config applied (pipeline integration pending)");
            }
        });

        // Left panel: Waveform visualization
        SidePanel::left("waveform_panel")
            .default_width(400.0)
            .show(ctx, |ui| {
                ui.heading("Waveform (Time Domain)");
                self.visualization_engine
                    .render_waveform(ui, &self.demo_waveform);
            });

        // Right panel: Spectrum + Instrument Map
        SidePanel::right("spectrum_panel")
            .default_width(400.0)
            .show(ctx, |ui| {
                ui.heading("Frequency Spectrum");
                self.visualization_engine
                    .render_spectrum(ui, &self.demo_spectrum);

                ui.separator();

                ui.heading("Instrument Detection");
                let (bass, mid, treble) =
                    self.audio_analyzer.detect_instruments(&self.demo_spectrum);
                self.visualization_engine
                    .render_instrument_map(ui, bass, mid, treble);
            });

        // Center panel: Info
        CentralPanel::default().show(ctx, |ui| {
            ui.heading("Audio Forge - Phase 4 (Multi-Channel Output)");
            ui.label("✅ Real-time waveform rendering");
            ui.label("✅ FFT frequency spectrum analysis");
            ui.label("✅ Instrument detection (Bass/Mid/Treble)");
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
            ui.label("📊 Demo data displayed. Load audio file for real-time processing.");
        });
    }
}

//! # Responsibility
//! Central information panel with status, channel config, and help text.
//!
//! ---
//!
//! Extracted from MainWindow (Directive 13). This widget encapsulates:
//! - Application status summary
//! - Channel configuration display
//! - Channel mode switching controls
//! - Help messages and instructions

use crate::contracts::channel_configuration::ChannelMode;
use crate::services::interfaces::{
    i_audio_player::IAudioPlayer,
    i_multi_channel_output::IMultiChannelOutput,
};
use crate::ui::widgets::Panel;
use egui;
use std::sync::Arc;
use std::time::Duration;
use tracing::error;

/// # Responsibility
/// Information panel for status and channel configuration.
///
/// ---
///
/// ## Architecture
/// - **Read-only Display**: Shows service state without mutations
/// - **Channel Controls**: Provides buttons to switch channel modes
pub struct InfoPanel {
    /// Audio player service (for status display)
    audio_player: Arc<dyn IAudioPlayer>,
    
    /// Multi-channel output service (for config display/control)
    pub multi_channel_output: Arc<dyn IMultiChannelOutput>,
}

impl InfoPanel {
    /// # Responsibility
    /// Create new InfoPanel with injected dependencies.
    ///
    /// ---
    ///
    /// ## Parameters
    /// - `audio_player`: Service for playback status
    /// - `multi_channel_output`: Service for channel configuration
    pub fn new(
        audio_player: Arc<dyn IAudioPlayer>,
        multi_channel_output: Arc<dyn IMultiChannelOutput>,
    ) -> Self {
        Self {
            audio_player,
            multi_channel_output,
        }
    }
}

impl Panel for InfoPanel {
    /// # Responsibility
    /// Render information panel with status and channel controls.
    ///
    /// ---
    ///
    /// ## Returns
    /// `false` (no config changes)
    fn render(&mut self, ui: &mut egui::Ui) -> bool {
        ui.heading("🎵 Audio Forge - Real-Time Visualization & Effects");
        ui.separator();

        // ====================================================================
        // FEATURES SUMMARY
        // ====================================================================
        ui.label("🎧 Features:");
        ui.label("✅ Live FFT spectrum analysis");
        ui.label("✅ Real-time instrument detection (Bass/Mid/Treble)");
        ui.label("✅ Audio effects: 8D, Drop, Bass/Treble Boost");
        ui.label("✅ 8.1 surround channel support");
        ui.separator();

        // ====================================================================
        // CHANNEL CONFIGURATION STATUS
        // ====================================================================
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

        // ====================================================================
        // CHANNEL MODE CONTROLS
        // ====================================================================
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
        
        // ====================================================================
        // HELP MESSAGES
        // ====================================================================
        ui.label("🎛️ Effects controls available in bottom panel");
        
        if self.audio_player.total_duration() > Duration::ZERO {
            ui.label("✅ Audio file loaded and ready for visualization");
        } else {
            ui.label("⚠️ No audio file loaded. Drag & drop an audio file or click Load Audio File.");
        }
        
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::interfaces::i_audio_player::IAudioPlayer;
    use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
    use crate::services::AudioForgeModule;
    use shaku::HasComponent;
    
    #[test]
    fn test_info_panel_creates_with_valid_services() {
        let module = AudioForgeModule::builder().build();
        let player: Arc<dyn IAudioPlayer> = module.resolve();
        let multi_channel: Arc<dyn IMultiChannelOutput> = module.resolve();
        
        let _panel = InfoPanel::new(player, multi_channel);
        
        // If construction succeeds, test passes
    }
}

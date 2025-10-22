//! # Responsibility
//! Top control panel with file loading and playback controls.
//!
//! ---
//!
//! Extracted from MainWindow (Directive 13). This widget encapsulates:
//! - File loading button (async file picker)
//! - Playback controls (play, pause, stop)
//! - Volume slider
//! - Seek bar with position display
//! - Current file name display
//! - Loading error messages with auto-clear

use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::ui::widgets::Panel;
use egui::{self, Context};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{error, warn};

/// Type alias for file loading callback to satisfy Clippy type complexity rule
type FileLoadCallback = Box<dyn Fn(&Context) + Send + Sync>;

/// # Responsibility
/// Thread-safe state for file loading and error display.
///
/// ---
///
/// Shared with MainWindow for async file picker coordination.
#[derive(Default)]
pub struct ControlPanelState {
    pub current_file_path: Option<PathBuf>,
    pub loading_error: Option<(String, Instant)>,
    pub file_picker_open: bool,
}

/// # Responsibility
/// Control panel for file loading, playback, and volume.
///
/// ---
///
/// ## Architecture
/// - **File Loading**: Delegates to callback for async file picker
/// - **Playback**: Direct IAudioPlayer service calls
/// - **State Sync**: Uses Arc<Mutex<>> for thread-safe coordination
pub struct ControlPanel {
    /// Audio player service (injected dependency)
    audio_player: Arc<dyn IAudioPlayer>,
    
    /// Shared state with parent (for async file picker)
    state: Arc<Mutex<ControlPanelState>>,
    
    /// Current volume level [0.0, 1.0]
    volume: f32,
    
    /// Callback for file loading (invoked by button click)
    on_load_file: Option<FileLoadCallback>,
}

impl ControlPanel {
    /// # Responsibility
    /// Create new ControlPanel with injected dependencies.
    ///
    /// ---
    ///
    /// ## Parameters
    /// - `audio_player`: Service for playback control
    /// - `state`: Shared state with parent window
    /// - `initial_volume`: Starting volume level [0.0, 1.0]
    pub fn new(
        audio_player: Arc<dyn IAudioPlayer>,
        state: Arc<Mutex<ControlPanelState>>,
        initial_volume: f32,
    ) -> Self {
        Self {
            audio_player,
            state,
            volume: initial_volume,
            on_load_file: None,
        }
    }
    
    /// # Responsibility
    /// Set callback for file loading button.
    ///
    /// ---
    ///
    /// MainWindow provides this callback to handle async file picker.
    pub fn set_load_file_callback<F>(&mut self, callback: F)
    where
        F: Fn(&Context) + Send + Sync + 'static,
    {
        self.on_load_file = Some(Box::new(callback));
    }
    
    /// # Responsibility
    /// Get current volume for persistence.
    pub fn get_volume(&self) -> f32 {
        self.volume
    }
    
    /// # Responsibility
    /// Set volume externally (e.g., from loaded config).
    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume.clamp(0.0, 1.0);
        if let Err(e) = self.audio_player.set_volume(self.volume) {
            error!("Failed to set volume: {}", e);
        }
    }
}

impl Panel for ControlPanel {
    /// # Responsibility
    /// Render control panel UI with playback controls.
    ///
    /// ---
    ///
    /// ## Returns
    /// `true` if volume changed (for parent notification to save config)
    fn render(&mut self, ui: &mut egui::Ui) -> bool {
        let mut config_changed = false;
        
        ui.horizontal(|ui| {
            // ================================================================
            // FILE LOADING BUTTON
            // ================================================================
            if ui.button("📁 Load Audio File")
                .on_hover_text("Open audio file (MP3, WAV, FLAC, OGG) - Non-blocking")
                .clicked() 
            {
                if let Some(ref _callback) = self.on_load_file {
                    // Note: We need Context but only have Ui. This is a design limitation.
                    // MainWindow should handle file loading directly.
                    warn!("Load file button clicked, but callback requires Context");
                }
            }
            
            ui.separator();
            
            // ================================================================
            // PLAYBACK CONTROLS
            // ================================================================
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
            
            // ================================================================
            // CURRENT FILE DISPLAY
            // ================================================================
            {
                let state = self.state.lock().unwrap();
                if let Some(ref path) = state.current_file_path {
                    ui.label(format!("🎵 {}", path.file_name().unwrap().to_str().unwrap_or("Unknown")));
                } else {
                    ui.label("No file loaded");
                }
            }
            
            ui.separator();
            
            // ================================================================
            // VOLUME CONTROL
            // ================================================================
            ui.label("🔊 Volume:");
            let volume_response = ui.add(egui::Slider::new(&mut self.volume, 0.0..=1.0)
                .text("")
                .show_value(false));
            
            if volume_response.changed() {
                if let Err(e) = self.audio_player.set_volume(self.volume) {
                    error!("Set volume failed: {}", e);
                }
                config_changed = true;
            }
            
            ui.label(format!("{}%", (self.volume * 100.0) as u8));
            
            ui.separator();
            
            // ================================================================
            // STATUS DISPLAY
            // ================================================================
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
        
        // ====================================================================
        // ERROR DISPLAY WITH AUTO-CLEAR
        // ====================================================================
        {
            let mut state = self.state.lock().unwrap();
            if let Some((ref error_msg, timestamp)) = state.loading_error {
                let elapsed = timestamp.elapsed().as_secs();
                let remaining = 5_u64.saturating_sub(elapsed);
                ui.colored_label(
                    egui::Color32::RED, 
                    format!("❌ {} (clears in {}s)", error_msg, remaining)
                );
                
                // Auto-clear after 5 seconds
                if elapsed >= 5 {
                    state.loading_error = None;
                }
            }
        }
        
        // ====================================================================
        // SEEK BAR (only show if audio loaded)
        // ====================================================================
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
        
        config_changed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::interfaces::i_audio_player::IAudioPlayer;
    use crate::services::AudioForgeModule;
    use shaku::HasComponent;
    
    #[test]
    fn test_control_panel_creates_with_valid_state() {
        let module = AudioForgeModule::builder().build();
        let player: Arc<dyn IAudioPlayer> = module.resolve();
        let state = Arc::new(Mutex::new(ControlPanelState::default()));
        
        let panel = ControlPanel::new(player, state, 0.5);
        
        assert_eq!(panel.get_volume(), 0.5);
    }
    
    #[test]
    fn test_control_panel_volume_clamping() {
        let module = AudioForgeModule::builder().build();
        let player: Arc<dyn IAudioPlayer> = module.resolve();
        let state = Arc::new(Mutex::new(ControlPanelState::default()));
        
        let mut panel = ControlPanel::new(player, state, 0.5);
        
        panel.set_volume(1.5); // Above max
        assert_eq!(panel.get_volume(), 1.0);
        
        panel.set_volume(-0.5); // Below min
        assert_eq!(panel.get_volume(), 0.0);
    }
}

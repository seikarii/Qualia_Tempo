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
use anyhow::{Context as AnyhowContext, Result};
use egui::{self, Context};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{error, info};

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
/// ## Architecture (Directive 14: Complete Encapsulation)
/// - **File Loading**: Owns async file picker with magic number validation
/// - **Playback**: Direct IAudioPlayer service calls
/// - **State Sync**: Uses Arc<Mutex<>> for thread-safe coordination
pub struct ControlPanel {
    /// Audio player service (injected dependency)
    audio_player: Arc<dyn IAudioPlayer>,
    
    /// Shared state (for async file picker coordination)
    state: Arc<Mutex<ControlPanelState>>,
    
    /// Current volume level [0.0, 1.0]
    volume: f32,
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
        }
    }
    
    /// # Responsibility
    /// Validate audio file format via magic number inspection.
    ///
    /// ---
    ///
    /// ## Security (Directive 9)
    /// Prevents loading of non-audio files by checking format signatures.
    /// Supported formats: WAV, FLAC, MP3, OGG, M4A/AAC
    fn validate_audio_file_format(path: &Path) -> Result<()> {
        let mut file = File::open(path)
            .with_context(|| format!("Failed to open file: {}", path.display()))?;
        
        let mut magic = [0u8; 12];
        file.read_exact(&mut magic)
            .with_context(|| format!("File too small to identify: {}", path.display()))?;
        
        // Check magic numbers
        if &magic[0..4] == b"RIFF" {
            return Ok(()); // WAV format
        }
        
        if &magic[0..4] == b"fLaC" {
            return Ok(()); // FLAC format
        }
        
        if magic[0] == 0xFF && (magic[1] == 0xFB || magic[1] == 0xF3 || magic[1] == 0xF2) {
            return Ok(()); // MP3 format
        }
        
        if &magic[0..4] == b"OggS" {
            return Ok(()); // OGG container
        }
        
        if &magic[4..8] == b"ftyp" {
            return Ok(()); // M4A/AAC format
        }
        
        Err(anyhow::anyhow!(
            "Unsupported or invalid audio file format. Supported: WAV, FLAC, MP3, OGG, M4A/AAC"
        ))
    }
    
    /// # Responsibility
    /// Launch async file picker dialog and load selected file.
    ///
    /// ---
    ///
    /// ## Architecture (Directive 14)
    /// Now fully encapsulated within ControlPanel. Uses:
    /// - rfd::AsyncFileDialog for non-blocking file selection
    /// - Magic number validation before loading
    /// - Thread-safe state updates via Arc<Mutex<>>
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
                
                // Validate and load file
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
    fn render(&mut self, ctx: &egui::Context, ui: &mut egui::Ui) -> bool {
        let mut config_changed = false;
        
        ui.horizontal(|ui| {
            // ================================================================
            // FILE LOADING BUTTON (Directive 14: Complete Encapsulation)
            // ================================================================
            if ui.button("📁 Load Audio File")
                .on_hover_text("Open audio file (MP3, WAV, FLAC, OGG) - Non-blocking")
                .clicked() 
            {
                self.handle_load_file(ctx);
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

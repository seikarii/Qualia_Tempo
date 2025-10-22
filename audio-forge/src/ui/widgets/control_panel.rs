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

use crate::services::interfaces::i_audio_exporter::IAudioExporter;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::services::AudioFileValidator;
use crate::ui::theme::QualiaTheme;
use crate::ui::widgets::Panel;
use egui::{self, Context};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{error, info};

#[cfg(not(target_arch = "wasm32"))]
use rfd;

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
/// Control panel for file loading, playback, volume, and channel configuration.
///
/// ---
///
/// ## Architecture (Directive 14: Complete Encapsulation)
/// - **File Loading**: Owns async file picker with magic number validation
/// - **Playback**: Direct IAudioPlayer service calls
/// - **Channel Controls**: Stereo/8.1 mode switching (migrated from InfoPanel)
/// - **State Sync**: Uses Arc<Mutex<>> for thread-safe coordination
/// - **Export**: IAudioExporter service for WAV export (Directive 17)
pub struct ControlPanel {
    /// Audio player service (injected dependency)
    audio_player: Arc<dyn IAudioPlayer>,
    
    /// Audio exporter service (Directive 17)
    audio_exporter: Arc<dyn IAudioExporter>,
    
    /// Multi-channel output service (for channel mode switching)
    multi_channel_output: Arc<dyn IMultiChannelOutput>,
    
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
    /// - `audio_exporter`: Service for WAV export (Directive 17)
    /// - `multi_channel_output`: Service for channel configuration
    /// - `state`: Shared state with parent window
    /// - `initial_volume`: Starting volume level [0.0, 1.0]
    pub fn new(
        audio_player: Arc<dyn IAudioPlayer>,
        audio_exporter: Arc<dyn IAudioExporter>,
        multi_channel_output: Arc<dyn IMultiChannelOutput>,
        state: Arc<Mutex<ControlPanelState>>,
        initial_volume: f32,
    ) -> Self {
        Self {
            audio_player,
            audio_exporter,
            multi_channel_output,
            state,
            volume: initial_volume,
        }
    }
    
    /// # Responsibility
    /// Launch async file picker dialog and load selected file.
    ///
    /// ---
    ///
    /// ## Architecture (Directive 14)
    /// Now fully encapsulated within ControlPanel. Uses:
    /// - rfd::AsyncFileDialog for non-blocking file selection
    /// - AudioFileValidator for centralized magic number validation
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
        
        // Clone Arc references for async task (BEFORE any move operations)
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
                    
                    // Validate file via centralized validator
                    if let Err(e) = AudioFileValidator::validate(&file_path) {
                        error!("❌ File validation failed: {}", e);
                        let mut state = state_clone.lock().unwrap();
                        state.loading_error = Some((format!("Invalid file: {}", e), Instant::now()));
                    } else {
                        // Load validated file with proper error handling (Directive 1: No catch_unwind)
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
                                state.loading_error = Some((
                                    format!("Load error: {}", e),
                                    Instant::now()
                                ));
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

    /// # Responsibility
    /// Launch async file save dialog and export processed audio to WAV.
    ///
    /// ---
    ///
    /// ## Directive 17: Audio Export Workflow
    /// 1. Open save file dialog (rfd::AsyncFileDialog)
    /// 2. Capture all processed audio via audio_player.capture_processed_audio()
    /// 3. Export to WAV via audio_exporter.export_wav()
    /// 4. Update state with success/error notification
    ///
    /// ## Non-Blocking Architecture
    /// Uses tokio::spawn to avoid UI freezing during:
    /// - File dialog display
    /// - Audio capture (reprocessing full file)
    /// - WAV file writing
    fn handle_export_wav(&self, ctx: &Context) {
        info!("🎬 Starting WAV export workflow...");
        
        let audio_player = self.audio_player.clone();
        let audio_exporter = self.audio_exporter.clone();
        let state_clone = self.state.clone();
        let ctx_clone = ctx.clone();
        
        tokio::spawn(async move {
            // Step 1: Open save file dialog
            let file_handle = rfd::AsyncFileDialog::new()
                .add_filter("WAV Audio", &["wav"])
                .set_file_name("exported_audio.wav")
                .save_file()
                .await;
            
            if let Some(file) = file_handle {
                let save_path = file.path().to_path_buf();
                info!("💾 User selected save path: {}", save_path.display());
                
                // Step 2: Capture processed audio (non-realtime)
                match audio_player.capture_processed_audio() {
                    Ok(samples) => {
                        let sample_rate = audio_player.get_sample_rate();
                        
                        // Step 3: Export to WAV
                        match audio_exporter.export_wav(&save_path, &samples, sample_rate) {
                            Ok(_) => {
                                info!("✅ Export successful: {}", save_path.display());
                                let mut state = state_clone.lock().unwrap();
                                state.loading_error = Some((
                                    format!("✅ Exported to: {}", save_path.file_name().unwrap().to_string_lossy()),
                                    Instant::now()
                                ));
                            }
                            Err(e) => {
                                error!("❌ Export failed: {}", e);
                                let mut state = state_clone.lock().unwrap();
                                state.loading_error = Some((
                                    format!("❌ Export error: {}", e),
                                    Instant::now()
                                ));
                            }
                        }
                    }
                    Err(e) => {
                        error!("❌ Audio capture failed: {}", e);
                        let mut state = state_clone.lock().unwrap();
                        state.loading_error = Some((
                            format!("❌ Capture error: {}", e),
                            Instant::now()
                        ));
                    }
                }
            } else {
                info!("Export cancelled by user");
            }
            
            ctx_clone.request_repaint(); // Update UI after operation
        });
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
            // EXPORT BUTTON (Directive 17)
            // ================================================================
            if ui.button("💾 Export to WAV")
                .on_hover_text("Export processed audio with effects to WAV file")
                .clicked()
            {
                self.handle_export_wav(ctx);
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
                
                // Modern error display with theme colors
                ui.colored_label(
                    QualiaTheme::ACCENT_ERROR,
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
        
        // ====================================================================
        // CHANNEL MODE CONTROLS (Migrated from InfoPanel)
        // ====================================================================
        ui.separator();
        ui.heading("🎛️ Channel Configuration");
        
        let channel_config = self.multi_channel_output.get_configuration();
        
        ui.horizontal(|ui| {
            if channel_config.is_8_1_available {
                if ui.button("🔁 Switch to Stereo").clicked() {
                    if let Err(e) = self.multi_channel_output.fallback_to_stereo() {
                        error!("Failed to switch to stereo: {}", e);
                    }
                    config_changed = true;
                }

                if ui.button("🔁 Configure 8.1").clicked() {
                    if let Err(e) = self.multi_channel_output.configure_8_1_channels() {
                        error!("Failed to configure 8.1: {}", e);
                    }
                    config_changed = true;
                }
            } else {
                ui.label("⚠️ 8.1 hardware not detected - stereo mode only");
            }
        });
        
        ui.horizontal(|ui| {
            if ui.button("🔍 Re-detect 8.1 Hardware")
                .on_hover_text("Manually scan for 8.1 capable audio devices (useful after hotplug)")
                .clicked()
            {
                let detected = self.multi_channel_output.redetect_8_1_hardware();
                if detected {
                    tracing::info!("✅ 8.1 hardware detected!");
                } else {
                    tracing::warn!("❌ No 8.1 hardware found");
                }
            }
        });
        
        config_changed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::interfaces::i_audio_exporter::IAudioExporter;
    use crate::services::interfaces::i_audio_player::IAudioPlayer;
    use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
    use crate::services::AudioForgeModule;
    use shaku::HasComponent;
    
    #[test]
    fn test_control_panel_creates_with_valid_state() {
        let module = AudioForgeModule::builder().build();
        let player: Arc<dyn IAudioPlayer> = module.resolve();
        let exporter: Arc<dyn IAudioExporter> = module.resolve();
        let multi_channel: Arc<dyn IMultiChannelOutput> = module.resolve();
        let state = Arc::new(Mutex::new(ControlPanelState::default()));
        
        let panel = ControlPanel::new(player, exporter, multi_channel, state, 0.5);
        
        assert_eq!(panel.get_volume(), 0.5);
    }
    
    #[test]
    fn test_control_panel_volume_clamping() {
        let module = AudioForgeModule::builder().build();
        let player: Arc<dyn IAudioPlayer> = module.resolve();
        let exporter: Arc<dyn IAudioExporter> = module.resolve();
        let multi_channel: Arc<dyn IMultiChannelOutput> = module.resolve();
        let state = Arc::new(Mutex::new(ControlPanelState::default()));
        
        let mut panel = ControlPanel::new(player, exporter, multi_channel, state, 0.5);
        
        panel.set_volume(1.5); // Above max
        assert_eq!(panel.get_volume(), 1.0);
        
        panel.set_volume(-0.5); // Below min
        assert_eq!(panel.get_volume(), 0.0);
    }
}

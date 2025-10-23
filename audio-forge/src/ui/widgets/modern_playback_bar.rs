//! # Responsibility
//! Modern bottom playback bar with file loading, transport controls, and volume.
//!
//! ---
//!
//! **ARCHITECTURAL MANDATE**: Spotify/Apple Music-style bottom bar that consolidates
//! all playback controls in a single, modern interface. Replaces the old top ControlPanel.
//!
//! Features:
//! - File open button (left)
//! - Transport controls: Play/Pause/Stop (center-left)
//! - Seek slider with time display (center)
//! - Volume control (right)
//! - Multi-channel toggle (far right)

use crate::services::interfaces::i_audio_exporter::IAudioExporter;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::ui::theme::QualiaTheme;
use egui::{Align, Button, Layout, RichText, Slider, Ui};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info};

/// # Responsibility
/// Shared state for playback bar (updated via EventBus).
#[derive(Debug, Clone)]
pub struct PlaybackBarState {
    pub current_file_path: Option<PathBuf>,
    pub is_playing: bool,
    pub current_position: Duration,
    pub total_duration: Duration,
    pub is_8_1_enabled: bool,
    pub volume: f32,
}

impl Default for PlaybackBarState {
    fn default() -> Self {
        Self {
            current_file_path: None,
            is_playing: false,
            current_position: Duration::ZERO,
            total_duration: Duration::ZERO,
            is_8_1_enabled: false,
            volume: 0.5, // Default 50% volume
        }
    }
}

/// # Responsibility
/// Modern bottom playback bar widget (Spotify-style).
///
/// ---
///
/// **DIRECTIVE UI-MOD-01**: Single-source-of-truth for playback controls.
/// All transport, volume, and file loading operations consolidated here.
pub struct ModernPlaybackBar {
    audio_player: Arc<dyn IAudioPlayer>,
    
    /// Audio exporter service (used in export action buttons - future feature)
    #[allow(dead_code)] // Used in export workflow, not in current render logic
    audio_exporter: Arc<dyn IAudioExporter>,
    
    multi_channel: Arc<dyn IMultiChannelOutput>,
    state: Arc<Mutex<PlaybackBarState>>,
    
    /// Current volume slider value (0.0-1.0)
    volume: f32,
}

impl ModernPlaybackBar {
    /// # Responsibility
    /// Create new playback bar with injected services.
    pub fn new(
        audio_player: Arc<dyn IAudioPlayer>,
        audio_exporter: Arc<dyn IAudioExporter>,
        multi_channel: Arc<dyn IMultiChannelOutput>,
        state: Arc<Mutex<PlaybackBarState>>,
        volume: f32,
    ) -> Self {
        Self {
            audio_player,
            audio_exporter,
            multi_channel,
            state,
            volume,
        }
    }

    /// # Responsibility
    /// Render the modern playback bar (called from MainWindow).
    ///
    /// ---
    ///
    /// Layout: [File] [Play] [Pause] [Stop] ━━━━━ Seek ━━━━━ [Volume] [8.1]
    pub fn render(&mut self, ui: &mut Ui) {
        // Clone state to avoid borrow conflicts in closure
        let state = self.state.lock().unwrap().clone();
        
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing.x = QualiaTheme::SPACING_PANEL_MARGIN;
            
            // LEFT: File loading
            self.render_file_section(ui);
            
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            ui.separator();
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            
            // CENTER-LEFT: Transport controls
            self.render_transport_controls(ui, &state);
            
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            ui.separator();
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            
            // CENTER: Seek slider + time display
            ui.with_layout(Layout::left_to_right(Align::Center), |ui| {
                self.render_seek_section(ui, &state);
            });
            
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            ui.separator();
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            
            // RIGHT: Volume control
            self.render_volume_section(ui);
            
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            ui.separator();
            ui.add_space(QualiaTheme::SPACING_PANEL_MARGIN);
            
            // FAR RIGHT: Multi-channel toggle
            self.render_multi_channel_section(ui, &state);
        });
    }

    /// # Responsibility
    /// Render file loading button with drag-and-drop zone.
    fn render_file_section(&mut self, ui: &mut Ui) {
        if ui.button(RichText::new("📂 Open Audio File").size(14.0)).clicked() {
            if let Some(path) = rfd::FileDialog::new()
                .add_filter("Audio Files", &["wav", "mp3", "flac", "ogg", "aac"])
                .pick_file()
            {
                info!("User selected file: {:?}", path);
                self.load_audio_file(path);
            }
        }
        
        // Drag-and-drop support
        if !ui.ctx().input(|i| i.raw.dropped_files.is_empty()) {
            let dropped_files = ui.ctx().input(|i| i.raw.dropped_files.clone());
            if let Some(file) = dropped_files.first() {
                if let Some(path) = &file.path {
                    info!("File dropped: {:?}", path);
                    self.load_audio_file(path.clone());
                }
            }
        }
    }

    /// # Responsibility
    /// Render transport controls (Play, Pause, Stop).
    fn render_transport_controls(&mut self, ui: &mut Ui, state: &PlaybackBarState) {
        let has_file = state.total_duration > Duration::ZERO;
        
        // Play button (green when playing)
        let play_color = if state.is_playing {
            QualiaTheme::ACCENT_SUCCESS
        } else {
            QualiaTheme::TEXT_PRIMARY
        };
        
        if ui.add_enabled(
            has_file,
            Button::new(RichText::new("▶").size(18.0).color(play_color))
        ).clicked() {
            if let Err(e) = self.audio_player.play() {
                error!("Play failed: {}", e);
            }
        }
        
        // Pause button
        if ui.add_enabled(
            has_file,
            Button::new(RichText::new("⏸").size(18.0))
        ).clicked() {
            if let Err(e) = self.audio_player.pause() {
                error!("Pause failed: {}", e);
            }
        }
        
        // Stop button
        if ui.add_enabled(
            has_file,
            Button::new(RichText::new("⏹").size(18.0))
        ).clicked() {
            if let Err(e) = self.audio_player.stop() {
                error!("Stop failed: {}", e);
            }
        }
    }

    /// # Responsibility
    /// Render seek slider with time display.
    fn render_seek_section(&mut self, ui: &mut Ui, state: &PlaybackBarState) {
        let has_file = state.total_duration > Duration::ZERO;
        
        // Current time display
        let current_time_str = format_duration(state.current_position);
        ui.label(RichText::new(current_time_str).size(12.0).monospace());
        
        // Seek slider
        let mut position_secs = state.current_position.as_secs_f32();
        let total_secs = state.total_duration.as_secs_f32().max(1.0);
        
        let slider_response = ui.add_enabled(
            has_file,
            Slider::new(&mut position_secs, 0.0..=total_secs)
                .show_value(false)
                .min_decimals(0)
                .max_decimals(1)
        );
        
        if slider_response.drag_stopped() || slider_response.clicked() {
            let new_position = Duration::from_secs_f32(position_secs);
            info!("Seeking to {:?}", new_position);
            if let Err(e) = self.audio_player.seek(new_position) {
                error!("Seek failed: {}", e);
            }
        }
        
        // Total time display
        let total_time_str = format_duration(state.total_duration);
        ui.label(RichText::new(total_time_str).size(12.0).monospace());
    }

    /// # Responsibility
    /// Render volume control slider.
    fn render_volume_section(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("🔊").size(14.0));
        
        let slider_response = ui.add(
            Slider::new(&mut self.volume, 0.0..=1.0)
                .show_value(false)
                .min_decimals(0)
                .max_decimals(2)
        );
        
        if slider_response.changed() {
            if let Err(e) = self.audio_player.set_volume(self.volume) {
                error!("Volume change failed: {}", e);
            }
        }
        
        ui.label(RichText::new(format!("{}%", (self.volume * 100.0) as u8)).size(12.0));
    }

    /// # Responsibility
    /// Render multi-channel toggle button.
    fn render_multi_channel_section(&mut self, ui: &mut Ui, state: &PlaybackBarState) {
        let config = self.multi_channel.get_configuration();
        let is_available = config.is_8_1_available;
        
        let button_text = if state.is_8_1_enabled {
            RichText::new("🔊 8.1 ON").color(QualiaTheme::ACCENT_SUCCESS)
        } else {
            RichText::new("🔊 8.1 OFF").color(QualiaTheme::TEXT_SECONDARY)
        };
        
        if ui.add_enabled(is_available, Button::new(button_text)).clicked() {
            let mut state = self.state.lock().unwrap();
            state.is_8_1_enabled = !state.is_8_1_enabled;
            
            if state.is_8_1_enabled {
                if let Err(e) = self.multi_channel.configure_8_1_channels() {
                    error!("Failed to enable 8.1: {}", e);
                    state.is_8_1_enabled = false;
                }
            } else if let Err(e) = self.multi_channel.fallback_to_stereo() {
                error!("Failed to fallback to stereo: {}", e);
            }
        }
        
        if !is_available {
            ui.label(RichText::new("(Hardware unavailable)").size(10.0).color(QualiaTheme::TEXT_SECONDARY));
        }
    }

    /// # Responsibility
    /// Load audio file and validate format.
    fn load_audio_file(&self, path: PathBuf) {
        info!("Loading audio file: {:?}", path);
        
        match self.audio_player.load_file(&path) {
            Ok(duration) => {
                info!("✅ File loaded successfully. Duration: {:?}", duration);
                
                // Update state (will be overwritten by EventBus FileLoaded event)
                let mut state = self.state.lock().unwrap();
                state.current_file_path = Some(path);
                state.total_duration = duration;
                state.current_position = Duration::ZERO;
                state.is_playing = false;
            }
            Err(e) => {
                error!("❌ Failed to load audio file: {}", e);
                // TODO: Show error toast to user
            }
        }
    }
}

/// # Responsibility
/// Format duration as MM:SS for display.
fn format_duration(duration: Duration) -> String {
    let total_secs = duration.as_secs();
    let minutes = total_secs / 60;
    let seconds = total_secs % 60;
    format!("{:02}:{:02}", minutes, seconds)
}

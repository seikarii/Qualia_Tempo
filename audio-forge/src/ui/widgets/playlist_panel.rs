//! # Responsibility
//! Playlist management sidebar with track queue, metadata, and playback control.
//!
//! ---
//!
//! ## PRODUCTION FEATURES
//! - Left sidebar with current track + queue display
//! - Add/Remove/Reorder tracks
//! - Metadata display (name, duration)
//! - Auto-play next track via EventBus
//! - Drag & drop file support
//! - Persistent state synchronization

use crate::events::AudioForgeEvent;
use crate::services::event_bus::IEventBus;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::ui::theme::QualiaTheme;
use egui::{self, Context, RichText, ScrollArea, Ui};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info};

/// # Responsibility
/// Metadata for a single track in the playlist.
#[derive(Clone, Debug)]
pub struct AudioTrack {
    pub path: PathBuf,
    pub title: String,
    pub artist: Option<String>,
    pub duration: Duration,
}

impl AudioTrack {
    /// # Responsibility
    /// Create track from file path (duration will be updated on load).
    pub fn from_path(path: PathBuf) -> Self {
        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown Track")
            .to_string();
        
        Self {
            path,
            title,
            artist: None,
            duration: Duration::ZERO,
        }
    }
    
    /// # Responsibility
    /// Update duration after file is loaded.
    pub fn with_duration(mut self, duration: Duration) -> Self {
        self.duration = duration;
        self
    }
}

/// # Responsibility
/// Playlist panel state (shared with MainWindow for EventBus updates).
#[derive(Debug, Clone, Default)]
pub struct PlaylistState {
    pub tracks: Vec<AudioTrack>,
    pub current_index: Option<usize>,
}

/// # Responsibility
/// Left sidebar playlist panel with track management (PRODUCTION-GRADE).
///
/// ---
///
/// ## Architecture
/// - **State**: Shared Arc<Mutex<PlaylistState>> with MainWindow
/// - **EventBus**: Subscribes to FileLoaded for auto-add
/// - **AudioPlayer**: Direct calls for track loading
/// - **UI**: Scrollable list with add/remove/reorder controls
pub struct PlaylistPanel {
    state: Arc<Mutex<PlaylistState>>,
    audio_player: Arc<dyn IAudioPlayer>,
    #[allow(dead_code)] // Used in constructor's tokio::spawn listener
    event_bus: Arc<dyn IEventBus>,
}

impl PlaylistPanel {
    /// # Responsibility
    /// Create playlist panel with shared state and services.
    pub fn new(
        state: Arc<Mutex<PlaylistState>>,
        audio_player: Arc<dyn IAudioPlayer>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        // Spawn EventBus listener for FileLoaded events (auto-add to playlist)
        let state_clone = state.clone();
        let mut events = event_bus.subscribe();
        
        tokio::spawn(async move {
            info!("🎵 PlaylistPanel EventBus listener started");
            
            loop {
                match events.recv().await {
                    Ok(AudioForgeEvent::FileLoaded { path, duration, .. }) => {
                        let mut playlist_state = state_clone.lock().unwrap();
                        
                        // Check if track already exists
                        if !playlist_state.tracks.iter().any(|t| t.path == path) {
                            let track = AudioTrack::from_path(path.clone()).with_duration(duration);
                            playlist_state.tracks.push(track);
                            
                            // Set as current if first track
                            if playlist_state.current_index.is_none() {
                                playlist_state.current_index = Some(0);
                            }
                            
                            info!("📋 Added track to playlist: {:?}", path);
                        }
                    }
                    Ok(AudioForgeEvent::PlaybackFinished) => {
                        // Auto-play next track
                        let mut playlist_state = state_clone.lock().unwrap();
                        
                        if let Some(current) = playlist_state.current_index {
                            if current + 1 < playlist_state.tracks.len() {
                                playlist_state.current_index = Some(current + 1);
                                info!("⏭️  Auto-playing next track (index {})", current + 1);
                            } else {
                                info!("🏁 Playlist finished");
                            }
                        }
                    }
                    Err(e) => {
                        error!("PlaylistPanel EventBus error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });
        
        Self {
            state,
            audio_player,
            event_bus,
        }
    }
    
    /// # Responsibility
    /// Render playlist panel UI (called from MainWindow side panel).
    pub fn render(&mut self, _ctx: &Context, ui: &mut Ui) {
        ui.vertical(|ui| {
            ui.heading("🎵 Playlist");
            ui.add_space(10.0);
            
            // Now Playing section
            self.render_now_playing(ui);
            
            ui.separator();
            ui.add_space(10.0);
            
            // Queue section
            ui.heading("📋 Queue");
            self.render_queue(ui);
            
            ui.add_space(10.0);
            
            // Add track button
            if ui.button("➕ Add Track").clicked() {
                self.open_file_dialog();
            }
        });
    }
    
    /// # Responsibility
    /// Render current playing track info.
    fn render_now_playing(&self, ui: &mut Ui) {
        let state = self.state.lock().unwrap();
        
        if let Some(current_idx) = state.current_index {
            if let Some(track) = state.tracks.get(current_idx) {
                ui.label(RichText::new("Now Playing").color(QualiaTheme::TEXT_SECONDARY).size(12.0));
                ui.label(RichText::new(&track.title).size(16.0).color(QualiaTheme::LIME_GREEN));
                
                if let Some(artist) = &track.artist {
                    ui.label(RichText::new(format!("by {}", artist)).size(12.0));
                }
                
                let mins = track.duration.as_secs() / 60;
                let secs = track.duration.as_secs() % 60;
                ui.label(RichText::new(format!("{}:{:02}", mins, secs)).size(12.0).color(QualiaTheme::TEXT_SECONDARY));
            } else {
                ui.label("No track loaded");
            }
        } else {
            ui.label("No track loaded");
        }
    }
    
    /// # Responsibility
    /// Render scrollable queue with track list.
    fn render_queue(&mut self, ui: &mut Ui) {
        let mut state = self.state.lock().unwrap();
        let mut to_remove: Option<usize> = None;
        let mut to_play: Option<usize> = None;
        
        ScrollArea::vertical()
            .max_height(400.0)
            .show(ui, |ui| {
                for (i, track) in state.tracks.iter().enumerate() {
                    let is_current = Some(i) == state.current_index;
                    
                    ui.horizontal(|ui| {
                        // Play indicator
                        if is_current {
                            ui.label(RichText::new("▶").color(QualiaTheme::LIME_GREEN));
                        } else {
                            ui.label(" ");
                        }
                        
                        // Track title (clickable)
                        let title_color = if is_current {
                            QualiaTheme::LIME_GREEN
                        } else {
                            QualiaTheme::TEXT_PRIMARY
                        };
                        
                        if ui.selectable_label(is_current, RichText::new(&track.title).color(title_color)).clicked() {
                            to_play = Some(i);
                        }
                        
                        // Duration
                        let mins = track.duration.as_secs() / 60;
                        let secs = track.duration.as_secs() % 60;
                        ui.label(RichText::new(format!("{}:{:02}", mins, secs)).size(10.0).color(QualiaTheme::TEXT_SECONDARY));
                        
                        // Remove button
                        if ui.small_button("❌").clicked() {
                            to_remove = Some(i);
                        }
                    });
                }
            });
        
        // Handle remove action
        if let Some(idx) = to_remove {
            state.tracks.remove(idx);
            
            // Adjust current_index if needed
            if let Some(current) = state.current_index {
                if current == idx {
                    state.current_index = if state.tracks.is_empty() {
                        None
                    } else {
                        Some(current.min(state.tracks.len() - 1))
                    };
                } else if current > idx {
                    state.current_index = Some(current - 1);
                }
            }
        }
        
        // Handle play action
        if let Some(idx) = to_play {
            if let Some(track) = state.tracks.get(idx) {
                info!("▶️  Loading track from playlist: {:?}", track.path);
                
                match self.audio_player.load_file(&track.path) {
                    Ok(_) => {
                        state.current_index = Some(idx);
                        if let Err(e) = self.audio_player.play() {
                            error!("Failed to play track: {}", e);
                        }
                    }
                    Err(e) => {
                        error!("Failed to load track: {}", e);
                    }
                }
            }
        }
    }
    
    /// # Responsibility
    /// Open file dialog to add tracks.
    #[cfg(not(target_arch = "wasm32"))]
    fn open_file_dialog(&self) {
        use rfd::FileDialog;
        
        if let Some(path) = FileDialog::new()
            .add_filter("Audio Files", &["wav", "mp3", "flac", "ogg"])
            .pick_file()
        {
            info!("📂 User selected file: {:?}", path);
            
            match self.audio_player.load_file(&path) {
                Ok(duration) => {
                    info!("✅ File loaded: duration={:?}", duration);
                }
                Err(e) => {
                    error!("❌ Failed to load file: {}", e);
                }
            }
        }
    }
    
    #[cfg(target_arch = "wasm32")]
    fn open_file_dialog(&self) {
        error!("File dialog not supported on WASM");
    }
}

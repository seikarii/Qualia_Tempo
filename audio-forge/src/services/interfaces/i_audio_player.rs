//! # Responsibility
//! Defines the audio playback control interface.

use anyhow::Result;
use shaku::Interface;
use std::path::Path;
use std::time::Duration;

/// # Responsibility
/// Controls audio playback: load, play, pause, seek, volume.
pub trait IAudioPlayer: Interface {
    /// Load audio file (WAV/MP3/FLAC/OGG/AAC). Returns total duration.
    fn load_file(&self, path: &Path) -> Result<Duration>;

    /// Start/resume playback
    fn play(&self) -> Result<()>;

    /// Pause playback (non-destructive)
    fn pause(&self) -> Result<()>;

    /// Stop and reset to beginning
    fn stop(&self) -> Result<()>;

    /// Seek to timestamp
    fn seek(&self, position: Duration) -> Result<()>;

    /// Set volume [0.0, 1.0]
    fn set_volume(&self, volume: f32) -> Result<()>;

    /// Current position
    fn current_position(&self) -> Duration;

    /// Total duration
    fn total_duration(&self) -> Duration;

    /// Playback status
    fn is_playing(&self) -> bool;

    /// # Responsibility
    /// Get captured audio samples for real-time analysis (zero-copy).
    ///
    /// ---
    ///
    /// Returns Arc reference to recent audio buffer (up to 1 second).
    /// Zero-copy design eliminates 10.5MB/s allocation overhead @ 60fps.
    /// Returns empty slice if no audio is loaded.
    fn get_audio_samples(&self) -> std::sync::Arc<[f32]>;

    /// # Responsibility
    /// Get sample rate of currently loaded audio.
    ///
    /// ---
    ///
    /// Returns 44100 by default if no audio loaded.
    fn get_sample_rate(&self) -> u32;
}

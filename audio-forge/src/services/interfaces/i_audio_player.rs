//! # Responsibility
//! Defines the audio playback control interface.

use crate::errors::AudioPlayerError;
use shaku::Interface;
use std::path::Path;
use std::time::Duration;

/// # Responsibility
/// Controls audio playback: load, play, pause, seek, volume.
pub trait IAudioPlayer: Interface {
    /// Load audio file (WAV/MP3/FLAC/OGG/AAC). Returns total duration.
    fn load_file(&self, path: &Path) -> Result<Duration, AudioPlayerError>;

    /// Start/resume playback
    fn play(&self) -> Result<(), AudioPlayerError>;

    /// Pause playback (non-destructive)
    fn pause(&self) -> Result<(), AudioPlayerError>;

    /// Stop and reset to beginning
    fn stop(&self) -> Result<(), AudioPlayerError>;

    /// Seek to timestamp
    fn seek(&self, position: Duration) -> Result<(), AudioPlayerError>;

    /// Set volume [0.0, 1.0]
    fn set_volume(&self, volume: f32) -> Result<(), AudioPlayerError>;
    
    /// # Responsibility
    /// Set playback speed multiplier (0.3x - 3.0x range).
    ///
    /// ---
    ///
    /// DIRECTIVE FIX-SPEED: Enables variable playback rate without pitch shift.
    /// Uses rodio's `Sink::set_speed()` for real-time speed adjustment.
    ///
    /// ## Parameters
    /// - `speed`: Multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
    ///
    /// ## Range
    /// - Minimum: 0.3x (slow motion)
    /// - Maximum: 3.0x (fast forward)
    /// - Values outside range are clamped
    ///
    /// ## Errors
    /// - No file currently loaded
    fn set_playback_speed(&self, speed: f32) -> Result<(), AudioPlayerError>;

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

    /// # Responsibility
    /// Capture all processed audio samples from the currently loaded file.
    ///
    /// ---
    ///
    /// ## Directive 17: Non-Realtime Export Capture
    /// Reloads the current audio file and passes it through the full
    /// processing pipeline (Decoder → SampleCountingSource → AnalyzingSource → EffectsSource)
    /// to collect all processed samples for export.
    ///
    /// ## Performance
    /// - Non-realtime: Processing speed uncapped (no playback sync)
    /// - Memory: Allocates Vec for full audio (e.g., 10.5MB for 1 minute stereo @ 44.1kHz)
    /// - Thread-safe: Does not interfere with active playback
    ///
    /// ## Errors
    /// - No file currently loaded
    /// - File I/O errors during reload
    /// - Decoder errors
    fn capture_processed_audio(&self) -> Result<Vec<f32>, AudioPlayerError>;
}

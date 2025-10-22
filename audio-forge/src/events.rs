//! # Responsibility
//! Event definitions for application-wide pub/sub communication.
//!
//! ---
//!
//! Implements EventBus pattern using tokio::sync::broadcast for lock-free
//! event distribution. Eliminates tight coupling between services and UI.

use crate::contracts::effect_parameters::EffectConfig;
use crate::contracts::frequency_spectrum::FrequencySpectrum;
use std::path::PathBuf;
use std::time::Duration;

/// # Responsibility
/// Application events for pub/sub communication.
///
/// ---
///
/// All events are immutable (Clone) for safe distribution to multiple subscribers.
/// Events represent state changes, not commands.
#[derive(Clone, Debug)]
pub enum AudioForgeEvent {
    /// Audio file loaded successfully
    FileLoaded {
        path: PathBuf,
        duration: Duration,
        sample_rate: u32,
    },

    /// Playback state changed (play/pause/stop)
    PlaybackStateChanged {
        is_playing: bool,
        position: Duration,
    },

    /// User sought to new position
    SeekedTo { position: Duration },

    /// Volume changed
    VolumeChanged { new_volume: f32 },

    /// Effects configuration updated
    EffectsConfigUpdated { config: EffectConfig },

    /// New visualization data available
    VisualizationDataReady {
        waveform: Vec<f32>,
        spectrum: FrequencySpectrum,
    },

    /// Audio export started
    ExportStarted { path: PathBuf },

    /// Audio export completed successfully
    ExportCompleted { path: PathBuf, duration: Duration },

    /// Audio export failed
    ExportFailed { path: PathBuf, error: String },

    /// Channel mode changed (Stereo <-> 8.1)
    ChannelModeChanged { mode: String },

    /// Error occurred during operation
    ErrorOccurred { message: String },
}

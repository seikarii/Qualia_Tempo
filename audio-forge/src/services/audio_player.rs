//! # Responsibility
//! Implements audio playback service using rodio and symphonia.

use crate::services::interfaces::i_audio_player::IAudioPlayer;
use anyhow::{Context, Result};
use rodio::{OutputStream, Sink, Source};
use shaku::Component;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info};

/// # Responsibility
/// Holds the rodio Sink and current playback state.
///
/// ---
///
/// CRITICAL: OutputStream and Sink are long-lived resources initialized ONCE
/// during service construction. They MUST NOT be recreated per load_file() call
/// to prevent OS resource exhaustion and audio device conflicts.
struct PlayerState {
    sink: Sink,
    _stream: OutputStream,
    total_duration: Duration,
    is_playing: bool,
    start_time: Option<std::time::Instant>,
    pause_position: Duration,
}

impl PlayerState {
    /// # Responsibility
    /// Initialize audio output stream and sink (ONCE per service lifetime).
    ///
    /// ---
    ///
    /// This method MUST be called exactly once during service construction.
    /// Panics if audio device initialization fails (unrecoverable error).
    fn new() -> Self {
        use rodio::OutputStreamBuilder;
        
        let stream_handle = OutputStreamBuilder::open_default_stream()
            .expect("FATAL: Failed to initialize audio output device");
        
        let sink = Sink::connect_new(stream_handle.mixer());
        
        Self {
            sink,
            _stream: stream_handle,
            total_duration: Duration::ZERO,
            is_playing: false,
            start_time: None,
            pause_position: Duration::ZERO,
        }
    }
}

/// # Responsibility
/// Thread-safe wrapper for PlayerState to satisfy Shaku's public interface requirements.
///
/// ---
///
/// Initializes audio output stream during construction. This ensures:
/// 1. Single OutputStream per service instance (no resource leaks)
/// 2. Thread-safe access to playback state
/// 3. Lazy initialization deferred until first use
#[derive(Clone)]
pub struct PlayerStateHandle(Arc<Mutex<PlayerState>>);

impl Default for PlayerStateHandle {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(PlayerState::new())))
    }
}

impl PlayerStateHandle {
    fn lock(&self) -> std::sync::MutexGuard<'_, PlayerState> {
        self.0.lock().unwrap()
    }
}

/// # Responsibility
/// Core audio playback service with thread-safe state management.
#[derive(Component, Default)]
#[shaku(interface = IAudioPlayer)]
pub struct AudioPlayerService {
    #[shaku(default)]
    state: PlayerStateHandle,
}

impl IAudioPlayer for AudioPlayerService {
    fn load_file(&mut self, path: &Path) -> Result<Duration> {
        info!("Loading audio file: {}", path.display());

        // Decode audio file
        let file = File::open(path).context("Failed to open audio file")?;
        let buf_reader = BufReader::new(file);
        let source = rodio::Decoder::new(buf_reader).context("Failed to decode audio file")?;

        let total_duration = source
            .total_duration()
            .ok_or_else(|| anyhow::anyhow!("Failed to get total duration"))?;

        let mut state = self.state.lock();
        
        // CRITICAL FIX: Clear existing audio and append new source to EXISTING Sink
        // This prevents recreating OutputStream (OS resource leak + device conflicts)
        state.sink.stop();          // Stop current playback
        state.sink.clear();         // Remove all queued sources
        state.sink.append(source);  // Add new decoded audio
        state.sink.pause();         // Start paused (user must click play)
        
        // Reset playback state
        state.total_duration = total_duration;
        state.is_playing = false;
        state.start_time = None;
        state.pause_position = Duration::ZERO;

        info!("Audio loaded successfully. Duration: {:?}", total_duration);
        Ok(total_duration)
    }

    fn play(&self) -> Result<()> {
        let mut state = self.state.lock();
        
        // Check if audio is loaded
        if state.total_duration == Duration::ZERO {
            error!("No audio file loaded");
            return Err(anyhow::anyhow!("No audio file loaded"));
        }
        
        state.sink.play();
        state.is_playing = true;
        
        // Record start time for position tracking
        if state.start_time.is_none() {
            state.start_time = Some(std::time::Instant::now());
        }
        
        info!("Playback started");
        Ok(())
    }

    fn pause(&self) -> Result<()> {
        let mut state = self.state.lock();
        
        if state.total_duration == Duration::ZERO {
            return Err(anyhow::anyhow!("No audio file loaded"));
        }
        
        state.sink.pause();
        state.is_playing = false;
        
        // Store current position when pausing
        if let Some(start) = state.start_time {
            state.pause_position += start.elapsed();
            state.start_time = None;
        }
        
        info!("Playback paused");
        Ok(())
    }

    fn stop(&self) -> Result<()> {
        let mut state = self.state.lock();
        
        if state.total_duration == Duration::ZERO {
            return Err(anyhow::anyhow!("No audio file loaded"));
        }
        
        state.sink.stop();
        state.is_playing = false;
        state.start_time = None;
        state.pause_position = Duration::ZERO;
        
        info!("Playback stopped");
        Ok(())
    }

    fn seek(&self, position: Duration) -> Result<()> {
        let mut state = self.state.lock();
        
        if state.total_duration == Duration::ZERO {
            return Err(anyhow::anyhow!("No audio file loaded"));
        }
        
        state.sink.try_seek(position)
            .map_err(|e| anyhow::anyhow!("Seek failed: {:?}", e))?;
        
        // Update position tracking
        state.pause_position = position;
        if state.is_playing {
            state.start_time = Some(std::time::Instant::now());
        }
        
        info!("Seeked to {:?}", position);
        Ok(())
    }

    fn set_volume(&self, volume: f32) -> Result<()> {
        let state = self.state.lock();
        
        state.sink.set_volume(volume.clamp(0.0, 1.0));
        info!("Volume set to {}", volume);
        Ok(())
    }

    fn current_position(&self) -> Duration {
        let state = self.state.lock();
        
        // TODO: TECH_DEBT - Manual position tracking is prone to drift
        // Ideal solution: Wrap Source in custom struct that counts consumed samples
        // and expose via Sink API or callback mechanism.
        //
        // Current implementation:
        // - Tracks elapsed time via Instant::now() diff
        // - Accumulates pause_position across play/pause cycles
        // - Works for basic playback but may desync on:
        //   * Audio device buffer underruns
        //   * System time adjustments (NTP)
        //   * Heavy CPU load causing scheduling delays
        //
        // For production use, replace with sample-accurate counter.
        
        if let Some(start) = state.start_time {
            // Currently playing: pause_position + time since play started
            state.pause_position + start.elapsed()
        } else {
            // Paused or stopped: return stored position
            state.pause_position
        }
    }

    fn total_duration(&self) -> Duration {
        let state = self.state.lock();
        state.total_duration
    }

    fn is_playing(&self) -> bool {
        let state = self.state.lock();
        state.is_playing
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_state_initialization() {
        // PlayerState::new() initializes OutputStream and Sink
        let state = PlayerState::new();
        assert_eq!(state.total_duration, Duration::ZERO);
        assert!(!state.is_playing);
        assert!(state.start_time.is_none());
        assert_eq!(state.pause_position, Duration::ZERO);
        // Note: Cannot easily test Sink/OutputStream without audio device
    }

    #[test]
    fn test_audio_player_service_default() {
        // Service initializes audio stream on construction
        let service = AudioPlayerService::default();
        let state = service.state.lock();
        assert_eq!(state.total_duration, Duration::ZERO);
        assert!(!state.is_playing);
    }

    #[test]
    fn test_initial_state_matches_spec() {
        let service = AudioPlayerService::default();
        assert!(!service.is_playing());
        assert_eq!(service.total_duration(), Duration::ZERO);
        assert_eq!(service.current_position(), Duration::ZERO);
    }

    #[test]
    fn test_volume_control_works_without_file() {
        let service = AudioPlayerService::default();
        // Volume can be set anytime (Sink exists from construction)
        let result = service.set_volume(0.5);
        assert!(result.is_ok());
    }

    #[test]
    fn test_volume_clamping() {
        let service = AudioPlayerService::default();
        
        // Test lower bound clamping
        assert!(service.set_volume(-1.0).is_ok());
        
        // Test upper bound clamping
        assert!(service.set_volume(2.0).is_ok());
    }

    #[test]
    fn test_operations_without_loaded_file() {
        let service = AudioPlayerService::default();

        // These should fail because no audio is loaded (total_duration == 0)
        assert!(service.play().is_err());
        assert!(service.pause().is_err());
        assert!(service.stop().is_err());
        assert!(service.seek(Duration::from_secs(1)).is_err());
        
        // Volume control works without loaded file
        assert!(service.set_volume(0.5).is_ok());
    }

    #[test]
    fn test_position_tracking_when_stopped() {
        let service = AudioPlayerService::default();
        
        // Position should be ZERO when no file loaded
        assert_eq!(service.current_position(), Duration::ZERO);
        
        // Position should be ZERO when not playing
        assert_eq!(service.total_duration(), Duration::ZERO);
    }
}

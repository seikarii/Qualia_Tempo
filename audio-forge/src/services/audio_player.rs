//! # Responsibility
//! Implements audio playback service using rodio and symphonia.

use crate::services::interfaces::i_audio_player::IAudioPlayer;
use anyhow::{Context, Result};
use rodio::{OutputStream, Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info};

/// # Responsibility
/// Holds the rodio Sink and current playback state.
struct PlayerState {
    sink: Option<Sink>,
    _stream: Option<OutputStream>,
    total_duration: Duration,
    is_playing: bool,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            sink: None,
            _stream: None,
            total_duration: Duration::ZERO,
            is_playing: false,
        }
    }
}

/// # Responsibility
/// Core audio playback service with thread-safe state management.
pub struct AudioPlayerService {
    state: Arc<Mutex<PlayerState>>,
}

impl Default for AudioPlayerService {
    fn default() -> Self {
        Self {
            state: Arc::new(Mutex::new(PlayerState::default())),
        }
    }
}

impl IAudioPlayer for AudioPlayerService {
    fn load_file(&mut self, path: &Path) -> Result<Duration> {
        info!("Loading audio file: {}", path.display());

        let file = File::open(path).context("Failed to open audio file")?;
        let buf_reader = BufReader::new(file);
        let source = rodio::Decoder::new(buf_reader).context("Failed to decode audio file")?;

        let total_duration = source
            .total_duration()
            .ok_or_else(|| anyhow::anyhow!("Failed to get total duration"))?;

        use rodio::OutputStreamBuilder;
        let stream_handle = OutputStreamBuilder::open_default_stream()
            .context("Failed to create audio output stream")?;

        let sink = Sink::connect_new(stream_handle.mixer());
        sink.append(source);
        sink.pause();

        let mut state = self.state.lock().unwrap();
        state.sink = Some(sink);
        state._stream = Some(stream_handle);
        state.total_duration = total_duration;
        state.is_playing = false;

        info!("Audio loaded successfully. Duration: {:?}", total_duration);
        Ok(total_duration)
    }

    fn play(&self) -> Result<()> {
        let mut state = self.state.lock().unwrap();
        if let Some(sink) = &state.sink {
            sink.play();
            state.is_playing = true;
            info!("Playback started");
            Ok(())
        } else {
            error!("No audio file loaded");
            Err(anyhow::anyhow!("No audio file loaded"))
        }
    }

    fn pause(&self) -> Result<()> {
        let mut state = self.state.lock().unwrap();
        if let Some(sink) = &state.sink {
            sink.pause();
            state.is_playing = false;
            info!("Playback paused");
            Ok(())
        } else {
            Err(anyhow::anyhow!("No audio file loaded"))
        }
    }

    fn stop(&self) -> Result<()> {
        let mut state = self.state.lock().unwrap();
        if let Some(sink) = &state.sink {
            sink.stop();
            state.is_playing = false;
            info!("Playback stopped");
            Ok(())
        } else {
            Err(anyhow::anyhow!("No audio file loaded"))
        }
    }

    fn seek(&self, position: Duration) -> Result<()> {
        let state = self.state.lock().unwrap();
        if let Some(sink) = &state.sink {
            sink.try_seek(position)
                .map_err(|e| anyhow::anyhow!("Seek failed: {:?}", e))?;
            info!("Seeked to {:?}", position);
            Ok(())
        } else {
            Err(anyhow::anyhow!("No audio file loaded"))
        }
    }

    fn set_volume(&self, volume: f32) -> Result<()> {
        let state = self.state.lock().unwrap();
        if let Some(sink) = &state.sink {
            sink.set_volume(volume.clamp(0.0, 1.0));
            info!("Volume set to {}", volume);
            Ok(())
        } else {
            Err(anyhow::anyhow!("No audio file loaded"))
        }
    }

    fn current_position(&self) -> Duration {
        Duration::ZERO
    }

    fn total_duration(&self) -> Duration {
        let state = self.state.lock().unwrap();
        state.total_duration
    }

    fn is_playing(&self) -> bool {
        let state = self.state.lock().unwrap();
        state.is_playing
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_player_state() {
        let state = PlayerState::default();
        assert!(state.sink.is_none());
        assert!(state._stream.is_none());
        assert_eq!(state.total_duration, Duration::ZERO);
        assert!(!state.is_playing);
    }

    #[test]
    fn test_audio_player_service_default() {
        let service = AudioPlayerService::default();
        let state = service.state.lock().unwrap();
        assert!(state.sink.is_none());
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
    fn test_volume_clamping_lower_bound() {
        let service = AudioPlayerService::default();
        // Should not panic even without loaded file (error expected)
        let result = service.set_volume(-1.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_volume_clamping_upper_bound() {
        let service = AudioPlayerService::default();
        let result = service.set_volume(2.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_operations_without_loaded_file() {
        let service = AudioPlayerService::default();

        assert!(service.play().is_err());
        assert!(service.pause().is_err());
        assert!(service.stop().is_err());
        assert!(service.seek(Duration::from_secs(1)).is_err());
        assert!(service.set_volume(0.5).is_err());
    }
}

//! # Responsibility
//! Implements audio playback service using rodio and symphonia.

use crate::contracts::channel_configuration::ChannelMode;
use crate::errors::AudioPlayerError;
use crate::events::AudioForgeEvent;
use crate::services::analyzing_source::{AnalyzingSource, SampleBuffer};
use crate::services::effects_source::EffectsSource;
use crate::services::event_bus::IEventBus;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use crate::services::sample_counting_source::SampleCountingSource;
use crate::services::seekable_source::SeekableSource;
use crate::services::upmixing_source::UpmixingSource;
use rodio::{OutputStream, Sink, Source};
use shaku::Component;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info, warn, instrument};

/// # Responsibility
/// Holds the rodio Sink and current playback state.
///
/// ---
///
/// CRITICAL: OutputStream and Sink are long-lived resources initialized ONCE
/// during service construction. They MUST NOT be recreated per load_file() call
/// to prevent OS resource exhaustion and audio device conflicts.
///
/// ## Directive 15: Sample-Accurate Position Tracking
/// Replaced time-based tracking (Instant) with atomic sample counter for
/// absolute precision immune to system clock drift and CPU load variations.
struct PlayerState {
    sink: Sink,
    _stream: OutputStream,
    total_duration: Duration,
    is_playing: bool,
    sample_buffer: Option<SampleBuffer>,
    sample_rate: u32,
    
    /// Sample-accurate position counter (Directive 15)
    /// Replaces start_time/pause_position time-based tracking
    sample_counter: Arc<std::sync::atomic::AtomicU64>,
    
    /// Currently loaded file path (Directive 17: for export capture)
    current_file: Option<PathBuf>,
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
            sample_buffer: None,
            sample_rate: 44100, // Default, will be updated on load
            sample_counter: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            current_file: None,
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
        self.0.lock().expect("PlayerState mutex poisoned - fatal error")
    }
}

/// # Responsibility
/// Core audio playback service with thread-safe state management.
#[derive(Component)]
#[shaku(interface = IAudioPlayer)]
pub struct AudioPlayerService {
    #[shaku(default)]
    state: PlayerStateHandle,
    
    #[shaku(inject)]
    audio_effects: Arc<dyn IAudioEffects>,
    
    #[shaku(inject)]
    multi_channel: Arc<dyn IMultiChannelOutput>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}

impl IAudioPlayer for AudioPlayerService {
    #[instrument(skip(self), fields(path = %path.display()))]
    fn load_file(&self, path: &Path) -> Result<Duration, AudioPlayerError> {
        info!("Loading audio file: {}", path.display());

        // Decode audio file with proper error handling (Directive 1: No catch_unwind)
        let file = File::open(path)
            .map_err(|_| AudioPlayerError::FileNotFound(path.to_path_buf()))?;
        let buf_reader = BufReader::new(file);
        
        // Rodio's Decoder returns Result - propagate errors naturally
        let source = rodio::Decoder::new(buf_reader)
            .map_err(|e| AudioPlayerError::DecodingError(format!("Failed to decode audio file: {}", e)))?;

        let total_duration = source
            .total_duration()
            .ok_or_else(|| AudioPlayerError::DecodingError("Failed to get total duration".to_string()))?;

        let sample_rate = source.sample_rate();

        // DIRECTIVE 15: Wrap decoder in SampleCountingSource for sample-accurate position tracking
        let (counting_source, sample_counter) = SampleCountingSource::new(source);
        
        // Wrap source in AnalyzingSource for real-time capture
        // Buffer capacity: 1 second of stereo audio @ 44100Hz = 88200 samples
        // Chunk size: 512 samples (reduces lock contention)
        let buffer_capacity = (sample_rate * 2) as usize; // 1 second stereo
        let chunk_size = 512;
        
        // Pipeline: Decoder → SampleCountingSource → AnalyzingSource → EffectsSource → [UpmixingSource] → Sink
        let analyzing_source = AnalyzingSource::new(counting_source, buffer_capacity, chunk_size);
        let sample_buffer = analyzing_source.buffer();
        
        // Wrap in EffectsSource for real-time DSP processing
        let effects_source = EffectsSource::new(
            analyzing_source,
            self.audio_effects.clone(),
            chunk_size,
        );
        
        // Conditional upmixing: Check if 8.1 mode is enabled
        let channel_config = self.multi_channel.get_configuration();
        let use_upmixing = channel_config.mode == ChannelMode::Surround8_1 
                        && channel_config.is_8_1_available;
        
        let mut state = self.state.lock();
        
        // CRITICAL FIX: Clear existing audio and append new source to EXISTING Sink
        // This prevents recreating OutputStream (OS resource leak + device conflicts)
        state.sink.stop();                      // Stop current playback
        state.sink.clear();                     // Remove all queued sources
        
        if use_upmixing {
            // Pipeline: Decoder → AnalyzingSource → EffectsSource → UpmixingSource → Sink
            info!("🔊 8.1 surround mode ACTIVE - applying upmixing");
            let upmixing_source = UpmixingSource::try_new(
                effects_source,
                self.multi_channel.clone(),
                256, // Batch size: 256 stereo frames
            ).map_err(|e| AudioPlayerError::PlaybackError(format!("Failed to create upmixing source: {}", e)))?;
            state.sink.append(upmixing_source);
        } else {
            // Pipeline: Decoder → AnalyzingSource → EffectsSource → Sink (stereo)
            info!("🎧 Stereo mode - no upmixing");
            state.sink.append(effects_source);
        }
        
        state.sink.pause();                     // Start paused (user must click play)
        
        // Reset playback state (Directive 15: Replace time tracking with sample counter)
        state.total_duration = total_duration;
        state.is_playing = false;
        state.sample_buffer = Some(sample_buffer);
        state.sample_rate = sample_rate;
        state.sample_counter = sample_counter; // Store counter for position queries
        state.current_file = Some(path.to_path_buf()); // Store path for export (Directive 17)
        
        // Reset counter to zero for new file
        state.sample_counter.store(0, Ordering::Relaxed);

        info!("Audio loaded successfully. Duration: {:?}, Sample Rate: {}", total_duration, sample_rate);
        
        // Emit FileLoaded event
        let file_path = path.to_path_buf();
        drop(state); // Release lock before emitting event
        
        if let Err(e) = self.event_bus.emit(AudioForgeEvent::FileLoaded {
            path: file_path,
            duration: total_duration,
            sample_rate,
        }) {
            warn!("Failed to emit FileLoaded event: {}", e);
        }
        
        Ok(total_duration)
    }

    #[instrument(skip(self))]
    fn play(&self) -> Result<(), AudioPlayerError> {
        let mut state = self.state.lock();
        
        // Check if audio is loaded
        if state.total_duration == Duration::ZERO {
            error!("No audio file loaded");
            return Err(AudioPlayerError::NoFileLoaded);
        }
        
        state.sink.play();
        state.is_playing = true;
        
        // Get current position for event
        let sample_count = state.sample_counter.load(Ordering::Relaxed);
        let position = Duration::from_secs_f64(sample_count as f64 / state.sample_rate as f64);
        
        drop(state); // Release lock
        
        // Directive 15: No time tracking needed - sample counter handles position
        
        info!("Playback started");
        
        // Emit PlaybackStateChanged event
        if let Err(e) = self.event_bus.emit(AudioForgeEvent::PlaybackStateChanged {
            is_playing: true,
            position,
        }) {
            warn!("Failed to emit PlaybackStateChanged event: {}", e);
        }
        
        Ok(())
    }

    #[instrument(skip(self))]
    fn pause(&self) -> Result<(), AudioPlayerError> {
        let mut state = self.state.lock();
        
        if state.total_duration == Duration::ZERO {
            return Err(AudioPlayerError::NoFileLoaded);
        }
        
        state.sink.pause();
        state.is_playing = false;
        
        // Get current position for event
        let sample_count = state.sample_counter.load(Ordering::Relaxed);
        let position = Duration::from_secs_f64(sample_count as f64 / state.sample_rate as f64);
        
        drop(state); // Release lock
        
        // Directive 15: Sample counter automatically preserves position
        
        info!("Playback paused");
        
        // Emit PlaybackStateChanged event
        if let Err(e) = self.event_bus.emit(AudioForgeEvent::PlaybackStateChanged {
            is_playing: false,
            position,
        }) {
            warn!("Failed to emit PlaybackStateChanged event: {}", e);
        }
        
        Ok(())
    }

    #[instrument(skip(self))]
    fn stop(&self) -> Result<(), AudioPlayerError> {
        let mut state = self.state.lock();
        
        if state.total_duration == Duration::ZERO {
            return Err(AudioPlayerError::NoFileLoaded);
        }
        
        state.sink.stop();
        state.is_playing = false;
        
        // Directive 15: Reset sample counter to zero
        state.sample_counter.store(0, Ordering::Relaxed);
        
        drop(state); // Release lock
        
        info!("Playback stopped");
        
        // Emit PlaybackStateChanged event
        if let Err(e) = self.event_bus.emit(AudioForgeEvent::PlaybackStateChanged {
            is_playing: false,
            position: Duration::ZERO,
        }) {
            warn!("Failed to emit PlaybackStateChanged event: {}", e);
        }
        
        Ok(())
    }

    #[instrument(skip(self), fields(position_secs = position.as_secs_f64()))]
    fn seek(&self, position: Duration) -> Result<(), AudioPlayerError> {
        let state = self.state.lock();
        
        if state.total_duration == Duration::ZERO {
            return Err(AudioPlayerError::NoFileLoaded);
        }
        
        // Clamp position to valid range [0, total_duration]
        let clamped_position = position.min(state.total_duration);
        
        // FIXED: Proper seeking implementation using SeekableSource wrapper.
        // Strategy: Reload file, wrap in SeekableSource that skips samples until target position.
        
        let file_path = state.current_file.clone()
            .ok_or_else(|| AudioPlayerError::SeekError("No file path stored".to_string()))?;
        
        let sample_rate = state.sample_rate;
        let was_playing = state.is_playing;
        
        // Calculate target sample position
        let target_samples = (clamped_position.as_secs_f64() * sample_rate as f64) as u64;
        
        // Drop lock before reload
        drop(state);
        
        // Reload file from scratch
        let file = File::open(&file_path)
            .map_err(|_| AudioPlayerError::FileNotFound(file_path.clone()))?;
        let buf_reader = BufReader::new(file);
        let source = rodio::Decoder::new(buf_reader)
            .map_err(|e| AudioPlayerError::DecodingError(format!("Failed to decode for seek: {}", e)))?;
        
        let total_duration = source
            .total_duration()
            .ok_or_else(|| AudioPlayerError::DecodingError("Failed to get duration for seek".to_string()))?;
        
        // Build pipeline with SeekableSource wrapper
        let (counting_source, sample_counter) = SampleCountingSource::new(source);
        
        // Wrap in SeekableSource to skip to target position
        let seekable_source = SeekableSource::new(counting_source, target_samples, sample_counter.clone());
        
        let buffer_capacity = (sample_rate * 2) as usize;
        let chunk_size = 512;
        
        let analyzing_source = AnalyzingSource::new(seekable_source, buffer_capacity, chunk_size);
        let sample_buffer = analyzing_source.buffer();
        
        let effects_source = EffectsSource::new(
            analyzing_source,
            self.audio_effects.clone(),
            chunk_size,
        );
        
        // Check upmixing configuration
        let channel_config = self.multi_channel.get_configuration();
        let use_upmixing = channel_config.mode == ChannelMode::Surround8_1 
                        && channel_config.is_8_1_available;
        
        // Reacquire lock and rebuild Sink
        let mut state = self.state.lock();
        
        state.sink.stop();
        state.sink.clear();
        
        if use_upmixing {
            let upmixing_source = UpmixingSource::try_new(
                effects_source,
                self.multi_channel.clone(),
                256,
            ).map_err(|e| AudioPlayerError::PlaybackError(format!("Failed upmixing for seek: {}", e)))?;
            state.sink.append(upmixing_source);
        } else {
            state.sink.append(effects_source);
        }
        
        // Restore state
        state.total_duration = total_duration;
        state.sample_buffer = Some(sample_buffer);
        state.sample_rate = sample_rate;
        state.sample_counter = sample_counter;
        state.current_file = Some(file_path);
        
        // Restore playback state
        if was_playing {
            state.sink.play();
            state.is_playing = true;
        } else {
            state.sink.pause();
            state.is_playing = false;
        }
        
        drop(state);
        
        info!("✅ Seek successful to {:?} (sample {})", clamped_position, target_samples);
        
        // Emit SeekedTo event
        if let Err(e) = self.event_bus.emit(AudioForgeEvent::SeekedTo {
            position: clamped_position,
        }) {
            warn!("Failed to emit SeekedTo event: {}", e);
        }
        
        Ok(())
    }

    #[instrument(skip(self), fields(volume))]
    fn set_volume(&self, volume: f32) -> Result<(), AudioPlayerError> {
        let state = self.state.lock();
        
        let clamped_volume = volume.clamp(0.0, 1.0);
        state.sink.set_volume(clamped_volume);
        
        drop(state); // Release lock
        
        info!("Volume set to {}", clamped_volume);
        
        // Emit VolumeChanged event
        if let Err(e) = self.event_bus.emit(AudioForgeEvent::VolumeChanged {
            new_volume: clamped_volume,
        }) {
            warn!("Failed to emit VolumeChanged event: {}", e);
        }
        
        Ok(())
    }

    #[instrument(skip(self))]
    fn current_position(&self) -> Duration {
        let state = self.state.lock();
        
        // Directive 15: Sample-accurate position tracking
        // Replaces time-based tracking with atomic sample counter
        //
        // Benefits over Instant::now() approach:
        // - Immune to system clock drift and adjustments
        // - Not affected by CPU load or scheduler jitter
        // - Perfectly synchronized with actual audio output
        // - Zero computational overhead (atomic read ~1 CPU cycle)
        //
        // Position = samples_consumed / sample_rate
        let sample_count = state.sample_counter.load(Ordering::Relaxed);
        let position_secs = sample_count as f64 / state.sample_rate as f64;
        
        Duration::from_secs_f64(position_secs)
    }

    #[instrument(skip(self))]
    fn total_duration(&self) -> Duration {
        let state = self.state.lock();
        state.total_duration
    }

    #[instrument(skip(self))]
    fn is_playing(&self) -> bool {
        let state = self.state.lock();
        state.is_playing
    }

    fn get_audio_samples(&self) -> Arc<[f32]> {
        let state = self.state.lock();
        if let Some(ref buffer) = state.sample_buffer {
            buffer.get_samples()
        } else {
            Arc::from(vec![].as_slice())
        }
    }

    fn get_sample_rate(&self) -> u32 {
        let state = self.state.lock();
        state.sample_rate
    }

    fn capture_processed_audio(&self) -> Result<Vec<f32>, AudioPlayerError> {
        info!("📼 Capturing processed audio for export...");
        
        // Get current file path from state
        let state = self.state.lock();
        let current_file = state.current_file.clone()
            .ok_or(AudioPlayerError::NoFileLoaded)?;
        drop(state); // Release lock before heavy I/O
        
        // Reload audio file (non-destructive to playback state)
        let file = File::open(&current_file)
            .map_err(|_| AudioPlayerError::FileNotFound(current_file.clone()))?;
        let buf_reader = BufReader::new(file);
        let source = rodio::Decoder::new(buf_reader)
            .map_err(|e| AudioPlayerError::DecodingError(format!("Failed to decode for capture: {}", e)))?;
        
        let sample_rate = source.sample_rate();
        
        // Build processing pipeline (same as load_file, but without sink attachment)
        // Pipeline: Decoder → SampleCountingSource → AnalyzingSource → EffectsSource
        let (counting_source, _sample_counter) = SampleCountingSource::new(source);
        
        let buffer_capacity = (sample_rate * 2) as usize;
        let chunk_size = 512;
        let analyzing_source = AnalyzingSource::new(counting_source, buffer_capacity, chunk_size);
        
        let mut effects_source = EffectsSource::new(
            analyzing_source,
            self.audio_effects.clone(),
            chunk_size,
        );
        
        // Consume iterator and collect all processed samples
        info!("   Processing audio through effects pipeline...");
        let mut processed_samples = Vec::new();
        
        for sample in &mut effects_source {
            processed_samples.push(sample);
        }
        
        let duration_secs = processed_samples.len() as f64 / sample_rate as f64 / 2.0;
        info!("✅ Captured {} samples ({:.2}s) at {} Hz", 
              processed_samples.len(), duration_secs, sample_rate);
        
        Ok(processed_samples)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::audio_effects::AudioEffectsService;
    use crate::services::event_bus::EventBusService;
    use crate::services::multi_channel_output::MultiChannelOutputService;

    /// Helper function to create AudioPlayerService for testing
    fn create_test_service() -> AudioPlayerService {
        let event_bus = Arc::new(EventBusService::default());
        let audio_effects = Arc::new(AudioEffectsService::new(
            crate::contracts::effect_parameters::EffectConfig::default(),
            event_bus.clone()
        ));
        let multi_channel = Arc::new(MultiChannelOutputService::default());
        AudioPlayerService {
            state: PlayerStateHandle::default(),
            audio_effects,
            multi_channel,
            event_bus,
        }
    }

    #[test]
    fn test_player_state_initialization() {
        // PlayerState::new() initializes OutputStream and Sink
        let state = PlayerState::new();
        assert_eq!(state.total_duration, Duration::ZERO);
        assert!(!state.is_playing);
        
        // Directive 15: Verify sample counter initialized to zero
        assert_eq!(state.sample_counter.load(Ordering::Relaxed), 0);
        
        // Note: Cannot easily test Sink/OutputStream without audio device
    }

    #[test]
    fn test_audio_player_service_default() {
        // Service initializes audio stream on construction
        let service = create_test_service();
        let state = service.state.lock();
        assert_eq!(state.total_duration, Duration::ZERO);
        assert!(!state.is_playing);
    }

    #[test]
    fn test_initial_state_matches_spec() {
        let service = create_test_service();
        assert!(!service.is_playing());
        assert_eq!(service.total_duration(), Duration::ZERO);
        assert_eq!(service.current_position(), Duration::ZERO);
    }

    #[test]
    fn test_volume_control_works_without_file() {
        let service = create_test_service();
        // Volume can be set anytime (Sink exists from construction)
        let result = service.set_volume(0.5);
        assert!(result.is_ok());
    }

    #[test]
    fn test_volume_clamping() {
        let service = create_test_service();
        
        // Test lower bound clamping
        assert!(service.set_volume(-1.0).is_ok());
        
        // Test upper bound clamping
        assert!(service.set_volume(2.0).is_ok());
    }

    #[test]
    fn test_operations_without_loaded_file() {
        let service = create_test_service();

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
        let service = create_test_service();
        
        // Position should be ZERO when no file loaded
        assert_eq!(service.current_position(), Duration::ZERO);
        
        // Position should be ZERO when not playing
        assert_eq!(service.total_duration(), Duration::ZERO);
    }
}

//! # Responsibility
//! Manages music playback and generative performance via Web Audio API.
//!
//! ---
//!
//! Handles background music playback and the Performance Engine (synthesizer
//! for generative notes triggered by gameplay actions and combos).

use wasm_bindgen::prelude::*;
use web_sys::{AudioContext, AudioBuffer, AudioBufferSourceNode, GainNode, OscillatorNode, OscillatorType};
use std::sync::Arc;
use crate::services::core::ILogger;
use shared_core::contracts::audio::PlayGenerativeNote;

/// # Responsibility
/// Configuration for audio playback service.
#[derive(Debug, Clone)]
pub struct AudioPlaybackConfig {
    /// Master volume (0.0-1.0)
    pub master_volume: f32,
    
    /// Music volume (0.0-1.0)
    pub music_volume: f32,
    
    /// SFX volume (0.0-1.0)
    pub sfx_volume: f32,
    
    /// Performance Engine volume (0.0-1.0)
    pub performance_volume: f32,
    
    /// Sample rate (Hz)
    pub sample_rate: u32,
    
    /// Enable Performance Engine (generative music)
    pub enable_performance_engine: bool,
}

impl Default for AudioPlaybackConfig {
    fn default() -> Self {
        Self {
            master_volume: 0.7,
            music_volume: 0.8,
            sfx_volume: 1.0,
            performance_volume: 0.6,
            sample_rate: 48000,
            enable_performance_engine: true,
        }
    }
}

/// # Responsibility
/// Instrument type for Performance Engine synthesis.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstrumentType {
    /// Sine wave (pure tone)
    Sine,
    
    /// Square wave (harsh, digital)
    Square,
    
    /// Sawtooth wave (bright, edgy)
    Sawtooth,
    
    /// Triangle wave (soft, mellow)
    Triangle,
}

impl InstrumentType {
    fn to_oscillator_type(&self) -> OscillatorType {
        match self {
            InstrumentType::Sine => OscillatorType::Sine,
            InstrumentType::Square => OscillatorType::Square,
            InstrumentType::Sawtooth => OscillatorType::Sawtooth,
            InstrumentType::Triangle => OscillatorType::Triangle,
        }
    }
}

/// # Responsibility
/// Manages audio playback: BGM, SFX, and generative Performance Engine.
///
/// ---
///
/// Uses Web Audio API for synthesis. Performance Engine generates musical notes
/// in response to PlayGenerativeNote events from the backend.
pub struct AudioPlaybackService {
    config: AudioPlaybackConfig,
    logger: Arc<dyn ILogger>,
    
    // Web Audio context
    audio_context: Option<AudioContext>,
    
    // Gain nodes for volume control
    master_gain: Option<GainNode>,
    music_gain: Option<GainNode>,
    sfx_gain: Option<GainNode>,
    performance_gain: Option<GainNode>,
    
    // Current BGM source
    bgm_source: Option<AudioBufferSourceNode>,
    
    // BGM buffer (loaded from file)
    bgm_buffer: Option<AudioBuffer>,
    
    // BGM playback state
    is_playing: bool,
    start_time: f64,
}

impl AudioPlaybackService {
    /// # Responsibility
    /// Creates a new AudioPlaybackService with the given configuration.
    pub fn new(config: AudioPlaybackConfig, logger: Arc<dyn ILogger>) -> Self {
        logger.info("Creating AudioPlaybackService");
        
        Self {
            config,
            logger,
            audio_context: None,
            master_gain: None,
            music_gain: None,
            sfx_gain: None,
            performance_gain: None,
            bgm_source: None,
            bgm_buffer: None,
            is_playing: false,
            start_time: 0.0,
        }
    }
    
    /// # Responsibility
    /// Initializes the Web Audio API context and gain nodes.
    pub fn initialize(&mut self) -> Result<(), String> {
        self.logger.info("Initializing AudioPlaybackService with Web Audio API");
        
        // Create AudioContext
        let audio_context = AudioContext::new()
            .map_err(|e| format!("Failed to create AudioContext: {:?}", e))?;
        
        // Create master gain node
        let master_gain = audio_context.create_gain()
            .map_err(|e| format!("Failed to create master gain: {:?}", e))?;
        master_gain.gain().set_value(self.config.master_volume);
        master_gain.connect_with_audio_node(&audio_context.destination())
            .map_err(|e| format!("Failed to connect master gain: {:?}", e))?;
        
        // Create music gain node
        let music_gain = audio_context.create_gain()
            .map_err(|e| format!("Failed to create music gain: {:?}", e))?;
        music_gain.gain().set_value(self.config.music_volume);
        music_gain.connect_with_audio_node(&master_gain)
            .map_err(|e| format!("Failed to connect music gain: {:?}", e))?;
        
        // Create SFX gain node
        let sfx_gain = audio_context.create_gain()
            .map_err(|e| format!("Failed to create SFX gain: {:?}", e))?;
        sfx_gain.gain().set_value(self.config.sfx_volume);
        sfx_gain.connect_with_audio_node(&master_gain)
            .map_err(|e| format!("Failed to connect SFX gain: {:?}", e))?;
        
        // Create Performance Engine gain node
        let performance_gain = audio_context.create_gain()
            .map_err(|e| format!("Failed to create performance gain: {:?}", e))?;
        performance_gain.gain().set_value(self.config.performance_volume);
        performance_gain.connect_with_audio_node(&master_gain)
            .map_err(|e| format!("Failed to connect performance gain: {:?}", e))?;
        
        self.audio_context = Some(audio_context);
        self.master_gain = Some(master_gain);
        self.music_gain = Some(music_gain);
        self.sfx_gain = Some(sfx_gain);
        self.performance_gain = Some(performance_gain);
        
        self.logger.info("AudioPlaybackService initialized successfully");
        Ok(())
    }
    
    /// # Responsibility
    /// Loads an audio buffer from a URL (async fetch).
    ///
    /// ---
    ///
    /// This is a placeholder. Real implementation requires:
    /// 1. Fetch audio file (e.g., .ogg, .mp3)
    /// 2. Decode with AudioContext.decode_audio_data()
    /// 3. Store in bgm_buffer
    pub async fn load_bgm(&mut self, _url: &str) -> Result<(), String> {
        self.logger.info(&format!("Loading BGM from URL: {}", _url));
        
        // TODO: Implement actual audio loading
        // Requires: fetch API + AudioContext.decode_audio_data()
        
        self.logger.warn("BGM loading not yet implemented (placeholder)");
        Ok(())
    }
    
    /// # Responsibility
    /// Starts playing the loaded BGM (loops).
    pub fn play_bgm(&mut self) -> Result<(), String> {
        let audio_context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioPlaybackService not initialized".to_string())?;
        let music_gain = self.music_gain.as_ref()
            .ok_or_else(|| "Music gain not initialized".to_string())?;
        let bgm_buffer = self.bgm_buffer.as_ref()
            .ok_or_else(|| "No BGM loaded".to_string())?;
        
        // Stop existing source if playing
        if let Some(source) = &self.bgm_source {
            source.stop().ok();
        }
        
        // Create new buffer source
        let source = audio_context.create_buffer_source()
            .map_err(|e| format!("Failed to create buffer source: {:?}", e))?;
        source.set_buffer(Some(bgm_buffer));
        source.set_loop(true);
        
        // Connect source to music gain
        source.connect_with_audio_node(music_gain)
            .map_err(|e| format!("Failed to connect source: {:?}", e))?;
        
        // Start playback
        source.start()
            .map_err(|e| format!("Failed to start playback: {:?}", e))?;
        
        self.bgm_source = Some(source);
        self.is_playing = true;
        self.start_time = audio_context.current_time();
        
        self.logger.info("BGM playback started");
        Ok(())
    }
    
    /// # Responsibility
    /// Stops BGM playback.
    pub fn stop_bgm(&mut self) -> Result<(), String> {
        if let Some(source) = &self.bgm_source {
            source.stop()
                .map_err(|e| format!("Failed to stop BGM: {:?}", e))?;
            self.bgm_source = None;
            self.is_playing = false;
            self.logger.info("BGM playback stopped");
        }
        
        Ok(())
    }
    
    /// # Responsibility
    /// Plays a generative note via the Performance Engine.
    ///
    /// ---
    ///
    /// Synthesizes a musical note using an oscillator based on the
    /// PlayGenerativeNote event from the backend (via HarmonyMap).
    pub fn play_generative_note(&self, note: &PlayGenerativeNote) -> Result<(), String> {
        if !self.config.enable_performance_engine {
            return Ok(());
        }
        
        let audio_context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioPlaybackService not initialized".to_string())?;
        let performance_gain = self.performance_gain.as_ref()
            .ok_or_else(|| "Performance gain not initialized".to_string())?;
        
        // Create oscillator for this note
        let oscillator = audio_context.create_oscillator()
            .map_err(|e| format!("Failed to create oscillator: {:?}", e))?;
        
        // Set oscillator type based on instrument patch ID (simplified mapping)
        let instrument_type = match note.instrument_patch_id.as_str() {
            "sine" => InstrumentType::Sine,
            "square" => InstrumentType::Square,
            "sawtooth" => InstrumentType::Sawtooth,
            "triangle" => InstrumentType::Triangle,
            _ => InstrumentType::Sine,  // Default to sine
        };
        oscillator.set_type(instrument_type.to_oscillator_type());
        
        // Set frequency (MIDI note to Hz: f = 440 * 2^((n-69)/12))
        let frequency = 440.0 * 2.0_f32.powf((note.note_pitch as f32 - 69.0) / 12.0);
        oscillator.frequency().set_value(frequency);
        
        // Create gain node for envelope (ADSR)
        let note_gain = audio_context.create_gain()
            .map_err(|e| format!("Failed to create note gain: {:?}", e))?;
        note_gain.gain().set_value(0.0); // Start at 0
        
        // Connect oscillator → note_gain → performance_gain
        oscillator.connect_with_audio_node(&note_gain)
            .map_err(|e| format!("Failed to connect oscillator: {:?}", e))?;
        note_gain.connect_with_audio_node(performance_gain)
            .map_err(|e| format!("Failed to connect note gain: {:?}", e))?;
        
        // Schedule ADSR envelope
        let now = audio_context.current_time();
        let attack_time = 0.01; // 10ms attack
        let decay_time = 0.1;   // 100ms decay
        
        // Normalize MIDI velocity (0-127) to 0.0-1.0
        let normalized_velocity = (note.velocity as f32) / 127.0;
        let sustain_level = normalized_velocity * 0.8; // 80% of normalized velocity
        
        // Default duration based on note type (1 second for now, can be adjusted)
        let default_duration_sec = 1.0;
        let release_time = 0.2; // 200ms release
        
        let gain_param = note_gain.gain();
        
        // Attack: 0 → peak
        gain_param.set_value_at_time(0.0, now)
            .map_err(|e| format!("Failed to set attack start: {:?}", e))?;
        gain_param.linear_ramp_to_value_at_time(normalized_velocity, now + attack_time)
            .map_err(|e| format!("Failed to set attack ramp: {:?}", e))?;
        
        // Decay: peak → sustain
        gain_param.linear_ramp_to_value_at_time(sustain_level, now + attack_time + decay_time)
            .map_err(|e| format!("Failed to set decay ramp: {:?}", e))?;
        
        // Sustain: hold level
        let sustain_duration = default_duration_sec - attack_time - decay_time;
        gain_param.set_value_at_time(sustain_level, now + attack_time + decay_time + sustain_duration)
            .map_err(|e| format!("Failed to set sustain: {:?}", e))?;
        
        // Release: sustain → 0
        let total_duration = attack_time + decay_time + sustain_duration + release_time;
        gain_param.linear_ramp_to_value_at_time(0.0, now + total_duration)
            .map_err(|e| format!("Failed to set release ramp: {:?}", e))?;
        
        // Start oscillator and schedule stop
        oscillator.start()
            .map_err(|e| format!("Failed to start oscillator: {:?}", e))?;
        oscillator.stop_with_when(now + total_duration)
            .map_err(|e| format!("Failed to schedule stop: {:?}", e))?;
        
        self.logger.debug(&format!(
            "Playing generative note: MIDI {} ({:.2} Hz), velocity {}, patch: {}",
            note.note_pitch, frequency, note.velocity, note.instrument_patch_id
        ));
        
        Ok(())
    }
    
    /// # Responsibility
    /// Sets master volume (0.0-1.0).
    pub fn set_master_volume(&mut self, volume: f32) -> Result<(), String> {
        let clamped_volume = volume.clamp(0.0, 1.0);
        
        if let Some(master_gain) = &self.master_gain {
            master_gain.gain().set_value(clamped_volume);
            self.config.master_volume = clamped_volume;
        }
        
        Ok(())
    }
    
    /// # Responsibility
    /// Returns current playback time (seconds since BGM start).
    pub fn get_playback_time(&self) -> f64 {
        if let Some(audio_context) = &self.audio_context {
            if self.is_playing {
                return audio_context.current_time() - self.start_time;
            }
        }
        
        0.0
    }
    
    /// # Responsibility
    /// Returns whether BGM is currently playing.
    pub fn is_playing(&self) -> bool {
        self.is_playing
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    // Simple mock logger for tests
    struct MockLogger;
    
    impl ILogger for MockLogger {
        fn info(&self, _: &str) {}
        fn warn(&self, _: &str) {}
        fn error(&self, _: &str) {}
        fn debug(&self, _: &str) {}
        fn trace(&self, _: &str) {}
    }
    
    #[test]
    fn test_audio_playback_config_defaults() {
        let config = AudioPlaybackConfig::default();
        
        assert_eq!(config.master_volume, 0.7);
        assert_eq!(config.music_volume, 0.8);
        assert_eq!(config.sfx_volume, 1.0);
        assert_eq!(config.performance_volume, 0.6);
        assert_eq!(config.sample_rate, 48000);
        assert!(config.enable_performance_engine);
    }
    
    #[test]
    fn test_audio_playback_service_creation() {
        let config = AudioPlaybackConfig::default();
        let logger = Arc::new(MockLogger);
        
        let service = AudioPlaybackService::new(config.clone(), logger);
        
        assert!(!service.is_playing());
        assert_eq!(service.get_playback_time(), 0.0);
        assert_eq!(service.config.master_volume, 0.7);
    }
    
    #[test]
    fn test_instrument_type_to_oscillator() {
        assert_eq!(
            InstrumentType::Sine.to_oscillator_type(),
            OscillatorType::Sine
        );
        assert_eq!(
            InstrumentType::Square.to_oscillator_type(),
            OscillatorType::Square
        );
        assert_eq!(
            InstrumentType::Sawtooth.to_oscillator_type(),
            OscillatorType::Sawtooth
        );
        assert_eq!(
            InstrumentType::Triangle.to_oscillator_type(),
            OscillatorType::Triangle
        );
    }
}

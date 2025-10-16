//! # Responsibility
//! Web Audio API wrapper for audio context management and node creation.
//!
//! ---
//!
//! Provides RAII-based lifecycle management for AudioContext.
//! Handles browser autoplay policies via user gesture requirement.

use web_sys::{AudioContext, AudioContextState, AudioBuffer, GainNode, AudioNode};
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use js_sys::Float32Array;
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for Web Audio API.
#[derive(Debug, Clone)]
pub struct WebAudioConfig {
    /// Sample rate (44100 or 48000 Hz)
    pub sample_rate: f64,
    
    /// Latency hint ("interactive", "balanced", or "playback")
    pub latency_hint: String,
}

impl Default for WebAudioConfig {
    fn default() -> Self {
        Self {
            sample_rate: 44100.0,
            latency_hint: "interactive".to_string(),
        }
    }
}

/// # Responsibility
/// Manages Web Audio API AudioContext and provides node creation utilities.
pub struct WebAudioService {
    config: WebAudioConfig,
    logger: Arc<dyn ILogger>,
    audio_context: Option<AudioContext>,
    master_gain: Option<GainNode>,
}

impl WebAudioService {
    /// # Responsibility
    /// Creates new Web Audio service (AudioContext not started until resume()).
    pub fn new(config: WebAudioConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            audio_context: None,
            master_gain: None,
        }
    }
    
    /// # Responsibility
    /// Initializes AudioContext (requires user gesture in most browsers).
    ///
    /// ---
    ///
    /// Should be called from user interaction event (click, keypress, etc.).
    /// Returns error if AudioContext creation fails or is not supported.
    pub fn initialize(&mut self) -> Result<(), String> {
        if self.audio_context.is_some() {
            return Ok(()); // Already initialized
        }
        
        // Create AudioContext (browser will use best available sample rate)
        let context = AudioContext::new()
            .map_err(|e| format!("Failed to create AudioContext: {:?}", e))?;
        
        // Create master gain node (for global volume control)
        let master_gain = context.create_gain()
            .map_err(|e| format!("Failed to create master gain: {:?}", e))?;
        
        // Connect master gain to destination (speakers)
        master_gain.connect_with_audio_node(&context.destination())
            .map_err(|e| format!("Failed to connect master gain: {:?}", e))?;
        
        let actual_sample_rate = context.sample_rate();
        
        self.logger.info(&format!(
            "Web Audio initialized: Sample rate = {} Hz (requested: {}), Latency = {}",
            actual_sample_rate, self.config.sample_rate, self.config.latency_hint
        ));
        
        self.audio_context = Some(context);
        self.master_gain = Some(master_gain);
        
        Ok(())
    }
    
    /// # Responsibility
    /// Resumes AudioContext (required after page load in most browsers).
    ///
    /// ---
    ///
    /// Must be called from user gesture. Returns Ok if context is running.
    pub async fn resume(&self) -> Result<(), String> {
        let context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioContext not initialized".to_string())?;
        
        if context.state() == AudioContextState::Running {
            return Ok(()); // Already running
        }
        
        wasm_bindgen_futures::JsFuture::from(context.resume())
            .await
            .map_err(|e| format!("Failed to resume AudioContext: {:?}", e))?;
        
        self.logger.info("AudioContext resumed");
        Ok(())
    }
    
    /// # Responsibility
    /// Suspends AudioContext (pauses all audio processing).
    pub async fn suspend(&self) -> Result<(), String> {
        let context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioContext not initialized".to_string())?;
        
        wasm_bindgen_futures::JsFuture::from(context.suspend())
            .await
            .map_err(|e| format!("Failed to suspend AudioContext: {:?}", e))?;
        
        self.logger.info("AudioContext suspended");
        Ok(())
    }
    
    /// # Responsibility
    /// Gets AudioContext reference (for connecting nodes).
    pub fn get_context(&self) -> Result<&AudioContext, String> {
        self.audio_context.as_ref()
            .ok_or_else(|| "AudioContext not initialized".to_string())
    }
    
    /// # Responsibility
    /// Gets master gain node for global volume control.
    pub fn get_master_gain(&self) -> Result<&GainNode, String> {
        self.master_gain.as_ref()
            .ok_or_else(|| "Master gain not initialized".to_string())
    }
    
    /// # Responsibility
    /// Sets master volume (0.0 = mute, 1.0 = 100%).
    pub fn set_master_volume(&self, volume: f32) -> Result<(), String> {
        let gain = self.get_master_gain()?;
        let clamped = volume.clamp(0.0, 1.0);
        
        gain.gain().set_value(clamped);
        Ok(())
    }
    
    /// # Responsibility
    /// Creates AudioBuffer from PCM samples.
    ///
    /// ---
    ///
    /// Used for loading audio files or generating procedural audio.
    pub fn create_buffer(
        &self,
        channels: u32,
        length: u32,
        sample_rate: f32,
    ) -> Result<AudioBuffer, String> {
        let context = self.get_context()?;
        
        context.create_buffer(channels, length, sample_rate)
            .map_err(|e| format!("Failed to create AudioBuffer: {:?}", e))
    }
    
    /// # Responsibility
    /// Fills AudioBuffer with PCM samples.
    pub fn fill_buffer_channel(
        &self,
        buffer: &AudioBuffer,
        channel: u32,
        data: &[f32],
    ) -> Result<(), String> {
        buffer.copy_to_channel(data, channel as i32)
            .map_err(|e| format!("Failed to fill buffer channel: {:?}", e))
    }
    
    /// # Responsibility
    /// Gets current audio context time (in seconds).
    ///
    /// ---
    ///
    /// Used for precise scheduling of audio events.
    pub fn get_current_time(&self) -> Result<f64, String> {
        let context = self.get_context()?;
        Ok(context.current_time())
    }
    
    /// # Responsibility
    /// Checks if AudioContext is running.
    pub fn is_running(&self) -> bool {
        self.audio_context.as_ref()
            .map(|ctx| ctx.state() == AudioContextState::Running)
            .unwrap_or(false)
    }
}

impl Drop for WebAudioService {
    fn drop(&mut self) {
        if let Some(context) = &self.audio_context {
            // Suspend context to free resources
            let _ = context.suspend();
            self.logger.info("AudioContext closed");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::MockLogger;
    
    #[test]
    fn test_web_audio_config_defaults() {
        let config = WebAudioConfig::default();
        assert_eq!(config.sample_rate, 44100.0);
        assert_eq!(config.latency_hint, "interactive");
    }
    
    #[test]
    fn test_service_creation() {
        let logger = Arc::new(MockLogger::new());
        let service = WebAudioService::new(WebAudioConfig::default(), logger);
        
        // Should not be initialized yet
        assert!(!service.is_running());
        assert!(service.get_context().is_err());
    }
}

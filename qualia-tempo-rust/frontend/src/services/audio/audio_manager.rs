//! # Responsibility
//! Central audio manager orchestrating all audio services.
//!
//! ---
//!
//! Coordinates Web Audio API, FFT analysis, and spatial audio.
//! Provides high-level API for gameplay audio integration.

use std::sync::Arc;
use wasm_bindgen::JsCast;
use web_sys::HtmlAudioElement;
use crate::services::core::ILogger;
use super::{WebAudioService, WebAudioConfig, FFTAnalyzerService, FFTConfig, FrequencyBands};
use super::{SpatialAudioService, SpatialAudioConfig};

/// # Responsibility
/// Configuration for audio manager.
#[derive(Debug, Clone)]
pub struct AudioManagerConfig {
    pub web_audio: WebAudioConfig,
    pub fft: FFTConfig,
    pub spatial_audio: SpatialAudioConfig,
    pub master_volume: f32,
}

impl Default for AudioManagerConfig {
    fn default() -> Self {
        Self {
            web_audio: WebAudioConfig::default(),
            fft: FFTConfig::default(),
            spatial_audio: SpatialAudioConfig::default(),
            master_volume: 0.7,
        }
    }
}

/// # Responsibility
/// Orchestrates all audio services for the frontend.
pub struct AudioManager {
    config: AudioManagerConfig,
    logger: Arc<dyn ILogger>,
    web_audio: WebAudioService,
    fft_analyzer: Option<FFTAnalyzerService>,
    spatial_audio: Option<SpatialAudioService>,
    music_element: Option<HtmlAudioElement>,
}

impl AudioManager {
    /// # Responsibility
    /// Creates new audio manager with configuration.
    pub fn new(config: AudioManagerConfig, logger: Arc<dyn ILogger>) -> Self {
        let web_audio = WebAudioService::new(config.web_audio.clone(), logger.clone());
        
        Self {
            config,
            logger,
            web_audio,
            fft_analyzer: None,
            spatial_audio: None,
            music_element: None,
        }
    }
    
    /// # Responsibility
    /// Initializes all audio systems (requires user gesture).
    ///
    /// ---
    ///
    /// Must be called from user interaction (click, keypress).
    /// Returns error if Web Audio API is not supported.
    pub async fn initialize(&mut self) -> Result<(), String> {
        // Initialize Web Audio API
        self.web_audio.initialize()?;
        self.web_audio.resume().await?;
        
        let context = self.web_audio.get_context()?.clone();
        
        // Initialize FFT analyzer
        let mut fft = FFTAnalyzerService::new(self.config.fft.clone(), self.logger.clone());
        let analyser = fft.connect(&context)?;
        
        // Connect analyser to master gain (so it receives all audio)
        let master_gain = self.web_audio.get_master_gain()?;
        analyser.connect_with_audio_node(master_gain)
            .map_err(|e| format!("Failed to connect analyser: {:?}", e))?;
        
        self.fft_analyzer = Some(fft);
        
        // Initialize spatial audio
        let mut spatial = SpatialAudioService::new(
            self.config.spatial_audio.clone(),
            self.logger.clone(),
        );
        spatial.connect(&context)?;
        self.spatial_audio = Some(spatial);
        
        // Set master volume
        self.web_audio.set_master_volume(self.config.master_volume)?;
        
        self.logger.info("AudioManager fully initialized");
        Ok(())
    }
    
    /// # Responsibility
    /// Loads music file and connects to audio graph.
    ///
    /// ---
    ///
    /// Connects HTMLAudioElement → MediaElementSourceNode → FFT → Master Gain → Speakers.
    pub async fn load_music(&mut self, url: &str) -> Result<(), String> {
        use web_sys::window;
        
        let window = window().ok_or_else(|| "No window found".to_string())?;
        let document = window.document().ok_or_else(|| "No document found".to_string())?;
        
        // Create <audio> element
        let audio = document.create_element("audio")
            .map_err(|e| format!("Failed to create audio element: {:?}", e))?
            .dyn_into::<HtmlAudioElement>()
            .map_err(|_| "Failed to cast to HtmlAudioElement".to_string())?;
        
        audio.set_src(url);
        audio.set_cross_origin(Some("anonymous")); // Required for CORS
        
        // Get audio context
        let context = self.web_audio.get_context()?;
        
        // Create MediaElementSourceNode
        let source = context.create_media_element_source(&audio)
            .map_err(|e| format!("Failed to create media source: {:?}", e))?;
        
        // Connect: MediaElementSource → MasterGain (FFT is already tapped into master gain)
        let master_gain = self.web_audio.get_master_gain()?;
        source.connect_with_audio_node(master_gain)
            .map_err(|e| format!("Failed to connect media source: {:?}", e))?;
        
        self.music_element = Some(audio);
        
        self.logger.info(&format!("Music loaded: {}", url));
        Ok(())
    }
    
    /// # Responsibility
    /// Starts playing the loaded music.
    pub async fn play_music(&self) -> Result<(), String> {
        let audio = self.music_element.as_ref()
            .ok_or_else(|| "No music loaded".to_string())?;
        
        wasm_bindgen_futures::JsFuture::from(audio.play()?)
            .await
            .map_err(|e| format!("Failed to play music: {:?}", e))?;
        
        self.logger.info("Music playing");
        Ok(())
    }
    
    /// # Responsibility
    /// Pauses the currently playing music.
    pub fn pause_music(&self) -> Result<(), String> {
        let audio = self.music_element.as_ref()
            .ok_or_else(|| "No music loaded".to_string())?;
        
        audio.pause()
            .map_err(|e| format!("Failed to pause music: {:?}", e))?;
        
        self.logger.info("Music paused");
        Ok(())
    }
    
    /// # Responsibility
    /// Analyzes current audio frame and returns frequency bands.
    ///
    /// ---
    ///
    /// Call this once per animation frame (60 FPS) for real-time analysis.
    pub fn analyze_audio(&self) -> Result<FrequencyBands, String> {
        let fft = self.fft_analyzer.as_ref()
            .ok_or_else(|| "FFT analyzer not initialized".to_string())?;
        
        fft.analyze_frame()
    }
    
    /// # Responsibility
    /// Gets current music playback time (in seconds).
    pub fn get_music_time(&self) -> Result<f64, String> {
        let audio = self.music_element.as_ref()
            .ok_or_else(|| "No music loaded".to_string())?;
        
        Ok(audio.current_time())
    }
    
    /// # Responsibility
    /// Sets music playback time (for seeking).
    pub fn set_music_time(&self, time: f64) -> Result<(), String> {
        let audio = self.music_element.as_ref()
            .ok_or_else(|| "No music loaded".to_string())?;
        
        audio.set_current_time(time);
        Ok(())
    }
    
    /// # Responsibility
    /// Gets music duration (in seconds).
    pub fn get_music_duration(&self) -> Result<f64, String> {
        let audio = self.music_element.as_ref()
            .ok_or_else(|| "No music loaded".to_string())?;
        
        Ok(audio.duration())
    }
    
    /// # Responsibility
    /// Sets master volume (0.0 to 1.0).
    pub fn set_master_volume(&mut self, volume: f32) -> Result<(), String> {
        self.config.master_volume = volume.clamp(0.0, 1.0);
        self.web_audio.set_master_volume(self.config.master_volume)
    }
    
    /// # Responsibility
    /// Gets reference to spatial audio service.
    pub fn get_spatial_audio(&self) -> Option<&SpatialAudioService> {
        self.spatial_audio.as_ref()
    }
    
    /// # Responsibility
    /// Checks if audio is playing.
    pub fn is_playing(&self) -> bool {
        self.music_element.as_ref()
            .map(|audio| !audio.paused())
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::MockLogger;
    
    #[test]
    fn test_audio_manager_config_defaults() {
        let config = AudioManagerConfig::default();
        assert_eq!(config.master_volume, 0.7);
        assert_eq!(config.web_audio.sample_rate, 44100.0);
        assert_eq!(config.fft.fft_size, 2048);
    }
    
    #[test]
    fn test_audio_manager_creation() {
        let logger = Arc::new(MockLogger::new());
        let manager = AudioManager::new(AudioManagerConfig::default(), logger);
        
        // Should not be playing yet
        assert!(!manager.is_playing());
    }
}

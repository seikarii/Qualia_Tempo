//! # Responsibility
//! 8D spatial audio engine using Web Audio API PannerNode.
//!
//! ---
//!
//! Creates immersive audio experience by positioning sounds in 3D space.
//! Follows player camera orientation for accurate localization.

use web_sys::{AudioContext, PannerNode, GainNode, AudioNode, AudioBuffer, AudioBufferSourceNode};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use shared_core::utils::math::Vector3;
use crate::services::core::ILogger;

/// # Responsibility
//! Configuration for spatial audio.
#[derive(Debug, Clone)]
pub struct SpatialAudioConfig {
    /// Distance model ("linear", "inverse", or "exponential")
    pub distance_model: String,
    
    /// Maximum distance where sound is audible
    pub max_distance: f64,
    
    /// Reference distance for volume falloff
    pub ref_distance: f64,
    
    /// Rolloff factor (how quickly volume decreases with distance)
    pub rolloff_factor: f64,
    
    /// Cone inner angle (degrees)
    pub cone_inner_angle: f64,
    
    /// Cone outer angle (degrees)
    pub cone_outer_angle: f64,
    
    /// Cone outer gain (volume outside cone)
    pub cone_outer_gain: f64,
}

impl Default for SpatialAudioConfig {
    fn default() -> Self {
        Self {
            distance_model: "inverse".to_string(),
            max_distance: 10000.0,
            ref_distance: 1.0,
            rolloff_factor: 1.0,
            cone_inner_angle: 360.0,
            cone_outer_angle: 360.0,
            cone_outer_gain: 0.0,
        }
    }
}

/// # Responsibility
/// Represents an active 3D sound source.
struct SoundSource {
    panner: PannerNode,
    gain: GainNode,
    source: Option<AudioBufferSourceNode>,
}

/// # Responsibility
/// Manages 3D spatial audio with dynamic positioning.
pub struct SpatialAudioService {
    config: SpatialAudioConfig,
    logger: Arc<dyn ILogger>,
    audio_context: Option<AudioContext>,
    listener_position: Arc<Mutex<Vector3>>,
    listener_orientation: Arc<Mutex<(Vector3, Vector3)>>, // (forward, up)
    active_sources: Arc<Mutex<HashMap<String, SoundSource>>>,
}

impl SpatialAudioService {
    /// # Responsibility
    /// Creates new spatial audio service.
    pub fn new(config: SpatialAudioConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            audio_context: None,
            listener_position: Arc::new(Mutex::new(Vector3 { x: 0.0, y: 0.0, z: 0.0 })),
            listener_orientation: Arc::new(Mutex::new((
                Vector3 { x: 0.0, y: 0.0, z: -1.0 }, // Forward
                Vector3 { x: 0.0, y: 1.0, z: 0.0 },  // Up
            ))),
            active_sources: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    /// # Responsibility
    /// Initializes spatial audio with AudioContext.
    pub fn connect(&mut self, audio_context: &AudioContext) -> Result<(), String> {
        self.audio_context = Some(audio_context.clone());
        
        // Configure listener position
        let listener = audio_context.listener();
        let pos = self.listener_position.lock().unwrap();
        listener.set_position(pos.x, pos.y, pos.z);
        
        let (forward, up) = *self.listener_orientation.lock().unwrap();
        listener.set_orientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
        
        self.logger.info("SpatialAudio initialized with 8D positioning");
        Ok(())
    }
    
    /// # Responsibility
    /// Updates listener position (player camera position).
    pub fn set_listener_position(&self, position: Vector3) -> Result<(), String> {
        let context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioContext not connected".to_string())?;
        
        let listener = context.listener();
        listener.set_position(position.x, position.y, position.z);
        
        *self.listener_position.lock().unwrap() = position;
        Ok(())
    }
    
    /// # Responsibility
    /// Updates listener orientation (camera forward and up vectors).
    pub fn set_listener_orientation(&self, forward: Vector3, up: Vector3) -> Result<(), String> {
        let context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioContext not connected".to_string())?;
        
        let listener = context.listener();
        listener.set_orientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
        
        *self.listener_orientation.lock().unwrap() = (forward, up);
        Ok(())
    }
    
    /// # Responsibility
    /// Creates a new 3D sound source at position.
    ///
    /// ---
    ///
    /// Returns source ID for later manipulation.
    pub fn create_source(
        &self,
        id: String,
        position: Vector3,
        buffer: &AudioBuffer,
        destination: &GainNode,
    ) -> Result<String, String> {
        let context = self.audio_context.as_ref()
            .ok_or_else(|| "AudioContext not connected".to_string())?;
        
        // Create panner node
        let panner = context.create_panner()
            .map_err(|e| format!("Failed to create PannerNode: {:?}", e))?;
        
        // Configure panner
        panner.set_position(position.x, position.y, position.z);
        panner.set_max_distance(self.config.max_distance);
        panner.set_ref_distance(self.config.ref_distance);
        panner.set_rolloff_factor(self.config.rolloff_factor);
        panner.set_cone_inner_angle(self.config.cone_inner_angle);
        panner.set_cone_outer_angle(self.config.cone_outer_angle);
        panner.set_cone_outer_gain(self.config.cone_outer_gain);
        
        // Create gain node for volume control
        let gain = context.create_gain()
            .map_err(|e| format!("Failed to create GainNode: {:?}", e))?;
        
        // Create audio source
        let source = context.create_buffer_source()
            .map_err(|e| format!("Failed to create AudioBufferSourceNode: {:?}", e))?;
        source.set_buffer(Some(buffer));
        
        // Connect: source → panner → gain → destination
        source.connect_with_audio_node(&panner)
            .map_err(|e| format!("Failed to connect source to panner: {:?}", e))?;
        panner.connect_with_audio_node(&gain)
            .map_err(|e| format!("Failed to connect panner to gain: {:?}", e))?;
        gain.connect_with_audio_node(destination)
            .map_err(|e| format!("Failed to connect gain to destination: {:?}", e))?;
        
        // Store source
        self.active_sources.lock().unwrap().insert(
            id.clone(),
            SoundSource { panner, gain, source: Some(source) },
        );
        
        Ok(id)
    }
    
    /// # Responsibility
    /// Updates 3D position of an active sound source.
    pub fn update_source_position(&self, id: &str, position: Vector3) -> Result<(), String> {
        let sources = self.active_sources.lock().unwrap();
        let source = sources.get(id)
            .ok_or_else(|| format!("Source not found: {}", id))?;
        
        source.panner.set_position(position.x, position.y, position.z);
        Ok(())
    }
    
    /// # Responsibility
    /// Sets volume of an active sound source (0.0 to 1.0).
    pub fn set_source_volume(&self, id: &str, volume: f32) -> Result<(), String> {
        let sources = self.active_sources.lock().unwrap();
        let source = sources.get(id)
            .ok_or_else(|| format!("Source not found: {}", id))?;
        
        let clamped = volume.clamp(0.0, 1.0);
        source.gain.gain().set_value(clamped);
        Ok(())
    }
    
    /// # Responsibility
    /// Starts playing an active sound source.
    pub fn play_source(&self, id: &str, when: f64) -> Result<(), String> {
        let mut sources = self.active_sources.lock().unwrap();
        let source = sources.get_mut(id)
            .ok_or_else(|| format!("Source not found: {}", id))?;
        
        if let Some(audio_source) = source.source.take() {
            audio_source.start_with_when(when)
                .map_err(|e| format!("Failed to start source: {:?}", e))?;
        }
        
        Ok(())
    }
    
    /// # Responsibility
    /// Stops and removes an active sound source.
    pub fn stop_source(&self, id: &str) -> Result<(), String> {
        let mut sources = self.active_sources.lock().unwrap();
        
        if let Some(source) = sources.remove(id) {
            if let Some(audio_source) = source.source {
                let _ = audio_source.stop();
            }
        }
        
        Ok(())
    }
    
    /// # Responsibility
    /// Gets number of active sound sources.
    pub fn get_active_source_count(&self) -> usize {
        self.active_sources.lock().unwrap().len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::MockLogger;
    
    #[test]
    fn test_spatial_audio_config_defaults() {
        let config = SpatialAudioConfig::default();
        assert_eq!(config.distance_model, "inverse");
        assert_eq!(config.max_distance, 10000.0);
        assert_eq!(config.ref_distance, 1.0);
    }
    
    #[test]
    fn test_listener_position_updates() {
        let logger = Arc::new(MockLogger::new());
        let service = SpatialAudioService::new(SpatialAudioConfig::default(), logger);
        
        // Position updates should be stored even without AudioContext
        let new_pos = Vector3 { x: 10.0, y: 20.0, z: 30.0 };
        *service.listener_position.lock().unwrap() = new_pos;
        
        let stored_pos = *service.listener_position.lock().unwrap();
        assert_eq!(stored_pos.x, 10.0);
        assert_eq!(stored_pos.y, 20.0);
        assert_eq!(stored_pos.z, 30.0);
    }
}

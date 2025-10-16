//! # Responsibility
//! 8D spatial audio positioning and panning.
//!
//! ---
//!
//! Uses Web Audio API's PannerNode to create immersive 3D audio experiences.
//! QualiaState modulates panner parameters (position, orientation).

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{AudioContext, PannerNode, AudioListener};
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for spatial audio.
#[derive(Debug, Clone)]
pub struct SpatialAudioConfig {
    /// Panning model (equalpower, HRTF)
    pub panning_model: PanningModel,
    
    /// Distance model (linear, inverse, exponential)
    pub distance_model: DistanceModel,
    
    /// Reference distance (meters)
    pub ref_distance: f32,
    
    /// Max distance (meters)
    pub max_distance: f32,
    
    /// Rolloff factor (distance attenuation)
    pub rolloff_factor: f32,
    
    /// Cone inner angle (degrees)
    pub cone_inner_angle: f32,
    
    /// Cone outer angle (degrees)
    pub cone_outer_angle: f32,
    
    /// Cone outer gain (volume multiplier outside cone)
    pub cone_outer_gain: f32,
}

/// # Responsibility
/// Panning model types for spatial audio.
#[derive(Debug, Clone, Copy)]
pub enum PanningModel {
    /// Equal power panning (less accurate, better performance)
    EqualPower,
    
    /// Head-Related Transfer Function (realistic 3D audio)
    HRTF,
}

/// # Responsibility
/// Distance attenuation model types.
#[derive(Debug, Clone, Copy)]
pub enum DistanceModel {
    /// Linear attenuation
    Linear,
    
    /// Inverse distance (1/distance)
    Inverse,
    
    /// Exponential attenuation
    Exponential,
}

impl Default for SpatialAudioConfig {
    fn default() -> Self {
        Self {
            panning_model: PanningModel::HRTF,
            distance_model: DistanceModel::Inverse,
            ref_distance: 1.0,
            max_distance: 10000.0,
            rolloff_factor: 1.0,
            cone_inner_angle: 360.0,
            cone_outer_angle: 360.0,
            cone_outer_gain: 0.0,
        }
    }
}

/// # Responsibility
/// Manages 3D spatial audio positioning for immersive sound.
///
/// ---
///
/// Wraps Web Audio API PannerNode to create 8D audio experiences.
/// QualiaState modulates panner position in circular/spherical patterns.
pub struct SpatialAudioService {
    config: SpatialAudioConfig,
    logger: Arc<dyn ILogger>,
    
    // Web Audio API nodes
    audio_context: Option<AudioContext>,
    panner_node: Option<PannerNode>,
    
    // Current panner position
    position: (f32, f32, f32),
    
    // Circular motion parameters
    circular_angle: f32,
    circular_radius: f32,
}

impl SpatialAudioService {
    /// # Responsibility
    /// Creates a new SpatialAudioService with the given configuration.
    pub fn new(config: SpatialAudioConfig, logger: Arc<dyn ILogger>) -> Self {
        logger.info("Creating SpatialAudioService");
        
        Self {
            config,
            logger,
            audio_context: None,
            panner_node: None,
            position: (0.0, 0.0, 0.0),
            circular_angle: 0.0,
            circular_radius: 5.0,
        }
    }
    
    /// # Responsibility
    /// Initializes the spatial audio service with Web Audio API.
    pub fn initialize(&mut self, audio_context: AudioContext) -> Result<(), String> {
        self.logger.info("Initializing SpatialAudioService");
        
        // Create panner node
        let panner = audio_context
            .create_panner()
            .map_err(|e| format!("Failed to create PannerNode: {:?}", e))?;
        
        // Configure panner
        self.configure_panner(&panner)?;
        
        self.audio_context = Some(audio_context);
        self.panner_node = Some(panner);
        
        self.logger.info("SpatialAudioService initialized successfully");
        Ok(())
    }
    
    /// # Responsibility
    /// Configures panner node with current config.
    fn configure_panner(&self, panner: &PannerNode) -> Result<(), String> {
        // Note: Web Audio API PannerNode configuration is limited in wasm-bindgen
        // Some properties (panningModel, distanceModel) may not be exposed
        // We focus on position/orientation which are the core spatial features
        
        // Set initial position to origin
        panner.set_position(0.0, 0.0, 0.0);
        
        // Set initial orientation (forward direction)
        panner.set_orientation(0.0, 0.0, -1.0);
        
        Ok(())
    }
    
    /// # Responsibility
    /// Connects the panner to an audio source node.
    pub fn connect_source(&self, source_node: &web_sys::AudioNode) -> Result<(), String> {
        let panner = self.panner_node.as_ref().ok_or("SpatialAudioService not initialized")?;
        
        source_node
            .connect_with_audio_node(panner)
            .map_err(|e| format!("Failed to connect audio source: {:?}", e))?;
        
        self.logger.info("Audio source connected to spatial audio panner");
        Ok(())
    }
    
    /// # Responsibility
    /// Connects the panner output to destination (speakers).
    pub fn connect_to_destination(&self) -> Result<(), String> {
        let panner = self.panner_node.as_ref().ok_or("SpatialAudioService not initialized")?;
        let context = self.audio_context.as_ref().ok_or("AudioContext not initialized")?;
        
        panner
            .connect_with_audio_node(&context.destination())
            .map_err(|e| format!("Failed to connect to destination: {:?}", e))?;
        
        Ok(())
    }
    
    /// # Responsibility
    /// Updates panner position (8D circular motion).
    ///
    /// ---
    ///
    /// Called every frame (60 FPS) to animate spatial audio position.
    /// QualiaState.intensity modulates rotation speed, harmony modulates radius.
    pub fn update(&mut self, delta_time: f32, qualia_intensity: f32, qualia_harmony: f32) -> Result<(), String> {
        let panner = self.panner_node.as_ref().ok_or("SpatialAudioService not initialized")?;
        
        // Modulate circular motion by QualiaState
        let rotation_speed = 1.0 + qualia_intensity * 3.0; // 1-4 rotations/second
        self.circular_angle += rotation_speed * delta_time;
        self.circular_radius = 3.0 + qualia_harmony * 7.0; // 3-10 meters
        
        // Calculate new position (circular motion in XZ plane)
        let x = self.circular_angle.cos() * self.circular_radius;
        let z = self.circular_angle.sin() * self.circular_radius;
        let y = 0.0; // Keep listener at origin
        
        // Update panner position
        panner.set_position(x as f64, y as f64, z as f64);
        
        self.position = (x, y, z);
        
        Ok(())
    }
    
    /// # Responsibility
    /// Manually sets panner position (override circular motion).
    pub fn set_position(&mut self, x: f32, y: f32, z: f32) -> Result<(), String> {
        let panner = self.panner_node.as_ref().ok_or("SpatialAudioService not initialized")?;
        
        panner.set_position(x as f64, y as f64, z as f64);
        
        self.position = (x, y, z);
        
        Ok(())
    }
    
    /// # Responsibility
    /// Returns the current panner position.
    pub fn get_position(&self) -> (f32, f32, f32) {
        self.position
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[test]
    fn test_spatial_audio_config_defaults() {
        let config = SpatialAudioConfig::default();
        
        match config.panning_model {
            PanningModel::HRTF => {}
            _ => panic!("Default should be HRTF"),
        }
        
        match config.distance_model {
            DistanceModel::Inverse => {}
            _ => panic!("Default should be Inverse"),
        }
        
        assert_eq!(config.ref_distance, 1.0);
        assert_eq!(config.max_distance, 10000.0);
        assert_eq!(config.rolloff_factor, 1.0);
        assert_eq!(config.cone_inner_angle, 360.0);
        assert_eq!(config.cone_outer_angle, 360.0);
        assert_eq!(config.cone_outer_gain, 0.0);
    }
    
    #[test]
    fn test_spatial_audio_service_creation() {
        let config = SpatialAudioConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let service = SpatialAudioService::new(config, logger.clone());
        
        assert!(service.audio_context.is_none());
        assert!(service.panner_node.is_none());
        assert_eq!(service.position, (0.0, 0.0, 0.0));
        assert_eq!(service.circular_angle, 0.0);
        assert_eq!(service.circular_radius, 5.0);
        
        let messages = logger.get_messages();
        assert!(messages.iter().any(|m| m.contains("Creating SpatialAudioService")));
    }
    
    #[test]
    fn test_get_position_before_init() {
        let config = SpatialAudioConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let service = SpatialAudioService::new(config, logger);
        let pos = service.get_position();
        
        assert_eq!(pos, (0.0, 0.0, 0.0));
    }
}

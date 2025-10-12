//! # Responsibility
//! Implements 8D audio effect using binaural panning and HRTF-inspired phase manipulation.
//!
//! ---
//!
//! The 8D effect creates the illusion of sound moving in a circle around the listener's head.
//! This is achieved through:
//! 1. Amplitude panning (volume differences between L/R)
//! 2. Phase/time delays (ITD - Interaural Time Difference)
//! 3. Spectral shaping (ILD - Interaural Level Difference approximation)

use crate::error::{Audio8DError, Result};
use std::f32::consts::PI;
use tracing::info;

/// # Responsibility
/// Configuration for 8D spatial processing.
#[derive(Debug, Clone)]
pub struct Spatial8DConfig {
    /// Rotation speed in Hz (revolutions per second)
    pub rotation_speed: f32,
    /// Intensity of the effect (0.0 = subtle, 1.0 = extreme)
    pub intensity: f32,
    /// Enable HRTF-inspired filtering
    pub enable_hrtf: bool,
}

impl Default for Spatial8DConfig {
    fn default() -> Self {
        Self {
            rotation_speed: 0.5,  // Half rotation per second
            intensity: 0.8,
            enable_hrtf: true,
        }
    }
}

/// # Responsibility
/// Applies 8D spatial effect to stereo audio.
///
/// ---
///
/// The algorithm rotates the sound source in a circle, using:
/// - Equal-power panning for smooth L/R transitions
/// - ITD simulation via sample delay (max ~0.7ms for human head)
/// - Optional spectral filtering for elevation cues
pub fn apply_8d_effect(
    samples: &[f32],
    sample_rate: u32,
    channels: u16,
    config: &Spatial8DConfig,
) -> Result<Vec<f32>> {
    if channels != 2 {
        return Err(Audio8DError::InvalidParameters(
            "8D effect requires stereo input".into(),
        ));
    }

    info!("Applying 8D effect: rotation_speed={}, intensity={}", 
          config.rotation_speed, config.intensity);

    let num_frames = samples.len() / 2;
    let mut output = vec![0.0f32; samples.len()];

    // Maximum ITD delay for human head (~0.7ms = 30 samples at 44.1kHz)
    let max_delay_samples = ((sample_rate as f32) * 0.0007) as usize;
    
    // Circular rotation phase accumulator
    let rotation_increment = 2.0 * PI * config.rotation_speed / (sample_rate as f32);

    for frame_idx in 0..num_frames {
        let left_in = samples[frame_idx * 2];
        let right_in = samples[frame_idx * 2 + 1];
        
        // Calculate current angle (0 to 2π)
        let angle = (frame_idx as f32) * rotation_increment;
        
        // Equal-power panning law: L = cos(θ), R = sin(θ)
        let pan_left = ((angle + PI / 4.0).cos() * config.intensity).clamp(-1.0, 1.0);
        let pan_right = ((angle + PI / 4.0).sin() * config.intensity).clamp(-1.0, 1.0);
        
        // Calculate ITD (Interaural Time Difference)
        // Positive angle = sound more on right, delay left channel
        let itd_delay = (angle.sin() * max_delay_samples as f32 * config.intensity) as isize;
        
        // Apply panning and ITD
        let left_delayed_idx = (frame_idx as isize + itd_delay).max(0).min(num_frames as isize - 1) as usize;
        let right_delayed_idx = (frame_idx as isize - itd_delay).max(0).min(num_frames as isize - 1) as usize;
        
        let left_delayed = samples[left_delayed_idx * 2];
        let right_delayed = samples[right_delayed_idx * 2 + 1];
        
        // Mix original with spatial effect
        let left_out = left_in * (1.0 - config.intensity) + left_delayed * pan_left * config.intensity;
        let right_out = right_in * (1.0 - config.intensity) + right_delayed * pan_right * config.intensity;
        
        // Optional HRTF-inspired high-frequency boost for frontal positioning
        let hrtf_modifier = if config.enable_hrtf {
            1.0 + 0.3 * angle.cos() * config.intensity
        } else {
            1.0
        };
        
        output[frame_idx * 2] = (left_out * hrtf_modifier).clamp(-1.0, 1.0);
        output[frame_idx * 2 + 1] = (right_out * hrtf_modifier).clamp(-1.0, 1.0);
    }

    info!("8D effect applied successfully");
    Ok(output)
}

/// # Responsibility
/// Converts mono audio to stereo for 8D processing.
pub fn mono_to_stereo(samples: &[f32]) -> Vec<f32> {
    let mut stereo = Vec::with_capacity(samples.len() * 2);
    for &sample in samples {
        stereo.push(sample);
        stereo.push(sample);
    }
    stereo
}

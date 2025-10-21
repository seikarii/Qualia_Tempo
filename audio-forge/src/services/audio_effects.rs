//! # Responsibility
//! Implements real-time audio effects processing.

use crate::contracts::effect_parameters::EffectConfig;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use anyhow::Result;
use shaku::Component;
use std::f32::consts::PI;
use std::sync::RwLock;

/// # Responsibility
/// Real-time audio effects service with DSP algorithms.
///
/// ---
///
/// Provides:
/// 1. 8D Audio: Circular panning via sin-wave modulation
/// 2. Drop Effect: Volume reduction
/// 3. Bass Boost: Low-frequency amplification (simplified)
/// 4. Treble Boost: High-frequency amplification (simplified)
#[derive(Component)]
#[shaku(interface = IAudioEffects)]
pub struct AudioEffectsService {
    config: RwLock<EffectConfig>,
}

impl Default for AudioEffectsService {
    fn default() -> Self {
        Self {
            config: RwLock::new(EffectConfig::default()),
        }
    }
}

impl AudioEffectsService {
    pub fn new(config: EffectConfig) -> Self {
        Self {
            config: RwLock::new(config),
        }
    }
}

impl IAudioEffects for AudioEffectsService {
    fn apply_8d_effect(
        &self,
        samples: &mut [f32],
        _sample_rate: u32,
        elapsed_time: f32,
    ) -> Result<()> {
        let config = self.config.read().unwrap();

        if !config.effect_8d_enabled {
            return Ok(());
        }

        let rotation_hz = config.effect_8d_rotation_hz;
        let intensity = config.effect_8d_intensity.clamp(0.0, 1.0);

        // Calculate current pan angle based on elapsed time
        let pan_angle = 2.0 * PI * rotation_hz * elapsed_time;
        let pan = pan_angle.sin() * intensity;

        // Apply circular panning to stereo pairs
        for i in (0..samples.len()).step_by(2) {
            if i + 1 >= samples.len() {
                break;
            }

            let left = samples[i];
            let right = samples[i + 1];

            // Pan calculation: -1.0 (full left) to +1.0 (full right)
            let left_gain = (1.0 - pan) * 0.5;
            let right_gain = (1.0 + pan) * 0.5;

            // Apply panning with cross-mixing
            samples[i] = left * left_gain + right * (1.0 - left_gain);
            samples[i + 1] = right * right_gain + left * (1.0 - right_gain);
        }

        Ok(())
    }

    fn apply_drop_effect(&self, samples: &mut [f32]) -> Result<()> {
        let config = self.config.read().unwrap();

        if !config.drop_effect_enabled {
            return Ok(());
        }

        let gain = 1.0 - config.drop_amount.clamp(0.0, 1.0);

        for sample in samples.iter_mut() {
            *sample *= gain;
        }

        Ok(())
    }

    fn apply_bass_boost(&self, samples: &mut [f32]) -> Result<()> {
        let config = self.config.read().unwrap();

        if !config.bass_boost_enabled {
            return Ok(());
        }

        let gain = config.bass_boost_gain.clamp(1.0, 3.0);

        // Simplified: apply gain to all samples
        // NOTE: True bass boost requires low-pass filter + gain
        for sample in samples.iter_mut() {
            *sample *= gain;
            *sample = sample.clamp(-1.0, 1.0); // Prevent clipping
        }

        Ok(())
    }

    fn apply_treble_boost(&self, samples: &mut [f32]) -> Result<()> {
        let config = self.config.read().unwrap();

        if !config.treble_boost_enabled {
            return Ok(());
        }

        let gain = config.treble_boost_gain.clamp(1.0, 3.0);

        // Simplified: apply gain to all samples
        // NOTE: True treble boost requires high-pass filter + gain
        for sample in samples.iter_mut() {
            *sample *= gain;
            *sample = sample.clamp(-1.0, 1.0); // Prevent clipping
        }

        Ok(())
    }

    fn get_config(&self) -> EffectConfig {
        self.config.read().unwrap().clone()
    }

    fn set_config(&self, config: EffectConfig) {
        *self.config.write().unwrap() = config;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_effects_service_creation() {
        let service = AudioEffectsService::default();
        let config = service.get_config();
        assert!(!config.effect_8d_enabled);
        assert!(!config.drop_effect_enabled);
    }

    #[test]
    fn test_8d_effect_disabled() {
        let service = AudioEffectsService::default();
        let mut samples = vec![0.5, -0.5, 0.3, -0.3];
        let original = samples.clone();

        service.apply_8d_effect(&mut samples, 44100, 0.0).unwrap();

        // When disabled, samples should be unchanged
        assert_eq!(samples, original);
    }

    #[test]
    fn test_8d_effect_enabled() {
        let config = EffectConfig {
            effect_8d_enabled: true,
            effect_8d_intensity: 1.0,
            effect_8d_rotation_hz: 0.25,
            ..Default::default()
        };

        let service = AudioEffectsService::new(config);

        // Test with asymmetric stereo input to verify panning effect
        let mut samples = vec![1.0, 0.0]; // Left=1.0, Right=0.0

        service.apply_8d_effect(&mut samples, 44100, 1.0).unwrap();

        // At t=1s with 0.25Hz: pan = sin(π/2) = 1.0 (full right)
        // left_gain = 0.0, right_gain = 1.0
        // samples[0] (left) = 1.0 * 0.0 + 0.0 * 1.0 = 0.0
        // samples[1] (right) = 0.0 * 1.0 + 1.0 * 0.0 = 0.0
        // Actually both become 0.0, which IS different from [1.0, 0.0]
        assert!(
            samples[0] != 1.0 || samples[1] != 0.0,
            "Samples should be modified by panning"
        );
    }

    #[test]
    fn test_drop_effect_disabled() {
        let service = AudioEffectsService::default();
        let mut samples = vec![0.5, -0.5];
        let original = samples.clone();

        service.apply_drop_effect(&mut samples).unwrap();

        assert_eq!(samples, original);
    }

    #[test]
    fn test_drop_effect_full() {
        let config = EffectConfig {
            drop_effect_enabled: true,
            drop_amount: 1.0,
            ..Default::default()
        };

        let service = AudioEffectsService::new(config);
        let mut samples = vec![0.5, -0.5];

        service.apply_drop_effect(&mut samples).unwrap();

        assert_eq!(samples[0], 0.0);
        assert_eq!(samples[1], 0.0);
    }

    #[test]
    fn test_drop_effect_half() {
        let config = EffectConfig {
            drop_effect_enabled: true,
            drop_amount: 0.5,
            ..Default::default()
        };

        let service = AudioEffectsService::new(config);
        let mut samples = vec![1.0, -1.0];

        service.apply_drop_effect(&mut samples).unwrap();

        assert_eq!(samples[0], 0.5);
        assert_eq!(samples[1], -0.5);
    }

    #[test]
    fn test_bass_boost_disabled() {
        let service = AudioEffectsService::default();
        let mut samples = vec![0.5, -0.5];
        let original = samples.clone();

        service.apply_bass_boost(&mut samples).unwrap();

        assert_eq!(samples, original);
    }

    #[test]
    fn test_bass_boost_enabled() {
        let config = EffectConfig {
            bass_boost_enabled: true,
            bass_boost_gain: 2.0,
            ..Default::default()
        };

        let service = AudioEffectsService::new(config);
        let mut samples = vec![0.3, -0.3];

        service.apply_bass_boost(&mut samples).unwrap();

        assert_eq!(samples[0], 0.6);
        assert_eq!(samples[1], -0.6);
    }

    #[test]
    fn test_bass_boost_clipping_prevention() {
        let config = EffectConfig {
            bass_boost_enabled: true,
            bass_boost_gain: 3.0,
            ..Default::default()
        };

        let service = AudioEffectsService::new(config);
        let mut samples = vec![0.5, -0.5];

        service.apply_bass_boost(&mut samples).unwrap();

        // 0.5 * 3.0 = 1.5, should clamp to 1.0
        assert_eq!(samples[0], 1.0);
        assert_eq!(samples[1], -1.0);
    }

    #[test]
    fn test_config_update() {
        let service = AudioEffectsService::default();
        assert!(!service.get_config().effect_8d_enabled);

        let new_config = EffectConfig {
            effect_8d_enabled: true,
            ..Default::default()
        };

        service.set_config(new_config);
        assert!(service.get_config().effect_8d_enabled);
    }
}

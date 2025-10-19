//! # Responsibility
//! Creates ensemble/chorus effect through duplication and micro-variations.

use super::SphericalPosition;

/// # Responsibility
/// Single voice in ensemble with spatial position.
#[derive(Debug, Clone)]
pub struct EnhancedVoice {
    pub samples: Vec<f32>,
    pub position: SphericalPosition,
    pub level: f32,
}

/// # Responsibility
/// Generates ensemble effect with multiple spatially distributed voices.
pub struct EnsembleEffect {
    num_voices: usize,
    delay_range_ms: (f32, f32),
    spatial_spread_deg: f32,
    sample_rate: u32,
}

impl EnsembleEffect {
    pub fn new(num_voices: usize, delay_range_ms: (f32, f32), spatial_spread_deg: f32, sample_rate: u32) -> Self {
        Self {
            num_voices,
            delay_range_ms,
            spatial_spread_deg,
            sample_rate,
        }
    }

    /// Apply ensemble effect to input
    pub fn apply(&self, input: &[f32], base_position: &SphericalPosition) -> Vec<EnhancedVoice> {
        let mut voices = Vec::with_capacity(self.num_voices);
        
        for i in 0..self.num_voices {
            // Calculate delay for this voice
            let delay_ms = self.delay_range_ms.0 + 
                (self.delay_range_ms.1 - self.delay_range_ms.0) * (i as f32 / self.num_voices as f32);
            let delay_samples = ((delay_ms / 1000.0) * self.sample_rate as f32) as usize;
            
            // Apply delay
            let delayed = self.apply_delay(input, delay_samples);
            
            // Calculate spatial position offset
            let angle_offset = (i as f32 / self.num_voices as f32) * self.spatial_spread_deg;
            let elevation_offset = (i as f32 - self.num_voices as f32 / 2.0) * 5.0;
            
            let position = SphericalPosition {
                azimuth_deg: (base_position.azimuth_deg + angle_offset) % 360.0,
                elevation_deg: (base_position.elevation_deg + elevation_offset).clamp(-90.0, 90.0),
                distance_m: base_position.distance_m,
            };
            
            voices.push(EnhancedVoice {
                samples: delayed,
                position,
                level: 1.0 / self.num_voices as f32,
            });
        }
        
        voices
    }

    /// Apply simple delay
    fn apply_delay(&self, input: &[f32], delay_samples: usize) -> Vec<f32> {
        let mut output = vec![0.0; input.len()];
        
        if delay_samples < input.len() {
            output[delay_samples..].copy_from_slice(&input[..(input.len() - delay_samples)]);
        }
        
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_ensemble_effect_creation() {
        let effect = EnsembleEffect::new(5, (5.0, 25.0), 15.0, 48000);
        assert_eq!(effect.num_voices, 5);
    }

    #[test]
    fn test_apply_generates_correct_voice_count() {
        let effect = EnsembleEffect::new(3, (5.0, 25.0), 15.0, 48000);
        let input = vec![1.0; 1000];
        let base_pos = SphericalPosition {
            azimuth_deg: 0.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let voices = effect.apply(&input, &base_pos);
        assert_eq!(voices.len(), 3);
    }

    #[test]
    fn test_voices_have_different_positions() {
        let effect = EnsembleEffect::new(3, (5.0, 25.0), 15.0, 48000);
        let input = vec![1.0; 1000];
        let base_pos = SphericalPosition {
            azimuth_deg: 0.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let voices = effect.apply(&input, &base_pos);
        
        // All voices should have different azimuths
        for i in 0..voices.len() - 1 {
            assert_ne!(voices[i].position.azimuth_deg, voices[i + 1].position.azimuth_deg);
        }
    }

    #[test]
    fn test_voice_levels_sum_to_one() {
        let effect = EnsembleEffect::new(4, (5.0, 25.0), 15.0, 48000);
        let input = vec![1.0; 1000];
        let base_pos = SphericalPosition {
            azimuth_deg: 0.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let voices = effect.apply(&input, &base_pos);
        let total_level: f32 = voices.iter().map(|v| v.level).sum();
        
        assert!((total_level - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_delay_application() {
        let effect = EnsembleEffect::new(1, (10.0, 10.0), 0.0, 48000);
        let mut input = vec![0.0; 1000];
        input[0] = 1.0; // Impulse at start
        
        let delayed = effect.apply_delay(&input, 480); // 10ms at 48kHz
        
        // Check impulse moved
        assert_eq!(delayed[0], 0.0);
        assert_eq!(delayed[480], 1.0);
    }

    #[test]
    fn test_ensemble_preserves_sample_length() {
        let effect = EnsembleEffect::new(3, (5.0, 25.0), 15.0, 48000);
        let input = vec![0.5; 2000];
        let base_pos = SphericalPosition {
            azimuth_deg: 45.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let voices = effect.apply(&input, &base_pos);
        
        for voice in voices {
            assert_eq!(voice.samples.len(), input.len());
        }
    }

    #[test]
    fn test_zero_voices_still_returns_empty_vec() {
        // Edge case: zero voices should return empty vec, not crash
        let effect = EnsembleEffect::new(0, (5.0, 25.0), 15.0, 48000);
        let input = vec![0.5; 1000];
        let base_pos = SphericalPosition {
            azimuth_deg: 0.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let voices = effect.apply(&input, &base_pos);
        assert_eq!(voices.len(), 0);
    }

    #[test]
    fn test_single_voice_no_spread() {
        let effect = EnsembleEffect::new(1, (0.0, 0.0), 0.0, 48000);
        let input = vec![1.0; 100];
        let base_pos = SphericalPosition {
            azimuth_deg: 90.0,
            elevation_deg: 10.0,
            distance_m: 2.0,
        };
        
        let voices = effect.apply(&input, &base_pos);
        assert_eq!(voices.len(), 1);
        
        // With no spread, voice should be at base position
        assert_relative_eq!(voices[0].position.azimuth_deg, 90.0, epsilon = 0.1);
        assert_relative_eq!(voices[0].position.elevation_deg, 10.0, epsilon = 5.0);
    }

    #[test]
    fn test_empty_input() {
        let effect = EnsembleEffect::new(3, (5.0, 25.0), 15.0, 48000);
        let input: Vec<f32> = vec![];
        let base_pos = SphericalPosition {
            azimuth_deg: 0.0,
            elevation_deg: 0.0,
            distance_m: 1.5,
        };
        
        let voices = effect.apply(&input, &base_pos);
        
        for voice in voices {
            assert_eq!(voice.samples.len(), 0);
        }
    }
}

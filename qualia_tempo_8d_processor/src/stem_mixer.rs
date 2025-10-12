//! # Responsibility
//! Provides stem mixdown with anti-clipping for parallel audio processing.
//!
//! ---
//!
//! This module combines multiple processed stems into a final stereo mix,
//! applying soft limiting and normalization to prevent digital clipping.

use crate::audio_loader::AudioData;
use crate::stem_separator::Stem;
use anyhow::Result;
use std::collections::HashMap;
use tracing::{info, warn};

/// # Responsibility
/// Configuration for mixdown processing.
#[derive(Debug, Clone)]
pub struct MixdownConfig {
    /// Enable soft limiting (tanh-based compression)
    pub enable_soft_limiting: bool,
    /// Limiter threshold in dB (typical: -0.5 to -1.0)
    pub limiter_threshold_db: f32,
    /// Enable peak normalization
    pub normalize: bool,
    /// Target peak level in dB (typical: -0.1 for headroom)
    pub target_peak_db: f32,
}

impl Default for MixdownConfig {
    fn default() -> Self {
        Self {
            enable_soft_limiting: true,
            limiter_threshold_db: -0.5,
            normalize: true,
            target_peak_db: -0.1,
        }
    }
}

/// # Responsibility
/// Converts dB to linear amplitude.
fn db_to_linear(db: f32) -> f32 {
    10.0_f32.powf(db / 20.0)
}

/// # Responsibility
/// Converts linear amplitude to dB.
fn linear_to_db(linear: f32) -> f32 {
    20.0 * linear.log10()
}

/// # Responsibility
/// Applies soft limiting using tanh compression.
///
/// ---
///
/// **Algorithm**: Hyperbolic tangent provides smooth saturation
/// that preserves transients while preventing hard clipping.
fn apply_soft_limiter(sample: f32, threshold: f32) -> f32 {
    let abs_sample = sample.abs();
    
    if abs_sample <= threshold {
        // Below threshold: pass through unchanged
        sample
    } else {
        // Above threshold: apply tanh compression
        let excess = abs_sample - threshold;
        let compressed = threshold + excess.tanh() * (1.0 - threshold);
        compressed * sample.signum()
    }
}

/// # Responsibility
/// Mixes multiple stems into a single stereo AudioData with anti-clipping.
///
/// ---
///
/// **Process:**
/// 1. Sum all stem samples
/// 2. Apply soft limiting if enabled
/// 3. Normalize to target peak if enabled
pub fn mixdown(
    stems: HashMap<Stem, AudioData>,
    config: MixdownConfig,
) -> Result<AudioData> {
    if stems.is_empty() {
        anyhow::bail!("Cannot mixdown empty stems");
    }

    // Verify all stems have same properties
    let first_stem = stems.values().next().unwrap();
    let frame_count = first_stem.samples.len();
    let sample_rate = first_stem.sample_rate;
    let channels = 2;

    for stem in stems.values() {
        if stem.samples.len() != frame_count
            || stem.sample_rate != sample_rate
            || 2 != channels
        {
            anyhow::bail!(
                "All stems must have matching properties (samples: {}, rate: {}, channels: {})",
                frame_count,
                sample_rate,
                channels
            );
        }
    }

    info!(
        "Mixing {} stems: {} frames, {} Hz, {} channels",
        stems.len(),
        frame_count,
        sample_rate,
        channels
    );

    // Initialize mixed audio
    let mut mixed = AudioData {
        samples: vec![[0.0, 0.0]; frame_count],
        sample_rate,
    };

    // Sum all stems
    for (stem_type, stem_data) in &stems {
        info!("Adding {:?} stem to mix", stem_type);
        for (i, frame) in stem_data.samples.iter().enumerate() {
            mixed.samples[i][0] += frame[0];
            mixed.samples[i][1] += frame[1];
        }
    }

    // Apply soft limiting if enabled
    if config.enable_soft_limiting {
        let threshold = db_to_linear(config.limiter_threshold_db);
        info!(
            "Applying soft limiter (threshold: {:.2} dB = {:.4} linear)",
            config.limiter_threshold_db, threshold
        );

        for frame in &mut mixed.samples {
            frame[0] = apply_soft_limiter(frame[0], threshold);
            frame[1] = apply_soft_limiter(frame[1], threshold);
        }
    }

    // Normalize if enabled
    if config.normalize {
        // Find peak amplitude
        let mut peak = 0.0_f32;
        for frame in &mixed.samples {
            peak = peak.max(frame[0].abs()).max(frame[1].abs());
        }

        if peak > 0.0 {
            let peak_db = linear_to_db(peak);
            let target_linear = db_to_linear(config.target_peak_db);
            let gain = target_linear / peak;

            info!(
                "Normalizing: peak = {:.2} dB, target = {:.2} dB, gain = {:.4}",
                peak_db, config.target_peak_db, gain
            );

            if gain < 1.0 {
                // Only apply gain if we need to reduce volume
                for frame in &mut mixed.samples {
                    frame[0] *= gain;
                    frame[1] *= gain;
                }
            } else {
                info!("Peak already below target, no normalization needed");
            }
        } else {
            warn!("Mixed audio is silent, skipping normalization");
        }
    }

    // Final clipping check
    let mut clipped_samples = 0;
    for frame in &mixed.samples {
        if frame[0].abs() > 1.0 || frame[1].abs() > 1.0 {
            clipped_samples += 1;
        }
    }

    if clipped_samples > 0 {
        warn!(
            "Warning: {} samples ({:.2}%) exceed [-1.0, 1.0] range after mixdown",
            clipped_samples,
            (clipped_samples as f32 / frame_count as f32) * 100.0
        );
    } else {
        info!("Mixdown complete: no clipping detected");
    }

    Ok(mixed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_conversions() {
        assert!((db_to_linear(0.0) - 1.0).abs() < 0.001);
        assert!((db_to_linear(-6.0) - 0.5012).abs() < 0.001);
        assert!((linear_to_db(1.0) - 0.0).abs() < 0.001);
        assert!((linear_to_db(0.5) - (-6.02)).abs() < 0.1);
    }

    #[test]
    fn test_soft_limiter_passthrough() {
        let threshold = 0.8;
        let sample = 0.5;
        let result = apply_soft_limiter(sample, threshold);
        assert_eq!(result, sample, "Below threshold should pass through");
    }

    #[test]
    fn test_soft_limiter_compression() {
        let threshold = 0.8;
        let sample = 1.5;
        let result = apply_soft_limiter(sample, threshold);
        assert!(result < sample, "Above threshold should compress");
        assert!(result > threshold, "Result should be above threshold");
        assert!(result < 1.0, "Result should not exceed 1.0");
    }

    #[test]
    fn test_mixdown_empty_stems() {
        let stems: HashMap<Stem, AudioData> = HashMap::new();
        let config = MixdownConfig::default();
        let result = mixdown(stems, config);
        assert!(result.is_err(), "Empty stems should return error");
    }

    #[test]
    fn test_mixdown_single_stem() {
        let mut stems = HashMap::new();
        stems.insert(
            Stem::Bass,
            AudioData {
                samples: vec![[0.5, 0.5]; 100],
                sample_rate: 48000,
            },
        );

        let config = MixdownConfig {
            enable_soft_limiting: false,
            normalize: false,
            ..Default::default()
        };

        let result = mixdown(stems, config).expect("Mixdown failed");
        assert_eq!(result.samples.len(), 100);
        assert_eq!(result.sample_rate, 48000);
        
        assert!((result.samples[0][0] - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_mixdown_multiple_stems() {
        let mut stems = HashMap::new();
        
        stems.insert(
            Stem::Bass,
            AudioData {
                samples: vec![[0.3, 0.3]; 100],
                sample_rate: 48000,
            },
        );
        
        stems.insert(
            Stem::Vocals,
            AudioData {
                samples: vec![[0.4, 0.4]; 100],
                sample_rate: 48000,
            },
        );

        let config = MixdownConfig {
            enable_soft_limiting: false,
            normalize: false,
            ..Default::default()
        };

        let result = mixdown(stems, config).expect("Mixdown failed");
        // Should sum to 0.7
        assert!((result.samples[0][0] - 0.7).abs() < 0.001);
    }

    #[test]
    fn test_mixdown_with_limiting() {
        let mut stems = HashMap::new();
        
        stems.insert(
            Stem::Bass,
            AudioData {
                samples: vec![[0.8, 0.8]; 100],
                sample_rate: 48000,
            },
        );
        
        stems.insert(
            Stem::Drums,
            AudioData {
                samples: vec![[0.8, 0.8]; 100],
                sample_rate: 48000,
            },
        );

        let config = MixdownConfig {
            enable_soft_limiting: true,
            limiter_threshold_db: -1.0,
            normalize: false,
            target_peak_db: -0.1,
        };

        let result = mixdown(stems, config).expect("Mixdown failed");
        
        // Sum would be 1.6 without limiting
        // With limiting, should be compressed
        assert!(result.samples[0][0] < 1.6, "Should compress");
        assert!(result.samples[0][0] < 1.0, "Should not exceed 1.0");
    }
}

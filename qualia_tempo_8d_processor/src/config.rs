//! # Responsibility
//! Configuration structures for the audio processor and effects.
//!
//! ---
//!
//! All configuration values are validated and provide sensible defaults.

use crate::stem_mixer::MixdownConfig;

/// # Responsibility
/// Global processor configuration controlling which effects are enabled.
///
/// ---
///
/// **LEGACY**: This config is for v0.2 serial processing.
/// Use `ProcessorConfigV2` for parallel stem processing.
#[derive(Debug, Clone)]
pub struct ProcessorConfig {
    pub enable_spatial: bool,
    pub enable_drop_enhancer: bool,
    pub enable_orchestra: bool,
    pub enable_vocal_adjust: bool,
    pub rotation_speed: f32,
    pub drop_threshold: f32,
}

impl Default for ProcessorConfig {
    fn default() -> Self {
        Self {
            enable_spatial: true,
            enable_drop_enhancer: true,
            enable_orchestra: false,
            enable_vocal_adjust: false,
            rotation_speed: 0.2,
            drop_threshold: 0.7,
        }
    }
}

/// # Responsibility
/// Per-stem effect configuration for parallel processing (Quasar Mixer v2.0).
///
/// ---
///
/// Allows independent effect chains for each stem, enabling
/// granular control over the sonic landscape.
#[derive(Debug, Clone)]
pub struct StemConfig {
    /// Enable 8D spatial effect for this stem
    pub enable_spatial: bool,
    /// Rotation speed for Spatial8D effect (rad/s)
    pub rotation_speed: f32,
    /// Enable drop enhancer (bass boost on transients)
    pub enable_drop_enhancer: bool,
    /// RMS threshold for drop detection (0.0-1.0)
    pub drop_threshold: f32,
    /// Enable orchestral effect (multi-voice widening)
    pub enable_orchestra: bool,
    /// Enable vocal adjustment (formant enhancement)
    pub enable_vocal_adjust: bool,
}

impl Default for StemConfig {
    fn default() -> Self {
        Self {
            enable_spatial: false,
            rotation_speed: 0.2,
            enable_drop_enhancer: false,
            drop_threshold: 0.7,
            enable_orchestra: false,
            enable_vocal_adjust: false,
        }
    }
}

/// # Responsibility
/// Complete processor configuration for parallel stem processing (v2.0).
///
/// ---
///
/// **Architecture**: Quasar Mixer
/// - Separate audio into 4 stems (Bass, Drums, Vocals, Presence)
/// - Apply independent effect chains to each stem
/// - Mix stems with anti-clipping
#[derive(Debug, Clone)]
pub struct ProcessorConfigV2 {
    /// Configuration for Bass stem (20-200 Hz)
    pub bass: StemConfig,
    /// Configuration for Drums stem (transients in 200Hz-4kHz)
    pub drums: StemConfig,
    /// Configuration for Vocals stem (sustained in 200Hz-4kHz)
    pub vocals: StemConfig,
    /// Configuration for Presence stem (4kHz-20kHz)
    pub presence: StemConfig,
    /// Mixdown configuration (limiting, normalization)
    pub mixdown: MixdownConfig,
}

impl Default for ProcessorConfigV2 {
    fn default() -> Self {
        Self {
            // Bass: Drop enhancer + slow spatial rotation
            bass: StemConfig {
                enable_drop_enhancer: true,
                drop_threshold: 0.7,
                enable_spatial: true,
                rotation_speed: 0.1, // Slow rotation for grounding effect
                ..Default::default()
            },
            // Drums: Drop enhancer + medium spatial rotation
            drums: StemConfig {
                enable_drop_enhancer: true,
                drop_threshold: 0.6,
                enable_spatial: true,
                rotation_speed: 0.25, // Medium rotation for presence
                ..Default::default()
            },
            // Vocals: Vocal adjust + fast spatial rotation
            vocals: StemConfig {
                enable_vocal_adjust: true,
                enable_spatial: true,
                rotation_speed: 0.35, // Fast rotation for 8D effect
                ..Default::default()
            },
            // Presence: Spatial rotation only (air and cymbals)
            presence: StemConfig {
                enable_spatial: true,
                rotation_speed: 0.4, // Very fast rotation for width
                ..Default::default()
            },
            mixdown: MixdownConfig::default(),
        }
    }
}

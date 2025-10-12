//! # Responsibility
//! Configuration structures for the audio processor and effects.
//!
//! ---
//!
//! All configuration values are validated and provide sensible defaults.

/// # Responsibility
/// Global processor configuration controlling which effects are enabled.
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

//! # Responsibility
//! Provides public API for standalone 8D audio processing engine.
//!
//! ---
//!
//! This library implements spatial audio effects including circular motion,
//! HRTF convolution, ensemble effects, and frequency boosting for immersive
//! 8D audio experiences.

pub mod audio;
pub mod cli;
pub mod config;

// Re-export key types for convenience
pub use audio::{
    AudioBuffer, BinauralSignal, CircularMotionEngine, EnsembleEffect, EnhancedVoice,
    FrequencyBooster, HRTFConvolver, InputHandler, RotationDirection, SpatialMixer,
    SphericalPosition,
};
pub use cli::Cli;
pub use config::Config;

/// Result type alias for this library
pub type Result<T> = anyhow::Result<T>;

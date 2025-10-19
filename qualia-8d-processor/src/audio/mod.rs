//! # Responsibility
//! Audio processing modules for 8D spatial audio effects.

pub mod circular_motion;
pub mod ensemble_effect;
pub mod eq_boost;
pub mod hrtf_convolution;
pub mod input_handler;
pub mod mixer;

// Re-export key types
pub use circular_motion::{CircularMotionEngine, RotationDirection, SphericalPosition};
pub use ensemble_effect::{EnsembleEffect, EnhancedVoice};
pub use eq_boost::FrequencyBooster;
pub use hrtf_convolution::{BinauralSignal, HRTFConvolver};
pub use input_handler::{AudioBuffer, InputHandler};
pub use mixer::SpatialMixer;

//! # Responsibility
//! Audio services for real-time music analysis and generative synthesis.

pub mod fft_analyzer;
pub mod web_audio;
pub mod spatial_audio;
pub mod audio_manager;

pub use fft_analyzer::*;
pub use web_audio::*;
pub use spatial_audio::*;
pub use audio_manager::*;

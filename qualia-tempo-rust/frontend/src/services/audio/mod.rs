//! # Responsibility
//! Audio services module for Web Audio API integration.

pub mod fft_analyzer;
pub mod spatial_audio;
pub mod playback;

pub use fft_analyzer::{FFTAnalyzerService, FFTAnalyzerConfig, FFTData};
pub use spatial_audio::{SpatialAudioService, SpatialAudioConfig, PanningModel, DistanceModel};
pub use playback::{AudioPlaybackService, AudioPlaybackConfig, InstrumentType};

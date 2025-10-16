//! # Responsibility
//! Audio services module - Web Audio API integration and analysis.

pub mod fft_analyzer;
pub mod spatial_audio;

pub use fft_analyzer::{FFTAnalyzerService, FFTAnalyzerConfig, FFTData};
pub use spatial_audio::{SpatialAudioService, SpatialAudioConfig, PanningModel, DistanceModel};

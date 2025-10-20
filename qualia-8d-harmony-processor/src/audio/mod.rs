//! # Responsibility
//! Audio processing modules for 8D spatialization and frequency manipulation

pub mod circular_motion;
pub mod convolution_reverb;
pub mod ensemble_effect;
pub mod frequency_booster;
pub mod hrtf_convolver;
pub mod input_handler;
pub mod pipeline;
pub mod psychoacoustic_bass;
pub mod sofa_loader;
pub mod spatial_mixer;

pub use circular_motion::{CircularMotionEngine, RotationDirection, SphericalPosition};
pub use convolution_reverb::{ConvolutionReverb, ConvolutionReverbConfig};
pub use ensemble_effect::{EnsembleConfig, EnsembleEffect, EnsembleMode, VoiceOutput};
pub use frequency_booster::{BiquadCoefficients, BiquadFilter, FrequencyBooster, FrequencyBoosterConfig};
pub use hrtf_convolver::HrtfConvolver;
pub use input_handler::{AudioBuffer, InputHandler, InputHandlerConfig};
pub use pipeline::{AudioProcessingPipeline, PipelineConfig};
pub use psychoacoustic_bass::{PsychoacousticBass, PsychoacousticBassConfig};
pub use sofa_loader::{HrirData, SofaLoader, SphericalCoord};
pub use spatial_mixer::{SpatialMixer, SpatialMixerConfig};

/// Binaural (stereo) output signal
#[derive(Debug, Clone)]
pub struct BinauralSignal {
    pub left: Vec<f32>,
    pub right: Vec<f32>,
}

impl BinauralSignal {
    pub fn new(size: usize) -> Self {
        Self {
            left: vec![0.0; size],
            right: vec![0.0; size],
        }
    }

    pub fn len(&self) -> usize {
        assert_eq!(self.left.len(), self.right.len());
        self.left.len()
    }

    pub fn is_empty(&self) -> bool {
        self.left.is_empty() && self.right.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binaural_signal_creation() {
        let signal = BinauralSignal::new(1024);
        assert_eq!(signal.len(), 1024);
        assert_eq!(signal.left.len(), 1024);
        assert_eq!(signal.right.len(), 1024);
    }
}

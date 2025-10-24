//! # Responsibility
//! High-fidelity mock for IMultiChannelOutput trait.
//!
//! ---
//!
//! Enables testing of 8.1 surround logic without hardware dependencies.

use crate::contracts::channel_configuration::{ChannelConfiguration, ChannelMode};
use crate::errors::MultiChannelError;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use mockall::mock;

mock! {
    /// # Responsibility
    /// Mock implementation of IMultiChannelOutput for unit testing.
    ///
    /// ---
    ///
    /// **STATE SIMULATION**: Mock can simulate hardware presence:
    /// ```rust
    /// mock.expect_is_8_1_supported()
    ///     .return_const(true); // Simulate 8.1 hardware
    ///
    /// mock.expect_upmix_stereo_to_8_1()
    ///     .returning(|stereo| Ok(vec![0.0; stereo.len() * 4])); // 2→8 channels
    /// ```
    pub MultiChannelOutput {}

    impl IMultiChannelOutput for MultiChannelOutput {
        fn configure_8_1_channels(&self) -> Result<(), MultiChannelError>;
        fn upmix_stereo_to_8_1(&self, stereo_samples: &[f32]) -> Result<Vec<f32>, MultiChannelError>;
        fn is_8_1_supported(&self) -> bool;
        fn fallback_to_stereo(&self) -> Result<(), MultiChannelError>;
        fn get_configuration(&self) -> ChannelConfiguration;
        fn redetect_8_1_hardware(&self) -> bool;
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_is_8_1_supported() {
        let mut mock = MockMultiChannelOutput::new();
        
        mock.expect_is_8_1_supported()
            .times(1)
            .return_const(true);

        assert!(mock.is_8_1_supported());
    }

    #[test]
    fn test_mock_upmix_stereo_to_8_1() {
        let mut mock = MockMultiChannelOutput::new();
        
        // Simulate 2→8 channel expansion
        mock.expect_upmix_stereo_to_8_1()
            .returning(|stereo_samples| {
                // 8 channels: FL, FR, FC, LFE, BL, BR, SL, SR
                let num_frames = stereo_samples.len() / 2;
                Ok(vec![0.0; num_frames * 8])
            });

        let stereo = vec![0.5, -0.5, 0.3, -0.3]; // 2 stereo frames
        let result = mock.upmix_stereo_to_8_1(&stereo).unwrap();
        assert_eq!(result.len(), 16); // 2 frames * 8 channels
    }

    #[test]
    fn test_mock_get_configuration() {
        let mut mock = MockMultiChannelOutput::new();
        
        let config = ChannelConfiguration {
            mode: ChannelMode::Surround8_1,
            sample_rate: 44100,
            buffer_size: 1024,
            is_8_1_available: true,
        };
        
        mock.expect_get_configuration()
            .return_const(config.clone());

        let result = mock.get_configuration();
        assert_eq!(result.mode, ChannelMode::Surround8_1);
        assert_eq!(result.channel_count(), 8);
    }
}

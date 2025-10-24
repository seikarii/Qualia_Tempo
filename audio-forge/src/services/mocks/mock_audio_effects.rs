//! # Responsibility
//! High-fidelity mock for IAudioEffects trait.
//!
//! ---
//!
//! Uses mockall to generate compile-time verified mocks with type-safe expectations.
//! Enables unit testing of services that depend on IAudioEffects without requiring
//! real biquad filter calculations or audio processing.

use crate::contracts::effect_parameters::EffectConfig;
use crate::errors::AudioEffectsError;
use crate::services::interfaces::i_audio_effects::IAudioEffects;
use mockall::mock;

mock! {
    /// # Responsibility
    /// Mock implementation of IAudioEffects for unit testing.
    ///
    /// ---
    ///
    /// **HIGH-FIDELITY MOCKING**: All methods use mockall's type-safe expectations.
    /// Tests MUST call `.expect_*()` to define behavior, otherwise mocks will panic
    /// (fail-fast on undefined expectations).
    ///
    /// ## Example Usage
    /// ```rust
    /// let mut mock = MockAudioEffects::new();
    /// mock.expect_apply_drop_effect()
    ///     .times(1)
    ///     .returning(|_, _| Ok(()));
    ///
    /// // Use mock in service
    /// let service = SomeService::new(Arc::new(mock));
    /// service.process_audio().unwrap();
    /// ```
    pub AudioEffects {}

    impl IAudioEffects for AudioEffects {
        fn apply_drop_effect(&self, samples: &mut [f32], sample_rate: u32) -> Result<(), AudioEffectsError>;
        fn apply_bass_boost(&self, samples: &mut [f32], sample_rate: u32) -> Result<(), AudioEffectsError>;
        fn apply_treble_boost(&self, samples: &mut [f32], sample_rate: u32) -> Result<(), AudioEffectsError>;
        fn get_config(&self) -> EffectConfig;
        fn set_config(&self, config: EffectConfig);
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync
// No manual impl needed

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_audio_effects_apply_drop_effect() {
        let mut mock = MockAudioEffects::new();
        
        // Set expectation: apply_drop_effect called once with any parameters
        mock.expect_apply_drop_effect()
            .times(1)
            .returning(|_, _| Ok(()));

        let mut samples = vec![0.5, -0.5];
        assert!(mock.apply_drop_effect(&mut samples, 44100).is_ok());
    }

    #[test]
    fn test_mock_audio_effects_get_config() {
        let mut mock = MockAudioEffects::new();
        let expected_config = EffectConfig::default();
        
        mock.expect_get_config()
            .times(1)
            .return_const(expected_config.clone());

        let config = mock.get_config();
        assert_eq!(config.drop_effect_enabled, expected_config.drop_effect_enabled);
    }

    #[test]
    #[should_panic(expected = "MockAudioEffects::apply_bass_boost")]
    fn test_mock_panics_without_expectation() {
        let mock = MockAudioEffects::new();
        let mut samples = vec![0.5];
        
        // This should panic because no expectation was set
        let _ = mock.apply_bass_boost(&mut samples, 44100);
    }
}

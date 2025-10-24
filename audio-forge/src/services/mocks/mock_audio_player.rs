//! # Responsibility
//! High-fidelity mock for IAudioPlayer trait.
//!
//! ---
//!
//! Enables testing of playback-dependent services without audio hardware.

use crate::errors::AudioPlayerError;
use crate::services::interfaces::i_audio_player::IAudioPlayer;
use mockall::mock;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

mock! {
    /// # Responsibility
    /// Mock implementation of IAudioPlayer for unit testing.
    ///
    /// ---
    ///
    /// **STATE SIMULATION**: Mock can track playback state:
    /// ```rust
    /// use std::sync::{Arc, Mutex};
    ///
    /// let state = Arc::new(Mutex::new(false)); // is_playing
    /// let state_clone = state.clone();
    ///
    /// mock.expect_play()
    ///     .returning(move || {
    ///         *state_clone.lock().unwrap() = true;
    ///         Ok(())
    ///     });
    ///
    /// mock.expect_is_playing()
    ///     .returning(move || *state.lock().unwrap());
    /// ```
    pub AudioPlayer {}

    impl IAudioPlayer for AudioPlayer {
        fn load_file(&self, path: &Path) -> Result<Duration, AudioPlayerError>;
        fn play(&self) -> Result<(), AudioPlayerError>;
        fn pause(&self) -> Result<(), AudioPlayerError>;
        fn stop(&self) -> Result<(), AudioPlayerError>;
        fn seek(&self, position: Duration) -> Result<(), AudioPlayerError>;
        fn set_volume(&self, volume: f32) -> Result<(), AudioPlayerError>;
        fn set_playback_speed(&self, speed: f32) -> Result<(), AudioPlayerError>;
        fn current_position(&self) -> Duration;
        fn total_duration(&self) -> Duration;
        fn is_playing(&self) -> bool;
        fn get_audio_samples(&self) -> Arc<[f32]>;
        fn get_sample_rate(&self) -> u32;
        fn capture_processed_audio(&self) -> Result<Vec<f32>, AudioPlayerError>;
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_mock_load_file_returns_duration() {
        let mut mock = MockAudioPlayer::new();
        
        mock.expect_load_file()
            .times(1)
            .returning(|_| Ok(Duration::from_secs(180))); // 3 minutes

        let path = PathBuf::from("test.mp3");
        let duration = mock.load_file(&path).unwrap();
        assert_eq!(duration, Duration::from_secs(180));
    }

    #[test]
    fn test_mock_playback_state() {
        let mut mock = MockAudioPlayer::new();
        
        // Initially not playing
        mock.expect_is_playing()
            .times(1)
            .return_const(false);

        assert!(!mock.is_playing());
    }

    #[test]
    fn test_mock_get_audio_samples() {
        let mut mock = MockAudioPlayer::new();
        
        let test_samples: Arc<[f32]> = Arc::new([0.5, -0.5, 0.3, -0.3]);
        let samples_clone = test_samples.clone();
        
        mock.expect_get_audio_samples()
            .return_const(samples_clone);

        let result = mock.get_audio_samples();
        assert_eq!(result.len(), 4);
        assert_eq!(result[0], 0.5);
    }

    #[test]
    fn test_mock_set_volume_validates_range() {
        let mut mock = MockAudioPlayer::new();
        
        mock.expect_set_volume()
            .withf(|vol: &f32| *vol >= 0.0 && *vol <= 1.0)
            .returning(|_| Ok(()));

        assert!(mock.set_volume(0.5).is_ok());
    }
}

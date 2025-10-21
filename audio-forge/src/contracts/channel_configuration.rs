//! # Responsibility
//! Defines channel configuration for multi-channel audio output.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents audio output channel mode (Stereo vs 8.1 Surround).
///
/// ---
///
/// Used to configure output device and upmixing strategy.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChannelMode {
    /// Standard 2-channel stereo (L/R)
    Stereo,

    /// 8.1 surround (FL, FR, FC, LFE, BL, BR, SL, SR)
    Surround8_1,
}

impl Default for ChannelMode {
    fn default() -> Self {
        Self::Stereo
    }
}

/// # Responsibility
/// Configuration for multi-channel audio output.
///
/// ---
///
/// Includes channel mode, sample rate, and buffer size.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelConfiguration {
    /// Current channel mode
    pub mode: ChannelMode,

    /// Sample rate in Hz (typically 44100 or 48000)
    pub sample_rate: u32,

    /// Buffer size in frames
    pub buffer_size: usize,

    /// Whether 8.1 hardware is available
    pub is_8_1_available: bool,
}

impl Default for ChannelConfiguration {
    fn default() -> Self {
        Self {
            mode: ChannelMode::Stereo,
            sample_rate: 44100,
            buffer_size: 1024,
            is_8_1_available: false,
        }
    }
}

impl ChannelConfiguration {
    /// # Responsibility
    /// Get number of channels for current mode.
    pub fn channel_count(&self) -> usize {
        match self.mode {
            ChannelMode::Stereo => 2,
            ChannelMode::Surround8_1 => 8,
        }
    }

    /// # Responsibility
    /// Check if currently using 8.1 mode.
    pub fn is_surround_active(&self) -> bool {
        self.mode == ChannelMode::Surround8_1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_channel_mode_default() {
        assert_eq!(ChannelMode::default(), ChannelMode::Stereo);
    }

    #[test]
    fn test_channel_configuration_default() {
        let config = ChannelConfiguration::default();
        assert_eq!(config.mode, ChannelMode::Stereo);
        assert_eq!(config.sample_rate, 44100);
        assert_eq!(config.buffer_size, 1024);
        assert!(!config.is_8_1_available);
    }

    #[test]
    fn test_channel_count_stereo() {
        let config = ChannelConfiguration {
            mode: ChannelMode::Stereo,
            ..Default::default()
        };
        assert_eq!(config.channel_count(), 2);
    }

    #[test]
    fn test_channel_count_surround() {
        let config = ChannelConfiguration {
            mode: ChannelMode::Surround8_1,
            ..Default::default()
        };
        assert_eq!(config.channel_count(), 8);
    }

    #[test]
    fn test_is_surround_active() {
        let stereo = ChannelConfiguration::default();
        assert!(!stereo.is_surround_active());

        let surround = ChannelConfiguration {
            mode: ChannelMode::Surround8_1,
            ..Default::default()
        };
        assert!(surround.is_surround_active());
    }
}

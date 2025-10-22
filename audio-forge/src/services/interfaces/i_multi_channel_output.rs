//! # Responsibility
//! Trait definition for multi-channel audio output (8.1 surround).

use crate::contracts::channel_configuration::ChannelConfiguration;
use crate::errors::MultiChannelError;
use shaku::Interface;

/// # Responsibility
/// Routes audio to 8.1 surround output (7.1 + subwoofer).
///
/// ---
///
/// Provides device detection, stereo-to-8.1 upmixing, and fallback logic.
/// Channel layout: FL, FR, FC, LFE, BL, BR, SL, SR (8 channels).
pub trait IMultiChannelOutput: Interface {
    /// # Responsibility
    /// Configure device for 8-channel output.
    ///
    /// ---
    ///
    /// Attempts to enable 8.1 mode. Returns error if unsupported.
    fn configure_8_1_channels(&self) -> Result<(), MultiChannelError>;

    /// # Responsibility
    /// Upmix stereo samples to 8.1 channels.
    ///
    /// ---
    ///
    /// Algorithm:
    /// - FL/FR: Copy L/R directly
    /// - FC: (L + R) / 2 (center mono sum)
    /// - LFE: Low-pass filtered (L + R) for bass
    /// - BL/BR: Delayed + attenuated L/R for rear
    /// - SL/SR: Mid-delayed L/R for side
    ///
    /// Input: Stereo interleaved [L, R, L, R, ...]
    /// Output: 8-channel interleaved [FL, FR, FC, LFE, BL, BR, SL, SR, ...]
    fn upmix_stereo_to_8_1(&self, stereo_samples: &[f32]) -> Result<Vec<f32>, MultiChannelError>;

    /// # Responsibility
    /// Check if 8.1 hardware is available.
    ///
    /// ---
    ///
    /// Queries audio output devices for 8-channel support.
    fn is_8_1_supported(&self) -> bool;

    /// # Responsibility
    /// Fallback to stereo mode.
    ///
    /// ---
    ///
    /// Switches to 2-channel output if 8.1 unavailable.
    fn fallback_to_stereo(&self) -> Result<(), MultiChannelError>;

    /// # Responsibility
    /// Get current channel configuration.
    fn get_configuration(&self) -> ChannelConfiguration;
    
    /// # Responsibility
    /// Force re-detection of 8.1 hardware support.
    ///
    /// ---
    ///
    /// ## USE CASE
    /// User hotplugs new audio device (e.g., USB DAC, HDMI output) after app launch.
    /// This method re-scans cpal devices and updates internal state.
    ///
    /// ## Returns
    /// - `true` if 8.1 capable device detected (state updated)
    /// - `false` if no 8.1 devices found (state remains unchanged)
    fn redetect_8_1_hardware(&self) -> bool;
}

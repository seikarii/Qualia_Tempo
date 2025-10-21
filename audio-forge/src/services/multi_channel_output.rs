//! # Responsibility
//! Implements multi-channel audio output with 8.1 surround upmixing.

use crate::contracts::channel_configuration::{ChannelConfiguration, ChannelMode};
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use anyhow::{Result, anyhow};
use shaku::Component;
use std::sync::RwLock;
use tracing::{info, warn};

/// # Responsibility
/// Multi-channel audio output service with 8.1 upmixing.
///
/// ---
///
/// Detects 8.1 hardware support and performs stereo-to-8.1 upmixing.
/// Uses RwLock for thread-safe configuration updates.
#[derive(Component)]
#[shaku(interface = IMultiChannelOutput)]
pub struct MultiChannelOutputService {
    #[shaku(default)]
    config: RwLock<ChannelConfiguration>,
}

impl Default for MultiChannelOutputService {
    fn default() -> Self {
        Self::new(Self::detect_8_1_support())
    }
}

impl MultiChannelOutputService {
    /// # Responsibility
    /// Create service with explicit hardware detection result.
    ///
    /// ---
    ///
    /// Allows dependency injection of hardware detection for testing.
    /// Production code uses Default trait, tests inject false.
    pub fn new(is_8_1_available: bool) -> Self {
        let config = ChannelConfiguration {
            mode: if is_8_1_available {
                ChannelMode::Surround8_1
            } else {
                ChannelMode::Stereo
            },
            is_8_1_available,
            ..Default::default()
        };

        if is_8_1_available {
            info!("8.1 surround hardware detected - enabled by default");
        } else {
            warn!("8.1 surround not available - using stereo fallback");
        }

        Self {
            config: RwLock::new(config),
        }
    }

    /// # Responsibility
    /// Detect if 8.1 hardware is available.
    ///
    /// ---
    ///
    /// Enumerates all output devices using cpal and checks if any
    /// support 8 or more channels. Returns true if 8.1-capable
    /// hardware is found.
    fn detect_8_1_support() -> bool {
        use cpal::traits::{DeviceTrait, HostTrait};
        
        let host = cpal::default_host();
        
        // Enumerate output devices
        let devices = match host.output_devices() {
            Ok(devices) => devices,
            Err(e) => {
                warn!("Failed to enumerate output devices: {}", e);
                return false;
            }
        };
        
        for device in devices {
            // Get device name for logging
            let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
            
            // Check default output config
            if let Ok(config) = device.default_output_config() {
                let channels = config.channels();
                info!("Device '{}': {} channels", device_name, channels);
                
                if channels >= 8 {
                    info!("✅ 8.1 surround capable device found: '{}' ({} channels)", device_name, channels);
                    return true;
                }
            }
            
            // Also check supported output configs for 8+ channel support
            if let Ok(configs) = device.supported_output_configs() {
                for config_range in configs {
                    if config_range.channels() >= 8 {
                        info!("✅ 8.1 surround capable device found (in supported configs): '{}' ({} channels)", device_name, config_range.channels());
                        return true;
                    }
                }
            }
        }
        
        info!("❌ No 8.1 surround capable devices detected - fallback to stereo");
        false
    }

    /// # Responsibility
    /// Apply simple low-pass filter for LFE channel.
    ///
    /// ---
    ///
    /// Simple moving average filter (3-tap).
    /// Proper implementation would use biquad filter.
    fn low_pass_filter(samples: &[f32]) -> Vec<f32> {
        if samples.len() < 3 {
            return samples.to_vec();
        }

        let mut filtered = Vec::with_capacity(samples.len());
        filtered.push(samples[0]); // First sample unchanged

        for i in 1..samples.len() - 1 {
            let avg = (samples[i - 1] + samples[i] + samples[i + 1]) / 3.0;
            filtered.push(avg);
        }

        filtered.push(samples[samples.len() - 1]); // Last sample unchanged
        filtered
    }
}

impl IMultiChannelOutput for MultiChannelOutputService {
    fn configure_8_1_channels(&self) -> Result<()> {
        let mut config = self.config.write().unwrap();

        if !config.is_8_1_available {
            return Err(anyhow!(
                "8.1 surround hardware not available - cannot configure"
            ));
        }

        config.mode = ChannelMode::Surround8_1;
        info!("Configured for 8.1 surround output");
        Ok(())
    }

    fn upmix_stereo_to_8_1(&self, stereo_samples: &[f32]) -> Result<Vec<f32>> {
        if !stereo_samples.len().is_multiple_of(2) {
            return Err(anyhow!(
                "Invalid stereo input: sample count must be even (got {})",
                stereo_samples.len()
            ));
        }

        let config = self.config.read().unwrap();
        let sample_rate = config.sample_rate;
        let frame_count = stereo_samples.len() / 2;
        let mut output = Vec::with_capacity(frame_count * 8);

        // Calculate sample-rate-aware delays (in milliseconds converted to frames)
        const REAR_DELAY_MS: f32 = 0.227; // Industry standard for rear channels
        const SIDE_DELAY_MS: f32 = 0.113; // Industry standard for side channels
        
        let rear_delay_frames = ((REAR_DELAY_MS / 1000.0) * sample_rate as f32) as usize;
        let side_delay_frames = ((SIDE_DELAY_MS / 1000.0) * sample_rate as f32) as usize;

        // Extract mono sum for FC and LFE
        let mono_sum: Vec<f32> = (0..frame_count)
            .map(|i| {
                let left = stereo_samples[i * 2];
                let right = stereo_samples[i * 2 + 1];
                (left + right) / 2.0
            })
            .collect();

        // Low-pass filter for LFE
        let lfe = Self::low_pass_filter(&mono_sum);

        // Upmix each stereo frame to 8 channels
        for i in 0..frame_count {
            let left = stereo_samples[i * 2];
            let right = stereo_samples[i * 2 + 1];

            // FL (Front Left): Direct copy of left channel
            output.push(left);

            // FR (Front Right): Direct copy of right channel
            output.push(right);

            // FC (Front Center): Mono sum
            output.push(mono_sum[i]);

            // LFE (Low Frequency Effects): Low-pass filtered mono sum
            output.push(lfe[i] * 0.5); // Attenuate LFE

            // BL (Back Left): Delayed + attenuated left (rear surround)
            let bl_index = i.saturating_sub(rear_delay_frames);
            output.push(stereo_samples[bl_index * 2] * 0.7);

            // BR (Back Right): Delayed + attenuated right (rear surround)
            output.push(stereo_samples[bl_index * 2 + 1] * 0.7);

            // SL (Side Left): Mid-delayed left (side surround)
            let sl_index = i.saturating_sub(side_delay_frames);
            output.push(stereo_samples[sl_index * 2] * 0.8);

            // SR (Side Right): Mid-delayed right (side surround)
            output.push(stereo_samples[sl_index * 2 + 1] * 0.8);
        }

        Ok(output)
    }

    fn is_8_1_supported(&self) -> bool {
        self.config.read().unwrap().is_8_1_available
    }

    fn fallback_to_stereo(&self) -> Result<()> {
        let mut config = self.config.write().unwrap();
        config.mode = ChannelMode::Stereo;
        info!("Switched to stereo output mode");
        Ok(())
    }

    fn get_configuration(&self) -> ChannelConfiguration {
        self.config.read().unwrap().clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_creation() {
        // Inject false for hardware detection (test isolation)
        let service = MultiChannelOutputService::new(false);
        let config = service.get_configuration();

        // Should default to stereo (8.1 not available in test environment)
        assert_eq!(config.mode, ChannelMode::Stereo);
        assert!(!config.is_8_1_available);
    }

    #[test]
    fn test_is_8_1_supported_returns_false() {
        let service = MultiChannelOutputService::new(false);
        assert!(!service.is_8_1_supported());
    }

    #[test]
    fn test_configure_8_1_fails_when_unavailable() {
        let service = MultiChannelOutputService::new(false);
        let result = service.configure_8_1_channels();

        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("8.1 surround hardware not available")
        );
    }

    #[test]
    fn test_fallback_to_stereo_succeeds() {
        let service = MultiChannelOutputService::new(false);
        let result = service.fallback_to_stereo();

        assert!(result.is_ok());
        assert_eq!(service.get_configuration().mode, ChannelMode::Stereo);
    }

    #[test]
    fn test_upmix_empty_input() {
        let service = MultiChannelOutputService::new(false);
        let stereo: Vec<f32> = vec![];

        let result = service.upmix_stereo_to_8_1(&stereo);
        assert!(result.is_ok());

        let output = result.unwrap();
        assert_eq!(output.len(), 0);
    }

    #[test]
    fn test_upmix_odd_sample_count_fails() {
        let service = MultiChannelOutputService::new(false);
        let stereo = vec![1.0, 0.5, 0.3]; // Odd count (invalid)

        let result = service.upmix_stereo_to_8_1(&stereo);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("sample count must be even")
        );
    }

    #[test]
    fn test_upmix_single_stereo_frame() {
        let service = MultiChannelOutputService::new(false);
        let stereo = vec![1.0, -1.0]; // L=1.0, R=-1.0

        let result = service.upmix_stereo_to_8_1(&stereo);
        assert!(result.is_ok());

        let output = result.unwrap();
        assert_eq!(output.len(), 8); // 1 frame * 8 channels

        // FL: Copy left
        assert_eq!(output[0], 1.0);

        // FR: Copy right
        assert_eq!(output[1], -1.0);

        // FC: Mono sum (L + R) / 2 = 0.0
        assert_eq!(output[2], 0.0);

        // LFE: Low-pass filtered mono sum * 0.5
        assert_eq!(output[3], 0.0); // (0.0 * 0.5)

        // BL/BR/SL/SR: Delayed/attenuated (with delay clamping to 0 for first frame)
        assert_eq!(output[4], 1.0 * 0.7); // BL
        assert_eq!(output[5], -0.7); // BR
        assert_eq!(output[6], 1.0 * 0.8); // SL
        assert_eq!(output[7], -0.8); // SR
    }

    #[test]
    fn test_upmix_multiple_frames() {
        let service = MultiChannelOutputService::new(false);
        // 2 stereo frames: [L1, R1, L2, R2]
        let stereo = vec![0.5, 0.5, -0.5, -0.5];

        let result = service.upmix_stereo_to_8_1(&stereo);
        assert!(result.is_ok());

        let output = result.unwrap();
        assert_eq!(output.len(), 16); // 2 frames * 8 channels

        // Frame 1: FL=0.5, FR=0.5
        assert_eq!(output[0], 0.5);
        assert_eq!(output[1], 0.5);

        // Frame 2: FL=-0.5, FR=-0.5
        assert_eq!(output[8], -0.5);
        assert_eq!(output[9], -0.5);
    }

    #[test]
    fn test_low_pass_filter_basic() {
        let samples = vec![1.0, 0.0, -1.0];
        let filtered = MultiChannelOutputService::low_pass_filter(&samples);

        assert_eq!(filtered.len(), 3);
        // First sample unchanged
        assert_eq!(filtered[0], 1.0);
        // Middle: (1.0 + 0.0 + -1.0) / 3 = 0.0
        assert_eq!(filtered[1], 0.0);
        // Last sample unchanged
        assert_eq!(filtered[2], -1.0);
    }

    #[test]
    fn test_channel_count_calculation() {
        let service = MultiChannelOutputService::new(false);
        let config = service.get_configuration();

        assert_eq!(config.channel_count(), 2); // Stereo mode
    }
}

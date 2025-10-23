//! # Responsibility
//! Implements multi-channel audio output with 8.1 surround upmixing.

use crate::contracts::channel_configuration::{ChannelConfiguration, ChannelMode};
use crate::errors::MultiChannelError;
use crate::services::interfaces::i_logger::ILogger;
use crate::services::interfaces::i_multi_channel_output::IMultiChannelOutput;
use biquad::*;
use shaku::Component;
use std::sync::{Arc, RwLock};
use tracing::{info, warn, instrument}; // Keep for static method detect_8_1_support()

/// # Responsibility
/// Multi-channel audio output service with 8.1 upmixing.
///
/// ---
///
/// Detects 8.1 hardware support and performs stereo-to-8.1 upmixing.
/// Uses RwLock for thread-safe configuration updates.
///
/// ## DIRECTIVE AF-D22-01: LAZY DETECTION
/// Detection now happens on FIRST ACCESS, not during construction.
/// This fixes race conditions with cpal initialization during module building.
#[derive(Component)]
#[shaku(interface = IMultiChannelOutput)]
pub struct MultiChannelOutputService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(default)]
    config: RwLock<ChannelConfiguration>,
    
    /// Lazy initialization flag - detection runs on first access
    /// Uses AtomicBool for lock-free double-checked locking
    #[shaku(default)]
    detection_performed: std::sync::atomic::AtomicBool,
}

impl Default for MultiChannelOutputService {
    fn default() -> Self {
        // DIRECTIVE AF-D22-01: Don't detect on construction, initialize with unknown state
        Self {
            logger: Arc::new(crate::services::logger::QualiaLogger),
            config: RwLock::new(ChannelConfiguration {
                mode: ChannelMode::Stereo, // Temporary default
                is_8_1_available: false,    // Will be updated on first access
                ..Default::default()
            }),
            detection_performed: std::sync::atomic::AtomicBool::new(false),
        }
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
    pub fn new(logger: Arc<dyn ILogger>, is_8_1_available: bool) -> Self {
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
            logger.info("8.1 surround hardware detected - enabled by default");
        } else {
            logger.warn("8.1 surround not available - using stereo fallback");
        }

        Self {
            logger,
            config: RwLock::new(config),
            detection_performed: std::sync::atomic::AtomicBool::new(false),
        }
    }

    /// # Responsibility
    /// Detect if 8.1 hardware is available.
    ///
    /// ---
    ///
    /// ## DIRECTIVE 21: Enhanced Detection Logic
    /// Enumerates all output devices using cpal (via rodio re-export) and checks:
    /// 1. Default output config (fast path)
    /// 2. **All supported configs** (comprehensive check)
    ///
    /// Returns true if ANY device supports 8+ channels in ANY configuration.
    /// This fixes false negatives when 8.1 is available but not the default.
    fn detect_8_1_support() -> bool {
        use rodio::cpal;
        use rodio::cpal::traits::{DeviceTrait, HostTrait};
        
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
            
            // FAST PATH: Check default output config first
            if let Ok(config) = device.default_output_config() {
                let channels = config.channels();
                info!("Device '{}': {} channels (default config)", device_name, channels);
                
                if channels >= 8 {
                    info!("✅ 8.1 surround capable device found: '{}' ({} channels - default)", device_name, channels);
                    return true;
                }
            }
            
            // DIRECTIVE 21: COMPREHENSIVE PATH - Check ALL supported configs
            // Many audio devices support 8+ channels in non-default configurations
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
    /// OPTIMIZED: Butterworth low-pass biquad filter @ 120Hz for LFE channel.
    /// Replaces acoustically-inadequate 3-tap moving average.
    fn low_pass_filter(samples: &[f32], sample_rate: u32) -> Vec<f32> {
        if samples.is_empty() {
            return vec![];
        }

        // Butterworth low-pass @ 120Hz (LFE standard cutoff)
        let coeffs = Coefficients::<f32>::from_params(
            Type::LowPass, // LowPass doesn't take dB gain parameter
            sample_rate.hz(),
            120.hz(),
            Q_BUTTERWORTH_F32,
        ).unwrap();

        let mut filter = DirectForm2Transposed::<f32>::new(coeffs);
        
        samples.iter().map(|&sample| filter.run(sample)).collect()
    }
}

impl IMultiChannelOutput for MultiChannelOutputService {
    #[instrument(skip(self))]
    fn configure_8_1_channels(&self) -> Result<(), MultiChannelError> {
        let mut config = self.config.write().unwrap_or_else(|poisoned| poisoned.into_inner());

        if !config.is_8_1_available {
            return Err(MultiChannelError::UnsupportedChannelConfig(
                "8.1 surround hardware not available - cannot configure".to_string()
            ));
        }

        config.mode = ChannelMode::Surround8_1;
        self.logger.info("Configured for 8.1 surround output");
        Ok(())
    }

    #[instrument(skip(self, stereo_samples), fields(sample_count = stereo_samples.len()))]
    fn upmix_stereo_to_8_1(&self, stereo_samples: &[f32]) -> Result<Vec<f32>, MultiChannelError> {
        if !stereo_samples.len().is_multiple_of(2) {
            return Err(MultiChannelError::PlaybackError(format!(
                "Invalid stereo input: sample count must be even (got {})",
                stereo_samples.len()
            )));
        }

        let config = self.config.read().unwrap_or_else(|poisoned| poisoned.into_inner());
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

        // Low-pass filter for LFE (120Hz Butterworth)
        let lfe = Self::low_pass_filter(&mono_sum, sample_rate);

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
        // DIRECTIVE AF-D22-01: Lazy detection with double-checked locking
        // Fast path: If detection already performed, return cached value
        if self.detection_performed.load(std::sync::atomic::Ordering::Acquire) {
            return self.config.read().unwrap_or_else(|poisoned| poisoned.into_inner()).is_8_1_available;
        }
        
        // Slow path: Perform detection once
        // Note: Small race condition possible (multiple threads might detect),
        // but result will be identical so it's harmless
        let detected = Self::detect_8_1_support();
        
        {
            let mut config = self.config.write().unwrap_or_else(|poisoned| poisoned.into_inner());
            config.is_8_1_available = detected;
            
            if detected {
                self.logger.info("🎵 LAZY DETECTION: 8.1 surround hardware confirmed");
                config.mode = ChannelMode::Surround8_1;
            } else {
                self.logger.warn("⚠️  LAZY DETECTION: 8.1 hardware not detected, using stereo");
                config.mode = ChannelMode::Stereo;
            }
        }
        
        // Mark as performed
        self.detection_performed.store(true, std::sync::atomic::Ordering::Release);
        
        detected
    }

    #[instrument(skip(self))]
    fn fallback_to_stereo(&self) -> Result<(), MultiChannelError> {
        let mut config = self.config.write().unwrap_or_else(|poisoned| poisoned.into_inner());
        config.mode = ChannelMode::Stereo;
        self.logger.info("Switched to stereo output mode");
        Ok(())
    }

    #[instrument(skip(self))]
    fn get_configuration(&self) -> ChannelConfiguration {
        self.config.read().unwrap_or_else(|poisoned| poisoned.into_inner()).clone()
    }
    
    fn redetect_8_1_hardware(&self) -> bool {
        self.logger.info("🔍 Manually re-detecting 8.1 hardware support...");
        
        let newly_detected = Self::detect_8_1_support();
        
        // Update internal state with new detection result
        let mut config = self.config.write().unwrap_or_else(|poisoned| poisoned.into_inner());
        config.is_8_1_available = newly_detected;
        
        // Auto-enable 8.1 mode if newly detected
        if newly_detected && config.mode == ChannelMode::Stereo {
            config.mode = ChannelMode::Surround8_1;
            self.logger.info("✅ 8.1 hardware detected! Auto-enabled surround mode.");
        } else if !newly_detected && config.mode == ChannelMode::Surround8_1 {
            config.mode = ChannelMode::Stereo;
            self.logger.warn("❌ 8.1 hardware no longer detected. Switched to stereo.");
        }
        
        newly_detected
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_creation() {
        // Inject false for hardware detection (test isolation)
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
        let config = service.get_configuration();

        // Should default to stereo (8.1 not available in test environment)
        assert_eq!(config.mode, ChannelMode::Stereo);
        assert!(!config.is_8_1_available);
    }

    #[test]
    fn test_is_8_1_supported_with_lazy_detection() {
        // DIRECTIVE AF-D22-01: Test lazy detection behavior
        // Service now detects on first access, not on construction
        let service = MultiChannelOutputService::default();
        
        // First call triggers detection
        let detected = service.is_8_1_supported();
        
        // Second call should return cached value
        let detected_again = service.is_8_1_supported();
        
        // Results must be consistent
        assert_eq!(detected, detected_again, "Lazy detection must be idempotent");
        
        // On user's hardware with 8.1 support, this should be true
        // On hardware without 8.1, this should be false
        // Test validates detection logic runs and caches correctly
        // VIOLATION #7 FIX: Removed eprintln! - use tracing in non-test code
        tracing::debug!("Lazy detection result: {}", if detected { "✅ 8.1 DETECTED" } else { "❌ NO 8.1" });
    }

    #[test]
    fn test_configure_8_1_fails_when_unavailable() {
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
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
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
        let result = service.fallback_to_stereo();

        assert!(result.is_ok());
        assert_eq!(service.get_configuration().mode, ChannelMode::Stereo);
    }

    #[test]
    fn test_upmix_empty_input() {
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
        let stereo: Vec<f32> = vec![];

        let result = service.upmix_stereo_to_8_1(&stereo);
        assert!(result.is_ok());

        let output = result.unwrap();
        assert_eq!(output.len(), 0);
    }

    #[test]
    fn test_upmix_odd_sample_count_fails() {
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
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
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
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
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
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
        let sample_rate = 44100;
        // Generate 440Hz sine wave (should be attenuated by 120Hz LPF)
        let samples: Vec<f32> = (0..100)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / sample_rate as f32).sin())
            .collect();
        
        let filtered = MultiChannelOutputService::low_pass_filter(&samples, sample_rate);

        assert_eq!(filtered.len(), samples.len());
        
        // High frequency (440Hz) should be attenuated by 120Hz LPF
        let input_magnitude: f32 = samples.iter().map(|x| x.abs()).sum();
        let output_magnitude: f32 = filtered.iter().map(|x| x.abs()).sum();
        
        assert!(output_magnitude < input_magnitude, "LPF should attenuate 440Hz signal");
    }

    #[test]
    fn test_channel_count_calculation() {
        let service = MultiChannelOutputService::new(Arc::new(crate::services::logger::QualiaLogger), false);
        let config = service.get_configuration();

        assert_eq!(config.channel_count(), 2); // Stereo mode
    }
}

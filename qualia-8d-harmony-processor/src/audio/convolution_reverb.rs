//! # Responsibility
//! FFT-based convolution reverb for spatial depth enhancement.
//!
//! Implements overlap-add convolution with synthetic impulse response generation
//! for realistic room acoustics simulation.

use anyhow::{Result, bail};
use realfft::{num_complex, RealFftPlanner};


/// # Responsibility
/// Holds configuration parameters for convolution reverb processing.
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct ConvolutionReverbConfig {
    /// Impulse response length in samples (power of 2 recommended)
    pub ir_length_samples: usize,
    
    /// Reverb decay time in seconds (controls exponential decay)
    pub decay_time_sec: f32,
    
    /// Wet/dry mix range for intensity modulation: (min_wet, max_wet)
    /// Example: (0.0, 0.5) = 0% wet at low intensity, 50% wet at high intensity
    pub wet_mix_range: (f32, f32),
    
    /// FFT block size (must be power of 2)
    pub block_size: usize,
    
    pub sample_rate: u32,
}

impl ConvolutionReverbConfig {
    pub fn new(sample_rate: u32) -> Result<Self> {
        if sample_rate == 0 {
            bail!("Sample rate must be non-zero");
        }
        
        Ok(Self {
            ir_length_samples: 24000, // 0.5 seconds at 48kHz
            decay_time_sec: 1.5,
            wet_mix_range: (0.0, 0.4), // 0-40% wet mix
            block_size: 4096,
            sample_rate,
        })
    }
    
    pub fn validate(&self) -> Result<()> {
        if !self.block_size.is_power_of_two() {
            bail!("block_size must be power of 2, got {}", self.block_size);
        }
        
        if self.ir_length_samples == 0 {
            bail!("ir_length_samples must be positive");
        }
        
        if self.decay_time_sec <= 0.0 {
            bail!("decay_time_sec must be positive, got {}", self.decay_time_sec);
        }
        
        let (min_wet, max_wet) = self.wet_mix_range;
        if min_wet < 0.0 || max_wet > 1.0 || max_wet < min_wet {
            bail!(
                "Invalid wet_mix_range: ({}, {}). Must satisfy: 0 <= min <= max <= 1",
                min_wet, max_wet
            );
        }
        
        Ok(())
    }
}

/// # Responsibility
/// FFT-based convolution reverb with synthetic impulse response.
pub struct ConvolutionReverb {
    config: ConvolutionReverbConfig,
    
    /// Pre-computed FFT of impulse response (complex spectrum)
    ir_fft: Vec<num_complex::Complex<f32>>,
    
    /// FFT size (cached for reuse)
    fft_size: usize,
    
    /// Overlap buffer for overlap-add algorithm
    overlap_buffer: Vec<f32>,
}

impl ConvolutionReverb {
    pub fn new(config: ConvolutionReverbConfig) -> Result<Self> {
        config.validate()?;
        
        // Generate synthetic impulse response
        let ir = Self::generate_synthetic_ir(&config);
        
        // Pre-compute FFT of IR
        let mut fft_planner = RealFftPlanner::<f32>::new();
        let fft_size = (config.block_size + config.ir_length_samples).next_power_of_two();
        
        let fft = fft_planner.plan_fft_forward(fft_size);
        
        // Zero-pad IR to FFT size
        let mut ir_padded = ir.clone();
        ir_padded.resize(fft_size, 0.0);
        
        // Compute FFT of IR
        let mut ir_spectrum = fft.make_output_vec();
        fft.process(&mut ir_padded, &mut ir_spectrum)?;
        
        Ok(Self {
            config,
            ir_fft: ir_spectrum,
            fft_size,
            overlap_buffer: vec![0.0; config.ir_length_samples - 1],
        })
    }
    
    /// # Responsibility
    /// Generate synthetic impulse response with exponential decay and early reflections.
    ///
    /// Simulates room acoustics with:
    /// - Initial impulse (direct sound)
    /// - Early reflections (first 50ms)
    /// - Late reverb tail (exponential decay)
    fn generate_synthetic_ir(config: &ConvolutionReverbConfig) -> Vec<f32> {
        let mut ir = vec![0.0; config.ir_length_samples];
        
        // Direct sound impulse
        ir[0] = 1.0;
        
        // Early reflections (4 reflections in first 50ms)
        let early_reflection_times = [0.012, 0.023, 0.035, 0.048]; // seconds
        let early_reflection_gains = [0.6, 0.4, 0.3, 0.2];
        
        for (time_sec, gain) in early_reflection_times.iter().zip(early_reflection_gains.iter()) {
            let sample_idx = (*time_sec * config.sample_rate as f32) as usize;
            if sample_idx < ir.len() {
                ir[sample_idx] = *gain;
            }
        }
        
        // Exponential decay tail (starts after early reflections)
        let decay_start_samples = (0.05 * config.sample_rate as f32) as usize;
        let decay_rate = (-3.0 / config.decay_time_sec) / config.sample_rate as f32; // -60dB decay
        
        for i in decay_start_samples..ir.len() {
            let time_elapsed = (i - decay_start_samples) as f32;
            let decay_factor = (decay_rate * time_elapsed).exp();
            
            // Add random diffusion for realistic reverb texture
            let random_phase = ((i * 1103515245 + 12345) % 2147483648) as f32 / 2147483648.0;
            let diffusion = (random_phase - 0.5) * 0.1;
            
            ir[i] = decay_factor * (0.2 + diffusion);
        }
        
        ir
    }
    
    /// # Responsibility
    /// Process audio with intensity-driven wet/dry mix.
    ///
    /// Uses overlap-add FFT convolution for efficiency with long impulse responses.
    ///
    /// # Arguments
    /// * `input` - Input audio samples
    /// * `intensity` - Reverb strength [0.0, 1.0] (modulates wet/dry mix)
    ///
    /// # Returns
    /// Reverberated audio
    pub fn process(&mut self, input: &[f32], intensity: f32) -> Result<Vec<f32>> {
        if input.is_empty() {
            return Ok(Vec::new());
        }
        
        let intensity_clamped = intensity.clamp(0.0, 1.0);
        let (min_wet, max_wet) = self.config.wet_mix_range;
        let wet_mix = min_wet + (max_wet - min_wet) * intensity_clamped;
        
        if wet_mix < 0.01 {
            // Skip processing if wet mix negligible
            return Ok(input.to_vec());
        }
        
        // Process audio in blocks using overlap-add
        let mut output = Vec::with_capacity(input.len());
        let block_size = self.config.block_size;
        let fft_size = self.fft_size;
        
        // Create fresh FFT planners for this process() call
        let mut fft_planner = RealFftPlanner::<f32>::new();
        let fft = fft_planner.plan_fft_forward(fft_size);
        let ifft = fft_planner.plan_fft_inverse(fft_size);
        
        for block_start in (0..input.len()).step_by(block_size) {
            let block_end = (block_start + block_size).min(input.len());
            let block = &input[block_start..block_end];
            
            // Zero-pad block to FFT size
            let mut block_padded = block.to_vec();
            block_padded.resize(fft_size, 0.0);
            
            // Forward FFT
            let mut block_spectrum = fft.make_output_vec();
            fft.process(&mut block_padded, &mut block_spectrum)?;
            
            // Multiply with IR spectrum (complex multiplication)
            for (block_bin, ir_bin) in block_spectrum.iter_mut().zip(self.ir_fft.iter()) {
                *block_bin *= ir_bin;
            }
            
            // Inverse FFT
            let mut convolved = vec![0.0f32; fft_size];
            ifft.process(&mut block_spectrum, &mut convolved)?;
            
            // Normalize by FFT size
            let scale = 1.0 / fft_size as f32;
            for sample in convolved.iter_mut() {
                *sample *= scale;
            }
            
            // Add overlap from previous block
            let overlap_len = self.overlap_buffer.len().min(convolved.len());
            for i in 0..overlap_len {
                convolved[i] += self.overlap_buffer[i];
            }
            
            // Save new overlap for next block
            let new_overlap_start = block_size;
            if new_overlap_start < convolved.len() {
                let available_overlap = convolved.len() - new_overlap_start;
                let copy_len = available_overlap.min(self.overlap_buffer.len());
                self.overlap_buffer[0..copy_len].copy_from_slice(&convolved[new_overlap_start..(new_overlap_start + copy_len)]);
                // Zero remaining overlap buffer if not fully filled
                if copy_len < self.overlap_buffer.len() {
                    for i in copy_len..self.overlap_buffer.len() {
                        self.overlap_buffer[i] = 0.0;
                    }
                }
            } else {
                // No overlap available, reset buffer
                self.overlap_buffer.fill(0.0);
            }
            
            // Extract valid block output
            let valid_samples = block_size.min(convolved.len());
            output.extend_from_slice(&convolved[0..valid_samples]);
        }
        
        // Trim output to input length
        output.truncate(input.len());
        
        // Apply wet/dry mix
        let mixed: Vec<f32> = input
            .iter()
            .zip(output.iter())
            .map(|(&dry, &wet)| dry * (1.0 - wet_mix) + wet * wet_mix)
            .collect();
        
        Ok(mixed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use std::f32::consts::PI;
    
    #[test]
    fn test_config_creation() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        assert_eq!(config.ir_length_samples, 24000);
        assert_relative_eq!(config.decay_time_sec, 1.5);
        assert_eq!(config.wet_mix_range, (0.0, 0.4));
        assert_eq!(config.block_size, 4096);
    }
    
    #[test]
    fn test_config_validation_block_size_not_power_of_two() {
        let mut config = ConvolutionReverbConfig::new(48000).unwrap();
        config.block_size = 4000; // Not power of 2
        assert!(config.validate().is_err());
    }
    
    #[test]
    fn test_config_validation_invalid_wet_mix_range() {
        let mut config = ConvolutionReverbConfig::new(48000).unwrap();
        config.wet_mix_range = (0.5, 0.3); // max < min
        assert!(config.validate().is_err());
        
        config.wet_mix_range = (-0.1, 0.5);
        assert!(config.validate().is_err());
        
        config.wet_mix_range = (0.0, 1.5);
        assert!(config.validate().is_err());
    }
    
    #[test]
    fn test_reverb_creation() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        let reverb = ConvolutionReverb::new(config);
        assert!(reverb.is_ok());
    }
    
    #[test]
    fn test_process_empty_input() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        let mut reverb = ConvolutionReverb::new(config).unwrap();
        
        let output = reverb.process(&[], 0.5).unwrap();
        assert!(output.is_empty());
    }
    
    #[test]
    fn test_process_zero_intensity_passthrough() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        let mut reverb = ConvolutionReverb::new(config).unwrap();
        
        let input = vec![0.5, -0.3, 0.2, -0.1];
        let output = reverb.process(&input, 0.0).unwrap();
        
        // Should pass through unmodified (0% wet mix)
        for (i, &sample) in output.iter().enumerate() {
            assert_relative_eq!(sample, input[i], epsilon = 0.01);
        }
    }
    
    #[test]
    fn test_process_adds_reverb_tail() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        let mut reverb = ConvolutionReverb::new(config).unwrap();
        
        // Impulse signal
        let mut input = vec![0.0; 8000];
        input[0] = 1.0;
        
        let output = reverb.process(&input, 1.0).unwrap();
        
        // Output should have energy beyond first sample (reverb tail)
        let tail_energy: f32 = output[100..1000].iter().map(|&x| x * x).sum();
        assert!(
            tail_energy > 0.01,
            "Reverb should add tail energy: {}",
            tail_energy
        );
    }
    
    #[test]
    fn test_intensity_modulates_wet_mix() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        let mut reverb_low = ConvolutionReverb::new(config.clone()).unwrap();
        let mut reverb_high = ConvolutionReverb::new(config).unwrap();
        
        // Generate tone
        let input: Vec<f32> = (0..2000)
            .map(|i| (2.0 * PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        
        let output_low = reverb_low.process(&input, 0.2).unwrap();
        let output_high = reverb_high.process(&input, 0.8).unwrap();
        
        // Calculate difference from dry signal
        let diff_low: f32 = output_low.iter().zip(input.iter())
            .map(|(&out, &inp)| (out - inp).abs())
            .sum::<f32>() / output_low.len() as f32;
        
        let diff_high: f32 = output_high.iter().zip(input.iter())
            .map(|(&out, &inp)| (out - inp).abs())
            .sum::<f32>() / output_high.len() as f32;
        
        // High intensity should produce larger deviation from dry
        assert!(
            diff_high > diff_low * 1.5,
            "High intensity should add more reverb: low_diff={}, high_diff={}",
            diff_low,
            diff_high
        );
    }
    
    #[test]
    fn test_synthetic_ir_generation() {
        let config = ConvolutionReverbConfig::new(48000).unwrap();
        let ir = ConvolutionReverb::generate_synthetic_ir(&config);
        
        assert_eq!(ir.len(), config.ir_length_samples);
        
        // Check direct sound impulse
        assert_relative_eq!(ir[0], 1.0, epsilon = 0.001);
        
        // Check early reflections exist
        let early_energy: f32 = ir[100..2400].iter().map(|&x| x.abs()).sum();
        assert!(early_energy > 0.5, "Early reflections should have energy");
        
        // Check exponential decay (later samples should be quieter)
        let early_rms: f32 = ir[2400..4800].iter().map(|&x| x * x).sum::<f32>() / 2400.0;
        let late_rms: f32 = ir[19200..21600].iter().map(|&x| x * x).sum::<f32>() / 2400.0;
        
        assert!(
            late_rms < early_rms * 0.5,
            "Reverb tail should decay: early_rms={}, late_rms={}",
            early_rms.sqrt(),
            late_rms.sqrt()
        );
    }
}

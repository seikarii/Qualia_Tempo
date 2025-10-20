//! # Responsibility
//! Performs FFT-based HRTF convolution for binaural spatialization.
//!
//! Uses real-valued FFT for efficient overlap-add convolution with HRIR filters
//! loaded from SOFA datasets (MIT KEMAR).

use realfft::{RealFftPlanner, RealToComplex, ComplexToReal};
use rustfft::num_complex::Complex;
use std::sync::Arc;
use anyhow::{Result, bail};

use super::sofa_loader::{SofaLoader, SphericalCoord};

/// HRIR filter pair for left/right ears at a specific spatial position
#[derive(Debug, Clone)]
pub struct HrirFilter {
    pub left: Vec<f32>,
    pub right: Vec<f32>,
}

impl HrirFilter {
    pub fn new(left: Vec<f32>, right: Vec<f32>) -> Result<Self> {
        if left.len() != right.len() {
            bail!("HRIR filter channels must have equal length");
        }
        Ok(Self { left, right })
    }

    pub fn len(&self) -> usize {
        self.left.len()
    }

    pub fn is_empty(&self) -> bool {
        self.left.is_empty()
    }
}

/// FFT-based HRTF convolution engine using overlap-add method
pub struct HrtfConvolver {
    fft: Arc<dyn RealToComplex<f32>>,
    ifft: Arc<dyn ComplexToReal<f32>>,  // PERFORMANCE FIX: Pre-computed iFFT plan
    fft_size: usize,
    hop_size: usize,
    sample_rate: u32,
    sofa_loader: Arc<SofaLoader>,
}

impl HrtfConvolver {
    /// Create new convolver with specified FFT size and SOFA dataset
    ///
    /// # Arguments
    /// * `fft_size` - FFT size (must be power of 2, typically 512 or 1024)
    /// * `hop_size` - Hop size for overlap-add (typically fft_size / 2)
    /// * `sample_rate` - Audio sample rate in Hz
    /// * `sofa_loader` - SOFA dataset loader with HRIR database
    pub fn new(fft_size: usize, hop_size: usize, sample_rate: u32, sofa_loader: Arc<SofaLoader>) -> Result<Self> {
        if !fft_size.is_power_of_two() {
            bail!("FFT size must be power of 2, got {}", fft_size);
        }
        
        if hop_size > fft_size {
            bail!("Hop size {} cannot exceed FFT size {}", hop_size, fft_size);
        }

        let mut planner = RealFftPlanner::<f32>::new();
        let fft = planner.plan_fft_forward(fft_size);
        let ifft = planner.plan_fft_inverse(fft_size);  // PERFORMANCE FIX: Pre-compute iFFT once

        Ok(Self {
            fft,
            ifft,
            fft_size,
            hop_size,
            sample_rate,
            sofa_loader,
        })
    }

    /// Convolve mono input with HRIR at specified spatial position
    ///
    /// # Arguments
    /// * `input` - Mono audio input samples
    /// * `position` - Spherical coordinate for HRIR lookup
    ///
    /// # Returns
    /// Binaural (left, right) output samples
    pub fn convolve_at_position(&self, input: &[f32], position: &SphericalCoord) -> Result<(Vec<f32>, Vec<f32>)> {
        if input.is_empty() {
            return Ok((Vec::new(), Vec::new()));
        }

        // Lookup nearest HRIR from SOFA dataset
        let hrir_data = self.sofa_loader.get_nearest(position)?;
        
        // Convert to HrirFilter format
        let hrir = HrirFilter::new(hrir_data.left.clone(), hrir_data.right.clone())?;

        // Perform convolution
        self.convolve(input, &hrir)
    }

    /// Convolve mono input with HRIR filter to produce binaural output
    /// Uses FFT overlap-add method for O(N log N) performance
    ///
    /// # Arguments
    /// * `input` - Mono audio input samples
    /// * `hrir` - HRIR filter for target spatial position
    ///
    /// # Returns
    /// Binaural (left, right) output samples
    pub fn convolve(&self, input: &[f32], hrir: &HrirFilter) -> Result<(Vec<f32>, Vec<f32>)> {
        if input.is_empty() {
            return Ok((Vec::new(), Vec::new()));
        }

        // Use FFT overlap-add convolution for efficiency
        let left = self.convolve_channel_fft(input, &hrir.left)?;
        let right = self.convolve_channel_fft(input, &hrir.right)?;

        Ok((left, right))
    }

    /// FFT-based overlap-add convolution for single channel
    fn convolve_channel_fft(&self, input: &[f32], impulse: &[f32]) -> Result<Vec<f32>> {
        let impulse_len = impulse.len();
        let input_len = input.len();
        let output_len = input_len + impulse_len - 1;
        
        // Use next power of 2 that fits input segment + impulse - 1
        let segment_len = self.fft_size - impulse_len + 1;
        
        // Pre-compute FFT of impulse response
        let impulse_fft = self.fft_impulse(impulse)?;
        
        // Process input in overlapping segments
        let mut output = vec![0.0; output_len];
        let mut pos = 0;
        
        while pos < input_len {
            let segment_end = (pos + segment_len).min(input_len);
            let segment = &input[pos..segment_end];
            
            // Convolve segment with impulse
            let conv_result = self.convolve_segment_fft(segment, &impulse_fft, impulse_len)?;
            
            // Overlap-add into output
            for (i, &sample) in conv_result.iter().enumerate() {
                let output_idx = pos + i;
                if output_idx < output.len() {
                    output[output_idx] += sample;
                }
            }
            
            pos += segment_len;
        }
        
        Ok(output)
    }
    
    /// Compute FFT of impulse response (padded to FFT size)
    fn fft_impulse(&self, impulse: &[f32]) -> Result<Vec<Complex<f32>>> {
        let mut impulse_padded = vec![0.0; self.fft_size];
        impulse_padded[..impulse.len()].copy_from_slice(impulse);
        
        let mut spectrum = self.fft.make_output_vec();
        self.fft.process(&mut impulse_padded, &mut spectrum)?;
        
        Ok(spectrum)
    }
    
    /// Convolve single segment with pre-computed impulse FFT
    fn convolve_segment_fft(&self, segment: &[f32], impulse_fft: &[Complex<f32>], impulse_len: usize) -> Result<Vec<f32>> {
        // Pad segment to FFT size
        let mut segment_padded = vec![0.0; self.fft_size];
        segment_padded[..segment.len()].copy_from_slice(segment);
        
        // Forward FFT of segment
        let mut segment_spectrum = self.fft.make_output_vec();
        self.fft.process(&mut segment_padded, &mut segment_spectrum)?;
        
        // Complex multiplication in frequency domain
        for (seg_bin, imp_bin) in segment_spectrum.iter_mut().zip(impulse_fft.iter()) {
            *seg_bin *= imp_bin;
        }
        
        // Inverse FFT back to time domain (PERFORMANCE FIX: Reuse pre-computed plan)
        let mut output_time = vec![0.0; self.fft_size];
        self.ifft.process(&mut segment_spectrum, &mut output_time)?;
        
        // Normalize by FFT size
        let scale = 1.0 / self.fft_size as f32;
        for sample in output_time.iter_mut() {
            *sample *= scale;
        }
        
        // Return only valid convolution output (segment_len + impulse_len - 1)
        let conv_len = segment.len() + impulse_len - 1;
        Ok(output_time[..conv_len].to_vec())
    }

    /// Time-domain convolution (fallback for testing/comparison)
    #[allow(dead_code)]
    fn convolve_channel_timedomain(&self, input: &[f32], impulse: &[f32]) -> Vec<f32> {
        let output_len = input.len() + impulse.len() - 1;
        let mut output = vec![0.0; output_len];

        for (i, &x) in input.iter().enumerate() {
            for (j, &h) in impulse.iter().enumerate() {
                output[i + j] += x * h;
            }
        }

        output
    }

    pub fn fft_size(&self) -> usize {
        self.fft_size
    }

    pub fn hop_size(&self) -> usize {
        self.hop_size
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_hrir_filter_creation() {
        let left = vec![0.1, 0.2, 0.3];
        let right = vec![0.15, 0.25, 0.35];
        
        let hrir = HrirFilter::new(left.clone(), right.clone()).unwrap();
        assert_eq!(hrir.len(), 3);
        assert_eq!(hrir.left, left);
        assert_eq!(hrir.right, right);
    }

    #[test]
    fn test_hrir_filter_mismatched_lengths() {
        let left = vec![0.1, 0.2];
        let right = vec![0.15, 0.25, 0.35];
        
        let result = HrirFilter::new(left, right);
        assert!(result.is_err());
    }

    #[test]
    fn test_hrtf_convolver_creation() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        assert_eq!(convolver.fft_size(), 512);
        assert_eq!(convolver.hop_size(), 256);
        assert_eq!(convolver.sample_rate(), 48000);
    }

    #[test]
    fn test_hrtf_convolver_invalid_fft_size() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let result = HrtfConvolver::new(500, 250, 48000, sofa_loader);
        assert!(result.is_err());
    }

    #[test]
    fn test_hrtf_convolver_hop_size_exceeds_fft_size() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let result = HrtfConvolver::new(512, 1024, 48000, sofa_loader);
        assert!(result.is_err());
    }

    #[test]
    fn test_convolution_with_impulse() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        
        // Delta impulse HRIR (should output input unchanged)
        let mut left_impulse = vec![0.0; 10];
        left_impulse[0] = 1.0;
        let right_impulse = left_impulse.clone();
        
        let hrir = HrirFilter::new(left_impulse, right_impulse).unwrap();
        
        let input = vec![0.5, 0.3, 0.1];
        let (left, right) = convolver.convolve(&input, &hrir).unwrap();
        
        // With delta impulse, first 3 samples should match input
        assert_relative_eq!(left[0], 0.5, epsilon = 0.001);
        assert_relative_eq!(left[1], 0.3, epsilon = 0.001);
        assert_relative_eq!(left[2], 0.1, epsilon = 0.001);
        assert_relative_eq!(right[0], 0.5, epsilon = 0.001);
    }

    #[test]
    fn test_convolution_empty_input() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        let hrir = HrirFilter::new(vec![1.0], vec![1.0]).unwrap();
        
        let (left, right) = convolver.convolve(&[], &hrir).unwrap();
        assert!(left.is_empty());
        assert!(right.is_empty());
    }

    #[test]
    fn test_convolution_output_length() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        
        let input_len = 100;
        let impulse_len = 20;
        
        let hrir = HrirFilter::new(vec![0.1; impulse_len], vec![0.1; impulse_len]).unwrap();
        let input = vec![1.0; input_len];
        
        let (left, right) = convolver.convolve(&input, &hrir).unwrap();
        
        // Convolution output length = input_len + impulse_len - 1
        let expected_len = input_len + impulse_len - 1;
        assert_eq!(left.len(), expected_len);
        assert_eq!(right.len(), expected_len);
    }

    #[test]
    fn test_convolve_at_position_front() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        
        let input = vec![1.0; 100];
        let front_position = SphericalCoord::new(0.0, 0.0, 1.0);
        
        let (left, right) = convolver.convolve_at_position(&input, &front_position).unwrap();
        
        // Output should not be empty
        assert!(!left.is_empty());
        assert!(!right.is_empty());
        
        // Front position should have similar left/right responses
        let left_energy: f32 = left.iter().map(|x| x * x).sum();
        let right_energy: f32 = right.iter().map(|x| x * x).sum();
        
        // Energy should be relatively balanced (within 20%)
        let ratio = left_energy / right_energy;
        assert!(ratio > 0.8 && ratio < 1.2, "Front position should have balanced L/R energy, got ratio {}", ratio);
    }

    #[test]
    fn test_convolve_at_position_left_side() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        
        let input = vec![1.0; 100];
        let left_position = SphericalCoord::new(90.0, 0.0, 1.0); // Left ear
        
        let (left, right) = convolver.convolve_at_position(&input, &left_position).unwrap();
        
        let left_energy: f32 = left.iter().map(|x| x * x).sum();
        let right_energy: f32 = right.iter().map(|x| x * x).sum();
        
        // Left position should have stronger left channel
        assert!(left_energy > right_energy, "Left position should have left > right energy");
    }

    #[test]
    fn test_convolve_at_position_empty_input() {
        let sofa_loader = Arc::new(SofaLoader::create_mock_dataset());
        let convolver = HrtfConvolver::new(512, 256, 48000, sofa_loader).unwrap();
        
        let position = SphericalCoord::new(0.0, 0.0, 1.0);
        let (left, right) = convolver.convolve_at_position(&[], &position).unwrap();
        
        assert!(left.is_empty());
        assert!(right.is_empty());
    }
}

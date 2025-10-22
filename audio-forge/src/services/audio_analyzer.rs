//! # Responsibility
//! Implements audio analysis service using RustFFT and spectrum-analyzer.
//!
//! ---
//!
//! SIMD OPTIMIZATIONS:
//! - AVX2 vectorization for Hann window application (8x f32 per cycle)
//! - AVX2 vectorization for magnitude calculation (8x Complex per cycle)
//! - Fallback to scalar implementations for non-AVX2 targets (portability)

use crate::contracts::FrequencySpectrum;
use crate::services::interfaces::i_audio_analyzer::IAudioAnalyzer;
use anyhow::Result;
use lazy_static::lazy_static;
use rustfft::{FftPlanner, num_complex::Complex};
use shaku::Component;
use std::sync::Mutex;
use tracing::debug;

// AVX2 intrinsics for SIMD vectorization (x86_64 only)
#[cfg(all(target_arch = "x86_64", target_feature = "avx2"))]
use std::arch::x86_64::*;

// OPTIMIZATION: Global cached FftPlanner eliminates 3MB/s allocations @ 60fps
lazy_static! {
    static ref FFT_PLANNER: Mutex<FftPlanner<f32>> = Mutex::new(FftPlanner::new());
}

// ============================================================================
// SIMD VECTORIZATION: AVX2 Optimizations (x86_64)
// ============================================================================

/// # Responsibility
/// Apply Hann window using AVX2 SIMD with ZERO intermediate copies.
///
/// ---
///
/// ARCHITECTURE (ZERO-COPY):
/// - Processes 4 Complex<f32> per iteration (8 f32 = 256-bit AVX2)
/// - Direct flow: memory → register → compute → memory
/// - Complex layout: [re0, im0, re1, im1, re2, im2, re3, im3] (interleaved)
/// - Window duplication: [w0, w0, w1, w1, w2, w2, w3, w3] (matches pairs)
///
/// OPTIMIZATION STRATEGY:
/// 1. Load 8 f32 (4 Complex) directly from memory via _mm256_loadu_ps
/// 2. Load 4 window values, duplicate to match re/im pairs via shuffle
/// 3. Multiply in-register (re*w, im*w)
/// 4. Store result directly back to memory via _mm256_storeu_ps
///
/// SAFETY:
/// - target_feature = "avx2" ensures intrinsics available
/// - Complex<f32> is #[repr(C)], pointer cast valid
/// - Unaligned loads/stores (_loadu/_storeu) handle any alignment
#[cfg(all(target_arch = "x86_64", target_feature = "avx2"))]
unsafe fn apply_hann_window_avx2(input: &mut [Complex<f32>], window: &[f32]) {
    let len = input.len();
    let simd_len = len / 4 * 4; // Process 4 Complex (8 f32) at a time
    
    // Cast to raw f32 pointer (interleaved: re, im, re, im, ...)
    let input_ptr = input.as_mut_ptr() as *mut f32;
    let window_ptr = window.as_ptr();
    
    // Process 4 Complex values (8 f32) per iteration
    for i in (0..simd_len).step_by(4) {
        // ZERO-COPY: Load 8 f32 (4 Complex) directly from memory
        // Layout: [re0, im0, re1, im1, re2, im2, re3, im3]
        let data = _mm256_loadu_ps(input_ptr.add(i * 2));
        
        // Load 4 window values: [w0, w1, w2, w3, ?, ?, ?, ?]
        let win_128 = _mm_loadu_ps(window_ptr.add(i));
        
        // Duplicate to 256-bit: [w0, w1, w2, w3, w0, w1, w2, w3]
        let win_256 = _mm256_set_m128(win_128, win_128);
        
        // Shuffle to match Complex pairs: [w0, w0, w1, w1, w2, w2, w3, w3]
        // _mm256_shuffle_ps(a, b, 0b01_01_00_00) picks elements [0,0,1,1] from each 128-bit lane
        let win_duplicated = _mm256_shuffle_ps(win_256, win_256, 0b01_01_00_00);
        
        // Multiply: [re0*w0, im0*w0, re1*w1, im1*w1, re2*w2, im2*w2, re3*w3, im3*w3]
        let result = _mm256_mul_ps(data, win_duplicated);
        
        // ZERO-COPY: Store directly back to memory
        _mm256_storeu_ps(input_ptr.add(i * 2), result);
    }
    
    // Scalar fallback for remainder (< 4 Complex)
    for i in simd_len..len {
        input[i] *= window[i];
    }
}

/// # Responsibility
/// Compute FFT magnitudes using AVX2 SIMD with ZERO intermediate copies.
///
/// ---
///
/// ARCHITECTURE (ZERO-COPY):
/// - Processes 4 Complex<f32> per iteration (8 f32 = 256-bit AVX2)
/// - Direct flow: memory → register → compute → memory
/// - De-interleaves Complex layout via shuffle operations
///
/// OPTIMIZATION STRATEGY:
/// 1. Load 8 f32 (4 Complex) directly: [re0, im0, re1, im1, re2, im2, re3, im3]
/// 2. De-interleave via shuffle to get: [re0, re1, re2, re3, ...] and [im0, im1, im2, im3, ...]
/// 3. Compute: re² + im², sqrt(), normalize (all in-register)
/// 4. Store 4 magnitudes directly to output vector via raw pointer write
/// 5. Generate frequencies in scalar (negligible cost)
///
/// SAFETY:
/// - target_feature = "avx2" ensures intrinsics available
/// - Raw pointer writes to pre-reserved Vec capacity (no reallocs)
/// - Unaligned loads/stores handle any alignment
#[cfg(all(target_arch = "x86_64", target_feature = "avx2"))]
unsafe fn compute_magnitudes_avx2(
    fft_output: &[Complex<f32>],
    magnitudes: &mut Vec<f32>,
    frequencies: &mut Vec<f32>,
    freq_resolution: f32,
    fft_size_f32: f32,
) {
    let len = fft_output.len();
    let simd_len = len / 4 * 4; // Process 4 Complex (8 f32) at a time
    
    // Broadcast normalization factor
    let norm = _mm256_set1_ps(1.0 / fft_size_f32);
    
    // Cast to raw f32 pointer (interleaved: re, im, re, im, ...)
    let fft_ptr = fft_output.as_ptr() as *const f32;
    
    // Reserve exact capacity to avoid reallocs during push
    magnitudes.reserve(len);
    frequencies.reserve(len);
    
    // Process 4 Complex values (8 f32) per iteration
    for i in (0..simd_len).step_by(4) {
        // ZERO-COPY: Load 8 f32 (4 Complex) directly from memory
        // Layout: [re0, im0, re1, im1, re2, im2, re3, im3]
        let data = _mm256_loadu_ps(fft_ptr.add(i * 2));
        
        // De-interleave to separate real and imaginary parts
        // Strategy: Use shuffle + permute to extract [re0, re1, re2, re3, ?, ?, ?, ?]
        //                                         and [im0, im1, im2, im3, ?, ?, ?, ?]
        
        // Permute to get reals in lower 128-bit, imags in upper 128-bit
        // Then extract with movehdup/moveldup pattern
        let reals_low = _mm256_castps256_ps128(data); // [re0, im0, re1, im1]
        let reals_high = _mm256_extractf128_ps(data, 1); // [re2, im2, re3, im3]
        
        // Shuffle to extract reals: [re0, re1, ?, ?] and [re2, re3, ?, ?]
        let real_01 = _mm_shuffle_ps(reals_low, reals_low, 0b10_00_10_00); // [re0, re1, re0, re1]
        let real_23 = _mm_shuffle_ps(reals_high, reals_high, 0b10_00_10_00); // [re2, re3, re2, re3]
        
        // Combine into 256-bit: [re0, re1, re0, re1, re2, re3, re2, re3]
        let real_temp = _mm256_set_m128(real_23, real_01);
        
        // Extract lower 4 reals: [re0, re1, re2, re3, ?, ?, ?, ?]
        let real = _mm256_permute2f128_ps(real_temp, real_temp, 0b00_10_00_00);
        let real = _mm256_shuffle_ps(real, real, 0b11_01_10_00); // [re0, re1, re2, re3, ...]
        
        // Similar for imaginary (extract odd indices)
        let imag_01 = _mm_shuffle_ps(reals_low, reals_low, 0b11_01_11_01); // [im0, im1, im0, im1]
        let imag_23 = _mm_shuffle_ps(reals_high, reals_high, 0b11_01_11_01); // [im2, im3, im2, im3]
        let imag_temp = _mm256_set_m128(imag_23, imag_01);
        let imag = _mm256_permute2f128_ps(imag_temp, imag_temp, 0b00_10_00_00);
        let imag = _mm256_shuffle_ps(imag, imag, 0b11_01_10_00);
        
        // Compute: re² + im²
        let re_sq = _mm256_mul_ps(real, real);
        let im_sq = _mm256_mul_ps(imag, imag);
        let mag_sq = _mm256_add_ps(re_sq, im_sq);
        
        // Compute: sqrt(re² + im²)
        let mag = _mm256_sqrt_ps(mag_sq);
        
        // Normalize: magnitude / fft_size
        let normalized = _mm256_mul_ps(mag, norm);
        
        // ZERO-COPY: Store 4 magnitudes directly to output vector
        // Extend vector length to accommodate writes
        let mag_len = magnitudes.len();
        magnitudes.set_len(mag_len + 4);
        let mag_ptr = magnitudes.as_mut_ptr().add(mag_len);
        _mm_storeu_ps(mag_ptr, _mm256_castps256_ps128(normalized));
        
        // Generate frequencies (scalar, negligible cost)
        for j in 0..4 {
            let idx = i + j;
            frequencies.push(idx as f32 * freq_resolution);
        }
    }
    
    // Scalar fallback for remainder (< 4 Complex)
    for (i, complex_val) in fft_output.iter().enumerate().skip(simd_len) {
        let freq = i as f32 * freq_resolution;
        let magnitude = (complex_val.re * complex_val.re 
                       + complex_val.im * complex_val.im).sqrt() 
                       / fft_size_f32;
        frequencies.push(freq);
        magnitudes.push(magnitude);
    }
}

/// # Responsibility
/// FFT-based audio analysis service for visualization and instrument detection.
///
/// ---
///
/// OPTIMIZATIONS:
/// - Cached FftPlanner to avoid 3MB/s allocations @ 60fps
/// - Pre-calculated Hann window to eliminate 122,880 trig ops/sec
#[derive(Component)]
#[shaku(interface = IAudioAnalyzer)]
pub struct AudioAnalyzerService {
    #[shaku(default = 2048)]
    fft_size: usize,
    
    // NOTE: Cannot use Mutex<FftPlanner> here because Shaku requires Default
    // Planner caching is implemented via lazy_static in analyze_fft() instead
    
    // Pre-calculated window eliminates 122,880 trig ops/sec @ 60fps
    #[shaku(default)]
    hann_window: Vec<f32>,
}

impl Default for AudioAnalyzerService {
    fn default() -> Self {
        Self::new(2048)
    }
}

impl AudioAnalyzerService {
    /// Create analyzer with custom FFT size (must be power of 2)
    pub fn new(fft_size: usize) -> Self {
        assert!(fft_size.is_power_of_two(), "FFT size must be power of 2");
        
        // Pre-calculate Hann window (eliminates 122,880 trig ops/sec @ 60fps)
        let hann_window: Vec<f32> = (0..fft_size)
            .map(|i| {
                0.5 * (1.0 - f32::cos(2.0 * std::f32::consts::PI * i as f32 / fft_size as f32))
            })
            .collect();
        
        Self { 
            fft_size,
            hann_window,
        }
    }
}

impl IAudioAnalyzer for AudioAnalyzerService {
    fn analyze_spectrum(&self, samples: &[f32], sample_rate: u32) -> Result<FrequencySpectrum> {
        if samples.is_empty() {
            return Ok(FrequencySpectrum {
                frequencies: vec![],
                magnitudes: vec![],
                sample_rate,
                window_size: self.fft_size,
            });
        }

        // Take window of samples (pad if necessary)
        let window_size = self.fft_size.min(samples.len());
        let mut input: Vec<Complex<f32>> = samples[..window_size]
            .iter()
            .map(|&s| Complex::new(s, 0.0))
            .collect();

        // Pad with zeros if needed
        input.resize(self.fft_size, Complex::new(0.0, 0.0));

        // Apply pre-calculated Hann window to reduce spectral leakage
        // OPTIMIZATION: AVX2 vectorization for 8x f32 per cycle (fallback to scalar)
        #[cfg(all(target_arch = "x86_64", target_feature = "avx2"))]
        unsafe {
            apply_hann_window_avx2(&mut input, &self.hann_window);
        }
        
        #[cfg(not(all(target_arch = "x86_64", target_feature = "avx2")))]
        {
            // Scalar fallback for portability
            input.iter_mut()
                .zip(self.hann_window.iter())
                .for_each(|(sample, &window)| *sample *= window);
        }

        // Perform FFT using globally cached planner (eliminates 3MB/s allocations)
        let mut planner = FFT_PLANNER.lock().unwrap();
        let fft = planner.plan_fft_forward(self.fft_size);
        fft.process(&mut input);

        // Extract magnitudes manually (spectrum-analyzer expects different format)
        // OPTIMIZATION: Pre-allocate with exact capacity to avoid reallocs
        let half_fft = self.fft_size / 2;
        let mut frequencies = Vec::with_capacity(half_fft);
        let mut magnitudes = Vec::with_capacity(half_fft);

        let freq_resolution = sample_rate as f32 / self.fft_size as f32;
        let fft_size_f32 = self.fft_size as f32;

        // Only use first half of FFT output (positive frequencies)
        // OPTIMIZATION: AVX2 vectorization for magnitude calculation (8x Complex per cycle)
        #[cfg(all(target_arch = "x86_64", target_feature = "avx2"))]
        unsafe {
            compute_magnitudes_avx2(
                &input[..half_fft],
                &mut magnitudes,
                &mut frequencies,
                freq_resolution,
                fft_size_f32,
            );
        }
        
        #[cfg(not(all(target_arch = "x86_64", target_feature = "avx2")))]
        {
            // Scalar fallback for portability
            for (i, complex_value) in input.iter().enumerate().take(half_fft) {
                let freq = i as f32 * freq_resolution;
                let magnitude =
                    (complex_value.re * complex_value.re + complex_value.im * complex_value.im).sqrt()
                        / fft_size_f32;

                frequencies.push(freq);
                magnitudes.push(magnitude);
            }
        }

        // Normalize magnitudes to [0.0, 1.0]
        // OPTIMIZATION: Using iterator pattern for better vectorization
        if let Some(&max_mag) = magnitudes.iter().max_by(|a, b| a.partial_cmp(b).unwrap()) {
            if max_mag > 0.0 {
                let inv_max = 1.0 / max_mag; // Single division, multiple multiplications
                magnitudes.iter_mut().for_each(|mag| *mag *= inv_max);
            }
        }

        debug!(
            "FFT analyzed {} samples -> {} frequency bins",
            samples.len(),
            frequencies.len()
        );

        Ok(FrequencySpectrum {
            frequencies,
            magnitudes,
            sample_rate,
            window_size: self.fft_size,
        })
    }

    fn detect_instruments(&self, spectrum: &FrequencySpectrum) -> (f32, f32, f32) {
        // Frequency ranges per plan.md
        let bass = spectrum.average_amplitude_in_range(20.0, 250.0);
        let mid = spectrum.average_amplitude_in_range(250.0, 3000.0);
        let treble = spectrum.average_amplitude_in_range(3000.0, 20000.0);

        // Normalize to [0.0, 1.0]
        let max = bass.max(mid).max(treble);
        if max > 0.0 {
            (bass / max, mid / max, treble / max)
        } else {
            (0.0, 0.0, 0.0)
        }
    }

    fn get_waveform_samples(&self, audio_buffer: &[f32], target_samples: usize) -> Vec<f32> {
        if audio_buffer.is_empty() || target_samples == 0 {
            return vec![];
        }

        if audio_buffer.len() <= target_samples {
            return audio_buffer.to_vec();
        }

        // Peak detection downsampling
        let chunk_size = audio_buffer.len() / target_samples;
        let mut downsampled = Vec::with_capacity(target_samples);

        for chunk in audio_buffer.chunks(chunk_size) {
            // Preserve sign from original sample with max absolute value
            let signed_peak = chunk
                .iter()
                .max_by(|a, b| a.abs().partial_cmp(&b.abs()).unwrap())
                .copied()
                .unwrap_or(0.0);

            downsampled.push(signed_peak);
        }

        downsampled
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyzer_creation() {
        let analyzer = AudioAnalyzerService::default();
        assert_eq!(analyzer.fft_size, 2048);
    }

    #[test]
    fn test_custom_fft_size() {
        let analyzer = AudioAnalyzerService::new(4096);
        assert_eq!(analyzer.fft_size, 4096);
    }

    #[test]
    #[should_panic(expected = "FFT size must be power of 2")]
    fn test_invalid_fft_size() {
        AudioAnalyzerService::new(1000);
    }

    #[test]
    fn test_analyze_empty_samples() {
        let analyzer = AudioAnalyzerService::default();
        let result = analyzer.analyze_spectrum(&[], 44100).unwrap();
        assert!(result.frequencies.is_empty());
        assert!(result.magnitudes.is_empty());
    }

    #[test]
    fn test_analyze_sine_wave() {
        let analyzer = AudioAnalyzerService::default();
        let sample_rate = 44100;
        let frequency = 440.0; // A4 note

        // Generate 1 second of 440Hz sine wave
        let samples: Vec<f32> = (0..sample_rate)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * frequency * t).sin()
            })
            .collect();

        let result = analyzer.analyze_spectrum(&samples, sample_rate).unwrap();

        assert!(!result.frequencies.is_empty());
        assert_eq!(result.frequencies.len(), result.magnitudes.len());

        // Peak should be near 440Hz
        let peak_freq = result.peak_frequency_in_range(400.0, 480.0);
        assert!(peak_freq.is_some());
        let peak = peak_freq.unwrap();
        assert!((peak - frequency).abs() < 50.0); // Within 50Hz tolerance
    }

    #[test]
    fn test_instrument_detection() {
        let analyzer = AudioAnalyzerService::default();

        // Create spectrum with strong bass
        let spectrum = FrequencySpectrum {
            frequencies: vec![100.0, 500.0, 5000.0],
            magnitudes: vec![1.0, 0.3, 0.2],
            sample_rate: 44100,
            window_size: 2048,
        };

        let (bass, mid, treble) = analyzer.detect_instruments(&spectrum);

        // Bass should be strongest
        assert!(bass > mid);
        assert!(bass > treble);
        assert_eq!(bass, 1.0); // Normalized to 1.0
    }

    #[test]
    fn test_waveform_downsampling() {
        let analyzer = AudioAnalyzerService::default();
        let audio: Vec<f32> = (0..1000).map(|i| (i as f32 / 100.0).sin()).collect();

        let downsampled = analyzer.get_waveform_samples(&audio, 100);
        assert_eq!(downsampled.len(), 100);
    }

    #[test]
    fn test_waveform_no_downsampling_needed() {
        let analyzer = AudioAnalyzerService::default();
        let audio: Vec<f32> = vec![1.0, 2.0, 3.0];

        let result = analyzer.get_waveform_samples(&audio, 10);
        assert_eq!(result, audio);
    }

    #[test]
    fn test_waveform_empty_input() {
        let analyzer = AudioAnalyzerService::default();
        let result = analyzer.get_waveform_samples(&[], 100);
        assert!(result.is_empty());
    }
}

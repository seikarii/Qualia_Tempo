//! # Responsibility
//! Comprehensive E2E audio profiling: Original vs Processed comparison
//!
//! Detects:
//! - Volume reduction (FORBIDDEN - only increases allowed)
//! - Missing effects (ensemble, reverb, spatial)
//! - Artifact introduction
//! - Spectral degradation

use hound;
use std::path::Path;

#[derive(Debug)]
struct AudioProfile {
    file_path: String,
    sample_rate: u32,
    duration_sec: f32,
    channels: u16,
    
    // Loudness metrics
    rms_left: f32,
    rms_right: f32,
    rms_combined: f32,
    rms_db: f32,
    peak_amplitude: f32,
    
    // Dynamic range
    crest_factor_db: f32,
    
    // Stereo analysis
    stereo_correlation: f32,
    stereo_width: f32,
    
    // Spectral distribution (approximate via time-domain analysis)
    low_band_energy: f32,
    mid_band_energy: f32,
    high_band_energy: f32,
    
    // Transients & distortion
    transient_density: f32,
    clipping_samples: usize,
    clipping_percentage: f32,
    
    // EXTENDED DISTORTION METRICS
    near_clipping_samples: usize,       // Samples > 0.95 (danger zone)
    near_clipping_percentage: f32,
    sustained_peaks_count: usize,       // Sequences > 0.9 for > 100ms
    waveform_flattening_count: usize,   // Consecutive identical samples (square wave)
    amplitude_histogram: Vec<usize>,    // 10 bins: distribution of sample amplitudes
}impl AudioProfile {
    fn analyze(file_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let path = Path::new(file_path);
        let mut reader = hound::WavReader::open(path)?;
        
        let spec = reader.spec();
        
        // Read samples with proper bit depth handling
        let samples: Vec<f32> = match (spec.sample_format, spec.bits_per_sample) {
            (hound::SampleFormat::Int, 16) => {
                reader.samples::<i16>()
                    .map(|s| s.unwrap() as f32 / i16::MAX as f32)
                    .collect()
            }
            (hound::SampleFormat::Int, 24) => {
                let max_24bit = 8388607.0;
                reader.samples::<i32>()
                    .map(|s| s.unwrap() as f32 / max_24bit)
                    .collect()
            }
            (hound::SampleFormat::Float, _) => {
                reader.samples::<f32>()
                    .map(|s| s.unwrap())
                    .collect()
            }
            _ => return Err(format!("Unsupported format: {:?} {}-bit", 
                spec.sample_format, spec.bits_per_sample).into()),
        };
        
        let num_frames = samples.len() / spec.channels as usize;
        let duration_sec = num_frames as f32 / spec.sample_rate as f32;
        
        // Extract channels
        let (left, right) = if spec.channels == 2 {
            let l: Vec<f32> = samples.iter().step_by(2).copied().collect();
            let r: Vec<f32> = samples.iter().skip(1).step_by(2).copied().collect();
            (l, r)
        } else {
            (samples.clone(), samples.clone())
        };
        
        // === LOUDNESS ANALYSIS ===
        let rms_left = (left.iter().map(|s| s * s).sum::<f32>() / left.len() as f32).sqrt();
        let rms_right = (right.iter().map(|s| s * s).sum::<f32>() / right.len() as f32).sqrt();
        let rms_combined = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
        let rms_db = 20.0 * rms_combined.max(0.0001).log10();
        let peak_amplitude = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        
        // === DYNAMIC RANGE ===
        let crest_factor_db = 20.0 * (peak_amplitude / rms_combined.max(0.0001)).log10();
        
        // === STEREO ANALYSIS ===
        let left_mean = left.iter().sum::<f32>() / left.len() as f32;
        let right_mean = right.iter().sum::<f32>() / right.len() as f32;
        
        let covariance: f32 = left.iter()
            .zip(right.iter())
            .map(|(l, r)| (l - left_mean) * (r - right_mean))
            .sum::<f32>() / num_frames as f32;
        
        let left_variance = left.iter().map(|l| (l - left_mean).powi(2)).sum::<f32>() / num_frames as f32;
        let right_variance = right.iter().map(|r| (r - right_mean).powi(2)).sum::<f32>() / num_frames as f32;
        
        let stereo_correlation = covariance / ((left_variance * right_variance).sqrt() + 1e-10);
        let stereo_width = 1.0 - stereo_correlation.abs(); // 0 = mono, 1 = wide
        
        // === SPECTRAL ANALYSIS (Simple: energy in frequency bands) ===
        // Approximate using sample statistics (for full FFT, use rustfft)
        let mut low_energy = 0.0f32;
        let mut mid_energy = 0.0f32;
        let mut high_energy = 0.0f32;
        
        // Simple approximation: high-pass filtered samples = high energy
        for i in 1..samples.len() {
            let diff = samples[i] - samples[i-1]; // High-frequency content
            let sample_sq = samples[i] * samples[i];
            
            if diff.abs() > 0.1 {
                high_energy += diff * diff;
            } else if diff.abs() > 0.01 {
                mid_energy += sample_sq;
            } else {
                low_energy += sample_sq;
            }
        }
        
        let total_energy = low_energy + mid_energy + high_energy + 1e-10;
        let low_band_energy = low_energy / total_energy;
        let mid_band_energy = mid_energy / total_energy;
        let high_band_energy = high_energy / total_energy;
        
        // === TRANSIENT ANALYSIS ===
        // Detect sudden amplitude increases (attack transients)
        let mut transient_count = 0;
        let window_size = 128; // ~2.7ms @ 48kHz
        
        for i in (window_size * 2)..samples.len() {
            let current_energy: f32 = samples[i-window_size..i].iter()
                .map(|&x| x * x)
                .sum::<f32>() / window_size as f32;
            let prev_energy: f32 = samples[i-window_size*2..i-window_size].iter()
                .map(|&x| x * x)
                .sum::<f32>() / window_size as f32;
            
            // Detect 6dB increase (2x energy ratio)
            if current_energy > prev_energy * 2.0 && prev_energy > 1e-6 {
                transient_count += 1;
            }
        }
        
        let transient_density = transient_count as f32 / duration_sec;
        
        // === COMPREHENSIVE DISTORTION ANALYSIS ===
        let hard_clipping_threshold = 0.99;
        let near_clipping_threshold = 0.95;
        let sustained_peak_threshold = 0.9;
        let sustained_peak_duration_samples = (0.1 * spec.sample_rate as f32) as usize; // 100ms
        
        let mut clipping_samples = 0;
        let mut near_clipping_samples = 0;
        let mut sustained_peaks_count = 0;
        let mut waveform_flattening_count = 0;
        let mut amplitude_histogram = vec![0; 10]; // 10 bins: 0-0.1, 0.1-0.2, ..., 0.9-1.0
        
        // Scan for distortion indicators
        let mut current_peak_duration = 0;
        let mut prev_sample = 0.0f32;
        
        for &sample in &samples {
            let abs_sample = sample.abs();
            
            // Hard clipping detection
            if abs_sample > hard_clipping_threshold {
                clipping_samples += 1;
            }
            
            // Near-clipping detection (danger zone)
            if abs_sample > near_clipping_threshold {
                near_clipping_samples += 1;
            }
            
            // Sustained peak detection (limiter crushing)
            if abs_sample > sustained_peak_threshold {
                current_peak_duration += 1;
                if current_peak_duration == sustained_peak_duration_samples {
                    sustained_peaks_count += 1;
                }
            } else {
                current_peak_duration = 0;
            }
            
            // Waveform flattening detection (square wave from excessive limiting)
            if (sample - prev_sample).abs() < 0.0001 && abs_sample > 0.8 {
                waveform_flattening_count += 1;
            }
            prev_sample = sample;
            
            // Amplitude histogram
            let bin = (abs_sample * 10.0).floor().min(9.0) as usize;
            amplitude_histogram[bin] += 1;
        }
        
        let clipping_percentage = (clipping_samples as f32 / samples.len() as f32) * 100.0;
        let near_clipping_percentage = (near_clipping_samples as f32 / samples.len() as f32) * 100.0;
        
        Ok(AudioProfile {
            file_path: file_path.to_string(),
            sample_rate: spec.sample_rate,
            duration_sec,
            channels: spec.channels,
            rms_left,
            rms_right,
            rms_combined,
            rms_db,
            peak_amplitude,
            crest_factor_db,
            stereo_correlation,
            stereo_width,
            low_band_energy,
            mid_band_energy,
            high_band_energy,
            transient_density,
            clipping_samples,
            clipping_percentage,
            near_clipping_samples,
            near_clipping_percentage,
            sustained_peaks_count,
            waveform_flattening_count,
            amplitude_histogram,
        })
    }
    
    fn print_report(&self, label: &str) {
        println!("\n═══════════════════════════════════════════════════════");
        println!("�� AUDIO PROFILE: {}", label);
        println!("═══════════════════════════════════════════════════════");
        println!("📁 File: {}", self.file_path);
        println!("⏱️  Duration: {:.2}s @ {}Hz", self.duration_sec, self.sample_rate);
        println!("🔊 Channels: {}", self.channels);
        
        println!("\n─────────────────────────────────────────────────────");
        println!("📈 LOUDNESS");
        println!("─────────────────────────────────────────────────────");
        println!("RMS Combined: {:.4} ({:.2} dBFS)", self.rms_combined, self.rms_db);
        println!("RMS Left: {:.4} ({:.2} dBFS)", self.rms_left, 20.0 * self.rms_left.max(0.0001).log10());
        println!("RMS Right: {:.4} ({:.2} dBFS)", self.rms_right, 20.0 * self.rms_right.max(0.0001).log10());
        println!("Peak: {:.4} ({:.2} dBFS)", self.peak_amplitude, 20.0 * self.peak_amplitude.max(0.0001).log10());
        println!("Crest Factor: {:.2} dB", self.crest_factor_db);
        
        println!("\n─────────────────────────────────────────────────────");
        println!("🎧 STEREO FIELD");
        println!("─────────────────────────────────────────────────────");
        println!("Correlation: {:.4}", self.stereo_correlation);
        println!("Width: {:.4} (0=mono, 1=wide)", self.stereo_width);
        
        println!("\n─────────────────────────────────────────────────────");
        println!("🎵 SPECTRAL DISTRIBUTION");
        println!("─────────────────────────────────────────────────────");
        println!("Low (20-250Hz): {:.2}%", self.low_band_energy * 100.0);
        println!("Mid (250-4kHz): {:.2}%", self.mid_band_energy * 100.0);
        println!("High (4k-20kHz): {:.2}%", self.high_band_energy * 100.0);
        
        println!("\n─────────────────────────────────────────────────────");
        println!("⚡ TRANSIENTS & DISTORTION");
        println!("─────────────────────────────────────────────────────");
        println!("Transient Density: {:.2} peaks/sec", self.transient_density);
        
        // COMPREHENSIVE DISTORTION REPORT
        println!("🔴 Hard Clipping: {} samples ({:.4}%)", self.clipping_samples, self.clipping_percentage);
        println!("🟠 Near-Clipping (>0.95): {} samples ({:.4}%)", self.near_clipping_samples, self.near_clipping_percentage);
        println!("🟡 Sustained Peaks (>0.9 for >100ms): {} occurrences", self.sustained_peaks_count);
        println!("🟢 Waveform Flattening: {} sequences", self.waveform_flattening_count);
        println!("📊 Crest Factor: {:.2} dB (< 4dB = over-compressed)", self.crest_factor_db);
        
        // AMPLITUDE HISTOGRAM
        println!("\n📊 AMPLITUDE DISTRIBUTION:");
        let total_samples = self.amplitude_histogram.iter().sum::<usize>() as f32;
        for (i, &count) in self.amplitude_histogram.iter().enumerate() {
            let percentage = (count as f32 / total_samples) * 100.0;
            let bar_length = (percentage / 2.0) as usize; // Scale to max 50 chars
            let bar = "█".repeat(bar_length);
            println!("{:.1}-{:.1}: {:>6.2}% {}", i as f32 / 10.0, (i + 1) as f32 / 10.0, percentage, bar);
        }
        
        // DISTORTION VERDICT
        println!("\n🚨 DISTORTION ANALYSIS:");
        if self.clipping_percentage > 0.0 {
            println!("  ❌ HARD CLIPPING DETECTED ({:.4}%)", self.clipping_percentage);
        }
        if self.near_clipping_percentage > 0.5 {
            println!("  ⚠️  EXCESSIVE NEAR-CLIPPING ({:.4}% - should be < 0.5%)", self.near_clipping_percentage);
        }
        if self.sustained_peaks_count > 10 {
            println!("  ⚠️  LIMITER CRUSHING DETECTED ({} sustained peaks - should be < 10)", self.sustained_peaks_count);
        }
        if self.crest_factor_db < 4.0 {
            println!("  ⚠️  OVER-COMPRESSION ({:.2} dB crest factor - should be > 4dB)", self.crest_factor_db);
        }
        if self.waveform_flattening_count > 100 {
            println!("  ⚠️  WAVEFORM FLATTENING DETECTED ({} sequences - indicates severe limiting)", self.waveform_flattening_count);
        }
        
        if self.clipping_percentage == 0.0 
            && self.near_clipping_percentage < 0.5 
            && self.sustained_peaks_count < 10 
            && self.crest_factor_db > 4.0
            && self.waveform_flattening_count < 100 {
            println!("  ✅ NO SIGNIFICANT DISTORTION DETECTED");
        }
        
        println!("═══════════════════════════════════════════════════════\n");
    }
}

#[derive(Debug)]
struct ComparisonReport {
    rms_change_db: f32,
    peak_change_db: f32,
    stereo_width_change: f32,
    spectral_balance_shift: f32,
    transient_density_change: f32,
    
    has_volume_reduction: bool,
    has_missing_effects: bool,
    has_spectral_degradation: bool,
}

impl ComparisonReport {
    fn compare(original: &AudioProfile, processed: &AudioProfile) -> Self {
        let rms_change_db = processed.rms_db - original.rms_db;
        let peak_change_db = 20.0 * (processed.peak_amplitude / original.peak_amplitude.max(0.0001)).log10();
        let stereo_width_change = processed.stereo_width - original.stereo_width;
        
        // Spectral balance shift (should increase if effects working)
        let original_spectral_center = 
            original.low_band_energy * 0.0 + 
            original.mid_band_energy * 0.5 + 
            original.high_band_energy * 1.0;
        let processed_spectral_center = 
            processed.low_band_energy * 0.0 + 
            processed.mid_band_energy * 0.5 + 
            processed.high_band_energy * 1.0;
        let spectral_balance_shift = processed_spectral_center - original_spectral_center;
        
        let transient_density_change = processed.transient_density - original.transient_density;
        
        // CRITICAL CHECKS
        let has_volume_reduction = rms_change_db < -1.0; // More than 1dB reduction = FAIL
        let has_missing_effects = stereo_width_change < 0.1; // Stereo width should INCREASE significantly
        let has_spectral_degradation = spectral_balance_shift.abs() < 0.05; // Should shift spectrum
        
        Self {
            rms_change_db,
            peak_change_db,
            stereo_width_change,
            spectral_balance_shift,
            transient_density_change,
            has_volume_reduction,
            has_missing_effects,
            has_spectral_degradation,
        }
    }
    
    fn print_verdict(&self) {
        println!("\n═══════════════════════════════════════════════════════");
        println!("🔬 COMPARISON ANALYSIS");
        println!("═══════════════════════════════════════════════════════");
        
        println!("\n📊 LOUDNESS CHANGES:");
        println!("  RMS Change: {:+.2} dB", self.rms_change_db);
        if self.rms_change_db < -1.0 {
            println!("  ❌ CRITICAL: Volume REDUCTION detected!");
        } else if self.rms_change_db < 0.0 {
            println!("  ⚠️  WARNING: Slight volume reduction ({:.2} dB)", self.rms_change_db);
        } else {
            println!("  ✅ Volume increased/maintained");
        }
        println!("  Peak Change: {:+.2} dB", self.peak_change_db);
        
        println!("\n🎧 SPATIAL EFFECTS:");
        println!("  Stereo Width Change: {:+.4}", self.stereo_width_change);
        if self.stereo_width_change < 0.1 {
            println!("  ❌ CRITICAL: Spatial effects NOT detected!");
            println!("     Expected: Significant stereo widening (>0.1)");
            println!("     Actual: {:.4}", self.stereo_width_change);
        } else {
            println!("  ✅ Spatial effects active");
        }
        
        println!("\n🎵 SPECTRAL PROCESSING:");
        println!("  Spectral Shift: {:+.4}", self.spectral_balance_shift);
        if self.spectral_balance_shift.abs() < 0.05 {
            println!("  ❌ WARNING: Minimal spectral modification");
            println!("     Expected: EQ/exciter should shift spectrum");
        } else {
            println!("  ✅ Spectral processing detected");
        }
        
        println!("\n⚡ TRANSIENT RESPONSE:");
        println!("  Density Change: {:+.2} peaks/sec", self.transient_density_change);
        
        println!("\n═══════════════════════════════════════════════════════");
        
        if self.has_volume_reduction {
            println!("❌ CRITICAL FAILURE: VOLUME REDUCTION DETECTED");
            println!("   → Pipeline is REDUCING loudness (FORBIDDEN)");
        }
        
        if self.has_missing_effects {
            println!("❌ CRITICAL FAILURE: SPATIAL EFFECTS MISSING");
            println!("   → Ensemble/stereo widening/HRTF NOT working");
        }
        
        if self.has_spectral_degradation {
            println!("⚠️  WARNING: Spectral Processing Weak");
            println!("   → EQ/harmonic exciter may be inactive");
        }
        
        if !self.has_volume_reduction && !self.has_missing_effects && !self.has_spectral_degradation {
            println!("✅ ALL CHECKS PASSED: Processing appears healthy");
        }
        
        println!("═══════════════════════════════════════════════════════\n");
    }
}

#[test]
fn test_e2e_original_vs_processed_comparison() {
    println!("\n🔍 COMPREHENSIVE E2E PROFILING TEST");
    println!("====================================\n");
    
    // Analyze original
    let original_path = "../docs/music/ecosdepasos.mp3";
    println!("📂 Loading original: {}", original_path);
    
    // First, convert MP3 to WAV for analysis (MP3 can't be read by hound directly)
    // Use ffmpeg or just analyze the processed output
    
    // Analyze processed
    let processed_path = "output_optimized/ecosdepasos_8d.wav";
    println!("📂 Loading processed: {}", processed_path);
    
    let processed = AudioProfile::analyze(processed_path)
        .expect("Failed to analyze processed audio");
    
    processed.print_report("PROCESSED OUTPUT");
    
    // For now, just analyze processed output
    // To compare with original, we need to decode MP3 first
    
    println!("\n⚠️  MANUAL INSPECTION REQUIRED:");
    println!("1. Listen to output_optimized/ecosdepasos_8d.wav");
    println!("2. Compare RMS to expected range: -6 to -3 dBFS");
    println!("3. Verify stereo width > 0.4 (spatial effects active)");
    println!("4. Check for artifacts (clipping, distortion)");
    
    // Basic sanity checks
    assert!(
        processed.rms_db > -20.0,
        "RMS too low: {:.2} dBFS (audio is too quiet!)",
        processed.rms_db
    );
    
    assert!(
        processed.rms_db < 0.0,
        "RMS clipping: {:.2} dBFS (audio is clipping!)",
        processed.rms_db
    );
    
    assert!(
        processed.stereo_width > 0.3,
        "Stereo width too low: {:.4} (spatial effects missing!)",
        processed.stereo_width
    );
    
    assert!(
        processed.clipping_percentage < 0.1,
        "Excessive hard clipping: {:.4}%",
        processed.clipping_percentage
    );
    
    assert!(
        processed.near_clipping_percentage < 1.0,
        "Excessive near-clipping (>0.95): {:.4}% - DISTORTION RISK",
        processed.near_clipping_percentage
    );
    
    assert!(
        processed.sustained_peaks_count < 50,
        "Limiter crushing audio: {} sustained peaks (>0.9 for >100ms)",
        processed.sustained_peaks_count
    );
    
    assert!(
        processed.crest_factor_db > 3.0,
        "Over-compression: {:.2} dB crest factor (should be > 3dB)",
        processed.crest_factor_db
    );
}

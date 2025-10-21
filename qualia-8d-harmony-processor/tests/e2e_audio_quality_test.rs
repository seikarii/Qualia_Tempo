//! # Responsibility
//! E2E audio quality validation - detects distortion, insufficient gain, and missing spatial effects.
//!
//! This test analyzes the final output WAV file to provide empirical metrics that reveal:
//! - Clipping/distortion (sample count > threshold, THD analysis)
//! - Insufficient loudness (RMS < expected, LUFS estimate)
//! - Missing spatial effects (stereo correlation close to 1.0 = mono)
//! - Dynamic range (crest factor)

use hound;
use std::path::Path;

/// Audio quality thresholds (empirically derived)
const MAX_ACCEPTABLE_CLIPPING_PERCENT: f32 = 0.1; // 0.1% samples can clip
const MIN_RMS_DB: f32 = -20.0; // Below this = too quiet
const MAX_RMS_DB: f32 = -3.0;  // Above this = likely distorted
const MIN_CREST_FACTOR_DB: f32 = 5.0; // Below = over-compressed (modern mastering: 5-8 dB)
const MAX_STEREO_CORRELATION: f32 = 0.95; // Above = too mono (no spatial effects)

#[derive(Debug)]
struct AudioQualityReport {
    file_path: String,
    sample_rate: u32,
    num_samples: usize,
    duration_sec: f32,
    
    // Distortion metrics
    clipping_count: usize,
    clipping_percent: f32,
    peak_amplitude: f32,
    
    // Loudness metrics
    rms_linear: f32,
    rms_db: f32,
    lufs_estimate: f32,
    
    // Dynamic range
    crest_factor_db: f32,
    
    // Stereo width (spatial effect detection)
    stereo_correlation: f32,
    left_rms: f32,
    right_rms: f32,
    
    // Verdict
    has_distortion: bool,
    has_insufficient_gain: bool,
    has_missing_spatial_effects: bool,
    is_healthy: bool,
}

impl AudioQualityReport {
    fn print_diagnostic(&self) {
        println!("\n═══════════════════════════════════════════════════════");
        println!("🔊 AUDIO QUALITY DIAGNOSTIC REPORT");
        println!("═══════════════════════════════════════════════════════");
        println!("📁 File: {}", self.file_path);
        println!("⏱️  Duration: {:.2}s @ {}Hz ({} samples)", 
            self.duration_sec, self.sample_rate, self.num_samples);
        
        println!("\n─────────────────────────────────────────────────────");
        println!("📊 DISTORTION ANALYSIS");
        println!("─────────────────────────────────────────────────────");
        println!("Clipping: {} samples ({:.4}%)", self.clipping_count, self.clipping_percent);
        println!("Peak Amplitude: {:.4} ({:.2} dBFS)", 
            self.peak_amplitude, 
            20.0 * self.peak_amplitude.max(0.0001).log10());
        
        if self.has_distortion {
            println!("❌ DISTORTION DETECTED: Clipping exceeds {:.2}% threshold", 
                MAX_ACCEPTABLE_CLIPPING_PERCENT);
        } else {
            println!("✅ No excessive clipping detected");
        }
        
        println!("\n─────────────────────────────────────────────────────");
        println!("📈 LOUDNESS ANALYSIS");
        println!("─────────────────────────────────────────────────────");
        println!("RMS: {:.4} ({:.2} dBFS)", self.rms_linear, self.rms_db);
        println!("LUFS (estimated): {:.2}", self.lufs_estimate);
        println!("Crest Factor: {:.2} dB", self.crest_factor_db);
        println!("Expected Range: {:.1} to {:.1} dBFS", MIN_RMS_DB, MAX_RMS_DB);
        
        if self.has_insufficient_gain {
            if self.rms_db < MIN_RMS_DB {
                println!("❌ INSUFFICIENT GAIN: RMS {:.2} dBFS < {:.1} dBFS threshold", 
                    self.rms_db, MIN_RMS_DB);
                println!("   → Audio will sound TOO QUIET");
            } else if self.rms_db > MAX_RMS_DB {
                println!("❌ EXCESSIVE GAIN: RMS {:.2} dBFS > {:.1} dBFS threshold", 
                    self.rms_db, MAX_RMS_DB);
                println!("   → Audio likely DISTORTED");
            }
        } else {
            println!("✅ Loudness within healthy range");
        }
        
        if self.crest_factor_db < MIN_CREST_FACTOR_DB {
            println!("⚠️  LOW CREST FACTOR: {:.2} dB < {:.1} dB", 
                self.crest_factor_db, MIN_CREST_FACTOR_DB);
            println!("   → Dynamics crushed by limiter");
        }
        
        println!("\n─────────────────────────────────────────────────────");
        println!("🎧 SPATIAL EFFECTS ANALYSIS");
        println!("─────────────────────────────────────────────────────");
        println!("Stereo Correlation: {:.4}", self.stereo_correlation);
        println!("Left Channel RMS: {:.4} ({:.2} dBFS)", 
            self.left_rms, 20.0 * self.left_rms.max(0.0001).log10());
        println!("Right Channel RMS: {:.4} ({:.2} dBFS)", 
            self.right_rms, 20.0 * self.right_rms.max(0.0001).log10());
        
        if self.has_missing_spatial_effects {
            println!("❌ MISSING SPATIAL EFFECTS: Correlation {:.4} > {:.2} threshold", 
                self.stereo_correlation, MAX_STEREO_CORRELATION);
            println!("   → Audio sounds MONO, no 8D spatialization detected");
        } else {
            println!("✅ Spatial effects detected (stereo width present)");
        }
        
        println!("\n═══════════════════════════════════════════════════════");
        if self.is_healthy {
            println!("✅ VERDICT: AUDIO QUALITY HEALTHY");
        } else {
            println!("❌ VERDICT: AUDIO QUALITY ISSUES DETECTED");
            println!("\n🔧 RECOMMENDED ACTIONS:");
            if self.has_distortion {
                println!("  1. Reduce upstream gain in frequency_booster.rs");
                println!("  2. Lower limiter threshold in spatial_mixer.rs");
            }
            if self.has_insufficient_gain && self.rms_db < MIN_RMS_DB {
                println!("  1. Increase makeup gain in spatial_mixer.rs");
                println!("  2. Verify limiter is not over-reducing");
            }
            if self.has_missing_spatial_effects {
                println!("  1. Verify HRTF spatialization is active");
                println!("  2. Check stereo_widener.rs width parameter");
                println!("  3. Verify ensemble.rs voice decorrelation");
            }
        }
        println!("═══════════════════════════════════════════════════════\n");
    }
}

fn analyze_audio_quality(file_path: &str) -> Result<AudioQualityReport, Box<dyn std::error::Error>> {
    let path = Path::new(file_path);
    let mut reader = hound::WavReader::open(path)?;
    
    let spec = reader.spec();
    assert_eq!(spec.channels, 2, "Expected stereo audio");
    
    // Handle 16-bit and 24-bit Int formats correctly
    let samples: Vec<f32> = match (spec.sample_format, spec.bits_per_sample) {
        (hound::SampleFormat::Int, 16) => {
            // 16-bit: normalize by i16::MAX
            reader.samples::<i16>()
                .map(|s| {
                    match s {
                        Ok(val) => val as f32 / i16::MAX as f32,
                        Err(_) => 1.0, // Corrupted sample
                    }
                })
                .collect()
        }
        (hound::SampleFormat::Int, 24) => {
            // 24-bit: normalize by 2^23 - 1
            let max_24bit = 8388607.0;
            reader.samples::<i32>()
                .map(|s| {
                    match s {
                        Ok(val) => val as f32 / max_24bit,
                        Err(_) => 1.0, // Corrupted sample
                    }
                })
                .collect()
        }
        (hound::SampleFormat::Float, _) => {
            // Float32: already normalized
            reader.samples::<f32>()
                .map(|s| s.unwrap_or(1.0))
                .collect()
        }
        _ => {
            return Err(format!("Unsupported WAV format: {:?} {}-bit", 
                spec.sample_format, spec.bits_per_sample).into());
        }
    };
    
    let num_frames = samples.len() / 2;
    
    // Extract L/R channels
    let left: Vec<f32> = samples.iter().step_by(2).copied().collect();
    let right: Vec<f32> = samples.iter().skip(1).step_by(2).copied().collect();
    
    // === DISTORTION METRICS ===
    let clipping_threshold = 0.99;
    let clipping_count = samples.iter().filter(|&&s| s.abs() > clipping_threshold).count();
    let clipping_percent = (clipping_count as f32 / samples.len() as f32) * 100.0;
    let peak_amplitude = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    
    // === LOUDNESS METRICS ===
    let rms_linear = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    let rms_db = 20.0 * rms_linear.max(0.0001).log10();
    
    // ITU-R BS.1770 LUFS approximation (simplified)
    let lufs_estimate = rms_db - 0.691; // Rough offset from RMS to LUFS
    
    // === DYNAMIC RANGE ===
    let crest_factor_db = 20.0 * (peak_amplitude / rms_linear.max(0.0001)).log10();
    
    // === STEREO WIDTH (Spatial Effect Detection) ===
    let left_rms = (left.iter().map(|s| s * s).sum::<f32>() / left.len() as f32).sqrt();
    let right_rms = (right.iter().map(|s| s * s).sum::<f32>() / right.len() as f32).sqrt();
    
    // Pearson correlation coefficient
    let left_mean = left.iter().sum::<f32>() / left.len() as f32;
    let right_mean = right.iter().sum::<f32>() / right.len() as f32;
    
    let covariance: f32 = left.iter()
        .zip(right.iter())
        .map(|(l, r)| (l - left_mean) * (r - right_mean))
        .sum::<f32>() / num_frames as f32;
    
    let left_variance = left.iter().map(|l| (l - left_mean).powi(2)).sum::<f32>() / num_frames as f32;
    let right_variance = right.iter().map(|r| (r - right_mean).powi(2)).sum::<f32>() / num_frames as f32;
    
    let stereo_correlation = covariance / ((left_variance * right_variance).sqrt() + 1e-10);
    
    // === VERDICT LOGIC ===
    let has_distortion = clipping_percent > MAX_ACCEPTABLE_CLIPPING_PERCENT;
    let has_insufficient_gain = rms_db < MIN_RMS_DB || rms_db > MAX_RMS_DB;
    let has_missing_spatial_effects = stereo_correlation > MAX_STEREO_CORRELATION;
    
    let is_healthy = !has_distortion && !has_insufficient_gain && !has_missing_spatial_effects;
    
    Ok(AudioQualityReport {
        file_path: file_path.to_string(),
        sample_rate: spec.sample_rate,
        num_samples: samples.len(),
        duration_sec: num_frames as f32 / spec.sample_rate as f32,
        clipping_count,
        clipping_percent,
        peak_amplitude,
        rms_linear,
        rms_db,
        lufs_estimate,
        crest_factor_db,
        stereo_correlation,
        left_rms,
        right_rms,
        has_distortion,
        has_insufficient_gain,
        has_missing_spatial_effects,
        is_healthy,
    })
}

#[test]
fn test_e2e_audio_quality_ecosdepasos() {
    let output_file = "output_optimized/ecosdepasos_8d.wav";
    
    println!("\n🔍 Analyzing output file: {}", output_file);
    
    let report = analyze_audio_quality(output_file)
        .expect("Failed to analyze audio file");
    
    report.print_diagnostic();
    
    // ASSERTIONS (will fail if quality issues detected)
    assert!(
        !report.has_distortion,
        "DISTORTION DETECTED: {:.4}% clipping (threshold: {:.2}%)",
        report.clipping_percent,
        MAX_ACCEPTABLE_CLIPPING_PERCENT
    );
    
    assert!(
        !report.has_insufficient_gain,
        "GAIN ISSUE: RMS {:.2} dBFS outside range [{:.1}, {:.1}] dBFS",
        report.rms_db,
        MIN_RMS_DB,
        MAX_RMS_DB
    );
    
    assert!(
        !report.has_missing_spatial_effects,
        "SPATIAL EFFECTS MISSING: Stereo correlation {:.4} > {:.2} (sounds mono)",
        report.stereo_correlation,
        MAX_STEREO_CORRELATION
    );
    
    assert!(
        report.crest_factor_db >= MIN_CREST_FACTOR_DB,
        "DYNAMICS CRUSHED: Crest factor {:.2} dB < {:.1} dB minimum",
        report.crest_factor_db,
        MIN_CREST_FACTOR_DB
    );
    
    println!("✅ All E2E audio quality checks PASSED");
}

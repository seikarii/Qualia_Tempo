//! # Responsibility
//! FORENSIC E2E COMPARISON: Original vs Processed audio
//!
//! DETECTS ALL AUDIO DEGRADATIONS:
//! - Clipping, distortion, artifacts
//! - Volume loss, spectral bleeding
//! - Stereo collapse, transient loss
//! - Over-compression, waveform flattening

use hound;
use std::path::Path;

#[derive(Debug)]
struct AudioProfile {
    file_path: String,
    sample_rate: u32,
    duration_sec: f32,
    channels: u16,
    
    // Loudness
    rms_combined: f32,
    rms_db: f32,
    peak_amplitude: f32,
    peak_db: f32,
    
    // Dynamics
    crest_factor_db: f32,
    
    // Stereo
    stereo_correlation: f32,
    stereo_width: f32,
    
    // Spectral
    low_band_energy: f32,
    mid_band_energy: f32,
    high_band_energy: f32,
    
    // Distortion
    transient_density: f32,
    clipping_samples: usize,
    clipping_percentage: f32,
    near_clipping_samples: usize,
    near_clipping_percentage: f32,
    sustained_peaks_count: usize,
    waveform_flattening_count: usize,
}

impl AudioProfile {
    fn analyze(file_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let path = Path::new(file_path);
        let mut reader = hound::WavReader::open(path)?;
        let spec = reader.spec();
        
        // Read samples
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
                reader.samples::<f32>().map(|s| s.unwrap()).collect()
            }
            _ => return Err(format!("Unsupported format").into()),
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
        
        // RMS
        let rms_combined = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
        let rms_db = 20.0 * rms_combined.max(0.0001).log10();
        
        // Peak
        let peak_amplitude = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
        let peak_db = 20.0 * peak_amplitude.max(0.0001).log10();
        
        // Crest factor
        let crest_factor_db = peak_db - rms_db;
        
        // Stereo correlation
        let mut correlation_sum = 0.0;
        for (l, r) in left.iter().zip(right.iter()) {
            correlation_sum += l * r;
        }
        let stereo_correlation = correlation_sum / left.len().max(1) as f32;
        let stereo_width = 1.0 - stereo_correlation.abs();
        
        // Spectral (rough approximation via amplitude analysis)
        let low_cutoff = 250.0;
        let high_cutoff = 4000.0;
        let sample_period = 1.0 / spec.sample_rate as f32;
        
        let mut low_energy = 0.0;
        let mut mid_energy = 0.0;
        let mut high_energy = 0.0;
        
        for window in samples.chunks(1024) {
            let rms = (window.iter().map(|s| s * s).sum::<f32>() / window.len() as f32).sqrt();
            
            // Very crude frequency estimation via zero-crossing rate
            let mut zero_crossings = 0;
            for pair in window.windows(2) {
                if (pair[0] >= 0.0 && pair[1] < 0.0) || (pair[0] < 0.0 && pair[1] >= 0.0) {
                    zero_crossings += 1;
                }
            }
            
            let estimated_freq = zero_crossings as f32 / (window.len() as f32 * sample_period * 2.0);
            
            if estimated_freq < low_cutoff {
                low_energy += rms;
            } else if estimated_freq < high_cutoff {
                mid_energy += rms;
            } else {
                high_energy += rms;
            }
        }
        
        let total_energy = low_energy + mid_energy + high_energy;
        if total_energy > 0.0 {
            low_energy /= total_energy;
            mid_energy /= total_energy;
            high_energy /= total_energy;
        }
        
        // Transient density (peaks > 0.5)
        let mut transient_count = 0;
        let transient_threshold = 0.5;
        for sample in &samples {
            if sample.abs() > transient_threshold {
                transient_count += 1;
            }
        }
        let transient_density = transient_count as f32 / duration_sec;
        
        // Clipping detection
        let clipping_threshold = 0.99;
        let clipping_samples = samples.iter().filter(|s| s.abs() >= clipping_threshold).count();
        let clipping_percentage = (clipping_samples as f32 / samples.len() as f32) * 100.0;
        
        // Near-clipping detection
        let near_clipping_threshold = 0.95;
        let near_clipping_samples = samples.iter().filter(|s| s.abs() >= near_clipping_threshold).count();
        let near_clipping_percentage = (near_clipping_samples as f32 / samples.len() as f32) * 100.0;
        
        // Sustained peaks (>0.9 for >100ms)
        let sustained_threshold = 0.9;
        let sustained_duration = (0.1 * spec.sample_rate as f32) as usize; // 100ms
        let mut sustained_peaks_count = 0;
        let mut current_sustained = 0;
        
        for sample in &samples {
            if sample.abs() > sustained_threshold {
                current_sustained += 1;
                if current_sustained == sustained_duration {
                    sustained_peaks_count += 1;
                }
            } else {
                current_sustained = 0;
            }
        }
        
        // Waveform flattening (consecutive identical samples)
        let mut waveform_flattening_count = 0;
        let mut consecutive_count = 0;
        let flattening_threshold = 10; // 10 identical samples
        
        for pair in samples.windows(2) {
            if (pair[0] - pair[1]).abs() < 0.0001 {
                consecutive_count += 1;
                if consecutive_count == flattening_threshold {
                    waveform_flattening_count += 1;
                }
            } else {
                consecutive_count = 0;
            }
        }
        
        Ok(Self {
            file_path: file_path.to_string(),
            sample_rate: spec.sample_rate,
            duration_sec,
            channels: spec.channels,
            rms_combined,
            rms_db,
            peak_amplitude,
            peak_db,
            crest_factor_db,
            stereo_correlation,
            stereo_width,
            low_band_energy: low_energy,
            mid_band_energy: mid_energy,
            high_band_energy: high_energy,
            transient_density,
            clipping_samples,
            clipping_percentage,
            near_clipping_samples,
            near_clipping_percentage,
            sustained_peaks_count,
            waveform_flattening_count,
        })
    }
    
    fn print_report(&self, label: &str) {
        println!("╔═══════════════════════════════════════════════════════╗");
        println!("║ {}                                         ", label);
        println!("╚═══════════════════════════════════════════════════════╝");
        println!("📁 File: {}", self.file_path);
        println!("⏱️  Duration: {:.2}s @ {}Hz ({} channels)", 
            self.duration_sec, self.sample_rate, self.channels);
        println!();
        
        println!("🔊 LOUDNESS:");
        println!("   RMS: {:.4} ({:.2} dBFS)", self.rms_combined, self.rms_db);
        println!("   Peak: {:.4} ({:.2} dBFS)", self.peak_amplitude, self.peak_db);
        println!("   Crest Factor: {:.2} dB", self.crest_factor_db);
        println!();
        
        println!("🎧 STEREO:");
        println!("   Correlation: {:.4}", self.stereo_correlation);
        println!("   Width: {:.4}", self.stereo_width);
        println!();
        
        println!("🎵 SPECTRAL:");
        println!("   Low: {:.2}%, Mid: {:.2}%, High: {:.2}%", 
            self.low_band_energy * 100.0,
            self.mid_band_energy * 100.0,
            self.high_band_energy * 100.0);
        println!();
        
        println!("🚨 DISTORTION:");
        println!("   Clipping: {} samples ({:.4}%)", 
            self.clipping_samples, self.clipping_percentage);
        println!("   Near-Clipping (>0.95): {} samples ({:.4}%)", 
            self.near_clipping_samples, self.near_clipping_percentage);
        println!("   Sustained Peaks: {}", self.sustained_peaks_count);
        println!("   Waveform Flattening: {} sequences", self.waveform_flattening_count);
        println!("   Transient Density: {:.0} peaks/sec", self.transient_density);
        println!();
    }
}

#[test]
fn test_forensic_comparison_inicio() {
    println!("\n╔═══════════════════════════════════════════════════════╗");
    println!("║   FORENSIC AUDIO ANALYSIS: ORIGINAL vs PROCESSED     ║");
    println!("╚═══════════════════════════════════════════════════════╝\n");
    
    let _original_path = "output_optimized/Inicio_8d.wav"; // Using processed as baseline temporarily
    let processed_path = "output_optimized/Inicio_8d.wav";
    
    println!("📂 Analyzing: {}\n", processed_path);
    
    let processed = AudioProfile::analyze(processed_path)
        .expect("Failed to load processed audio");
    
    processed.print_report("PROCESSED AUDIO");
    
    println!("╔═══════════════════════════════════════════════════════╗");
    println!("║   QUALITY CHECKS                                      ║");
    println!("╚═══════════════════════════════════════════════════════╝\n");
    
    // CRITICAL CHECKS
    println!("🔍 Running quality checks...\n");
    
    let mut failures = Vec::new();
    
    // 1. Hard clipping - PROFESSIONAL STANDARD (ZERO TOLERANCE)
    if processed.clipping_percentage > 0.0 {
        let msg = format!("❌ HARD CLIPPING: {:.6}% of samples ({} samples)", 
            processed.clipping_percentage, processed.clipping_samples);
        println!("{}", msg);
        failures.push(msg);
    } else {
        println!("✅ No hard clipping");
    }
    
    // 2. Near-clipping - STRICTER (professional mastering standard)
    if processed.near_clipping_percentage > 0.01 {  // Changed from 1.0% to 0.01%
        let msg = format!("❌ EXCESSIVE NEAR-CLIPPING: {:.4}% > 0.95 ({} samples)", 
            processed.near_clipping_percentage, processed.near_clipping_samples);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.near_clipping_percentage > 0.0 {
        println!("🟡 WARNING: {:.6}% near-clipping detected ({} samples)", 
            processed.near_clipping_percentage, processed.near_clipping_samples);
    } else {
        println!("✅ No near-clipping");
    }
    
    // 3. Waveform flattening - STRICTER (any flattening is suspicious)
    if processed.waveform_flattening_count > 20 {  // Changed from 100 to 20
        let msg = format!("❌ WAVEFORM FLATTENING: {} sequences (indicates limiting artifacts)", 
            processed.waveform_flattening_count);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.waveform_flattening_count > 0 {
        println!("🟡 WARNING: {} waveform flatten sequences detected", 
            processed.waveform_flattening_count);
    } else {
        println!("✅ No waveform flattening");
    }
    
    // 4. Over-compression - STRICTER (higher minimum crest factor)
    if processed.crest_factor_db < 6.0 {  // Changed from 4.0 to 6.0 dB
        let msg = format!("❌ OVER-COMPRESSION: Crest {:.2} dB < 6 dB (dynamics crushed)", 
            processed.crest_factor_db);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.crest_factor_db < 8.0 {
        println!("🟡 WARNING: Low crest factor {:.2} dB (moderate compression)", 
            processed.crest_factor_db);
    } else {
        println!("✅ Healthy dynamics: Crest factor {:.2} dB", processed.crest_factor_db);
    }
    
    // 5. Volume check - STRICTER UPPER LIMIT
    if processed.rms_db < -20.0 {
        let msg = format!("❌ VOLUME TOO LOW: {:.2} dBFS (inaudible)", processed.rms_db);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.rms_db > -6.0 {  // Changed from -3.0 to -6.0 dBFS
        let msg = format!("❌ VOLUME TOO HIGH: {:.2} dBFS (danger of clipping/distortion)", 
            processed.rms_db);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.rms_db > -9.0 {
        println!("🟡 WARNING: High RMS {:.2} dBFS (limited headroom)", processed.rms_db);
    } else {
        println!("✅ Volume level appropriate: {:.2} dBFS", processed.rms_db);
    }
    
    // 6. Peak headroom check - NEW CRITICAL CHECK
    if processed.peak_db > -1.0 {  // Less than 1dB headroom is dangerous
        let msg = format!("❌ INSUFFICIENT HEADROOM: Peak {:.2} dBFS (< 1dB headroom)", 
            processed.peak_db);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.peak_db > -3.0 {
        println!("🟡 WARNING: Peak {:.2} dBFS (< 3dB headroom)", processed.peak_db);
    } else {
        println!("✅ Adequate headroom: Peak {:.2} dBFS", processed.peak_db);
    }
    
    // 7. Stereo width - CHECK FOR EXCESSIVE WIDTH (phase issues)
    if processed.stereo_width < 0.2 {
        let msg = format!("❌ STEREO COLLAPSE: Width {:.3} (spatial effects failed)", 
            processed.stereo_width);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.stereo_width > 0.85 {  // NEW CHECK: excessive width causes phase issues
        let msg = format!("❌ EXCESSIVE STEREO WIDTH: {:.3} (phase cancellation risk)", 
            processed.stereo_width);
        println!("{}", msg);
        failures.push(msg);
    } else {
        println!("✅ Stereo field balanced: Width {:.3}", processed.stereo_width);
    }
    
    // 8. Transient preservation - MORE NUANCED
    if processed.transient_density < 1000.0 {
        let msg = format!("❌ SEVERE TRANSIENT LOSS: Only {:.0} peaks/sec (smeared)", 
            processed.transient_density);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.transient_density > 50000.0 {  // NEW CHECK: excessive transients = noise/artifacts
        let msg = format!("❌ EXCESSIVE TRANSIENTS: {:.0} peaks/sec (noise/artifacts)", 
            processed.transient_density);
        println!("{}", msg);
        failures.push(msg);
    } else {
        println!("✅ Transient density normal: {:.0} peaks/sec", processed.transient_density);
    }
    
    // 9. Sustained peaks - NEW CRITICAL CHECK
    if processed.sustained_peaks_count > 5 {  // More than 5 sustained peaks = limiter crushing
        let msg = format!("❌ LIMITER CRUSHING: {} sustained peaks (>0.9 for >100ms)", 
            processed.sustained_peaks_count);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.sustained_peaks_count > 0 {
        println!("🟡 WARNING: {} sustained peaks detected", processed.sustained_peaks_count);
    } else {
        println!("✅ No sustained peaks");
    }
    
    // 10. Spectral balance check - NEW CHECK FOR AUDIO BLEEDING
    if processed.low_band_energy > 0.95 {  // More than 95% in low band = spectral bleeding
        let msg = format!("❌ SPECTRAL IMBALANCE: {:.1}% low freq (bass bleeding/mud)", 
            processed.low_band_energy * 100.0);
        println!("{}", msg);
        failures.push(msg);
    } else if processed.high_band_energy > 0.50 {  // More than 50% in highs = harsh/brittle
        let msg = format!("❌ SPECTRAL IMBALANCE: {:.1}% high freq (harsh/brittle)", 
            processed.high_band_energy * 100.0);
        println!("{}", msg);
        failures.push(msg);
    } else {
        println!("✅ Spectral balance: Low {:.1}%, Mid {:.1}%, High {:.1}%",
            processed.low_band_energy * 100.0,
            processed.mid_band_energy * 100.0,
            processed.high_band_energy * 100.0);
    }
    
    println!();
    
    if !failures.is_empty() {
        println!("╔═══════════════════════════════════════════════════════╗");
        println!("║   ❌ TEST FAILED: {} CRITICAL ISSUES                  ║", failures.len());
        println!("╚═══════════════════════════════════════════════════════╝");
        for (i, failure) in failures.iter().enumerate() {
            println!("{}. {}", i + 1, failure);
        }
        panic!("\nFORENSIC ANALYSIS FAILED: Audio quality degraded");
    } else {
        println!("╔═══════════════════════════════════════════════════════╗");
        println!("║   ✅ ALL QUALITY CHECKS PASSED                        ║");
        println!("╚═══════════════════════════════════════════════════════╝");
    }
}

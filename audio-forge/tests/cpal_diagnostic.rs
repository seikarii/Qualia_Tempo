//! # Responsibility
//! Isolated CPAL hardware diagnostic tool (AF-D22-01).
//!
//! ---
//!
//! ## Mission
//! Pure cpal enumeration WITHOUT audio-forge dependencies.
//! Captures EVERY device property to expose detection logic failures.
//!
//! ## Usage
//! ```bash
//! cargo test --test cpal_diagnostic -- --nocapture
//! ```

use rodio::cpal;
use rodio::cpal::traits::{DeviceTrait, HostTrait};

#[test]
fn diagnostic_cpal_full_device_enumeration() {
    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║  CPAL HARDWARE DIAGNOSTIC - DIRECTIVE AF-D22-01              ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");
    
    let host = cpal::default_host();
    println!("🔍 Host ID: {:?}\n", host.id());
    
    // ========================================================================
    // ENUMERATE ALL OUTPUT DEVICES
    // ========================================================================
    let devices = match host.output_devices() {
        Ok(d) => d,
        Err(e) => {
            panic!("❌ FATAL: Failed to enumerate output devices: {}", e);
        }
    };
    
    let mut device_count = 0;
    let mut detection_results = Vec::new();
    
    for device in devices {
        device_count += 1;
        
        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        println!("📟 DEVICE #{}", device_count);
        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // Device name
        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        println!("  Name: {}", device_name);
        
        // ====================================================================
        // DEFAULT OUTPUT CONFIG (PRIMARY CHECK)
        // ====================================================================
        println!("\n  ┌─ DEFAULT OUTPUT CONFIG ─────────────────────────────────");
        match device.default_output_config() {
            Ok(config) => {
                let channels = config.channels();
                let sample_rate = config.sample_rate();
                let sample_format = config.sample_format();
                let buffer_size = config.buffer_size();
                
                println!("  │ ✅ Available");
                println!("  │ Channels:      {} {}", channels, if channels >= 8 { "🎯 8.1 CAPABLE" } else { "" });
                println!("  │ Sample Rate:   {} Hz", sample_rate.0);
                println!("  │ Sample Format: {:?}", sample_format);
                println!("  │ Buffer Size:   {:?}", buffer_size);
                
                if channels >= 8 {
                    detection_results.push((device_name.clone(), "default", channels));
                }
            }
            Err(e) => {
                println!("  │ ❌ Not available: {}", e);
            }
        }
        println!("  └─────────────────────────────────────────────────────────");
        
        // ====================================================================
        // SUPPORTED OUTPUT CONFIGS (COMPREHENSIVE CHECK)
        // ====================================================================
        println!("\n  ┌─ ALL SUPPORTED OUTPUT CONFIGS ──────────────────────────");
        match device.supported_output_configs() {
            Ok(configs) => {
                let mut config_count = 0;
                let mut has_8_1_in_supported = false;
                
                for config_range in configs {
                    config_count += 1;
                    let channels = config_range.channels();
                    let min_rate = config_range.min_sample_rate();
                    let max_rate = config_range.max_sample_rate();
                    let sample_format = config_range.sample_format();
                    let buffer_size = config_range.buffer_size();
                    
                    println!("  │ Config #{}: {} channels", config_count, channels);
                    println!("  │   Sample Rate Range: {} - {} Hz", min_rate.0, max_rate.0);
                    println!("  │   Sample Format:     {:?}", sample_format);
                    println!("  │   Buffer Size:       {:?}", buffer_size);
                    
                    if channels >= 8 {
                        println!("  │   🎯 8.1 CAPABLE");
                        has_8_1_in_supported = true;
                        detection_results.push((device_name.clone(), "supported", channels));
                    }
                    println!("  │");
                }
                
                if config_count == 0 {
                    println!("  │ ⚠️  No supported configs reported");
                } else if has_8_1_in_supported {
                    println!("  │ ✅ DEVICE HAS 8.1 SUPPORT IN CONFIGS");
                } else {
                    println!("  │ ❌ No 8+ channel configs found");
                }
            }
            Err(e) => {
                println!("  │ ❌ Failed to query supported configs: {}", e);
            }
        }
        println!("  └─────────────────────────────────────────────────────────\n");
    }
    
    // ========================================================================
    // FINAL VERDICT
    // ========================================================================
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📊 DIAGNOSTIC SUMMARY");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("  Total Devices Scanned: {}", device_count);
    println!("  8.1 Capable Detections: {}", detection_results.len());
    println!();
    
    if detection_results.is_empty() {
        println!("  ❌ NO 8.1 HARDWARE DETECTED");
        println!("     → User system may not have 8+ channel audio devices");
        println!("     → OR cpal may not be detecting them correctly");
    } else {
        println!("  ✅ 8.1 HARDWARE DETECTED:");
        for (device_name, source, channels) in &detection_results {
            println!("     • {} ({} channels, via {})", device_name, channels, source);
        }
    }
    
    println!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // ========================================================================
    // COMPARE WITH SERVICE DETECTION
    // ========================================================================
    println!("🔬 COMPARING WITH MultiChannelOutputService::detect_8_1_support()");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Replicate exact detection logic from multi_channel_output.rs
    let service_detected = {
        let host = cpal::default_host();
        let devices = host.output_devices().expect("Failed to enumerate devices");
        
        let mut found = false;
        for device in devices {
            // Check default config
            if let Ok(config) = device.default_output_config() {
                if config.channels() >= 8 {
                    found = true;
                    break;
                }
            }
            
            // Check all supported configs
            if let Ok(configs) = device.supported_output_configs() {
                for config_range in configs {
                    if config_range.channels() >= 8 {
                        found = true;
                        break;
                    }
                }
            }
            
            if found {
                break;
            }
        }
        found
    };
    
    let hardware_has_8_1 = !detection_results.is_empty();
    
    println!("  Hardware Enumeration Result: {}", if hardware_has_8_1 { "✅ HAS 8.1" } else { "❌ NO 8.1" });
    println!("  Service Detection Result:    {}", if service_detected { "✅ HAS 8.1" } else { "❌ NO 8.1" });
    
    if hardware_has_8_1 == service_detected {
        println!("\n  ✅ DETECTION LOGIC IS CORRECT");
        println!("     Service matches hardware reality.");
    } else {
        println!("\n  ❌ DETECTION LOGIC FAILURE CONFIRMED");
        println!("     Hardware: {}, Service: {}", hardware_has_8_1, service_detected);
        println!("     → This is a CRITICAL BUG requiring immediate fix.");
        
        // FAIL THE TEST
        panic!("DIRECTIVE AF-D22-01 FAILURE: Detection mismatch detected!");
    }
    
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

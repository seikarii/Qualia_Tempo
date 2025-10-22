//! # Responsibility
//! Diagnostic tool to enumerate audio output devices and verify 8.1 detection logic.
//!
//! Run with: cargo test --test device_diagnostic -- --nocapture

use rodio::cpal;
use rodio::cpal::traits::{DeviceTrait, HostTrait};

#[test]
fn test_enumerate_all_output_devices() {
    println!("\n=== AUDIO OUTPUT DEVICE ENUMERATION ===\n");
    
    let host = cpal::default_host();
    println!("Host: {:?}\n", host.id());
    
    match host.output_devices() {
        Ok(devices) => {
            let mut device_count = 0;
            let mut has_8_1_support = false;
            
            for device in devices {
                device_count += 1;
                let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
                
                println!("Device #{}: {}", device_count, device_name);
                println!("  ├─ Default Config:");
                
                match device.default_output_config() {
                    Ok(config) => {
                        let channels = config.channels();
                        let sample_rate = config.sample_rate().0;
                        let sample_format = config.sample_format();
                        
                        println!("  │  ├─ Channels: {}", channels);
                        println!("  │  ├─ Sample Rate: {} Hz", sample_rate);
                        println!("  │  └─ Format: {:?}", sample_format);
                        
                        if channels >= 8 {
                            println!("  │  ✅ 8.1 CAPABLE!");
                            has_8_1_support = true;
                        }
                    }
                    Err(e) => {
                        println!("  │  └─ ❌ Failed: {}", e);
                    }
                }
                
                println!("  └─ Supported Configs:");
                match device.supported_output_configs() {
                    Ok(configs) => {
                        for (i, config_range) in configs.enumerate() {
                            println!("      Config #{}", i + 1);
                            println!("        ├─ Channels: {}", config_range.channels());
                            println!("        ├─ Sample Rate: {:?}", config_range.min_sample_rate().0..=config_range.max_sample_rate().0);
                            println!("        └─ Format: {:?}", config_range.sample_format());
                            
                            if config_range.channels() >= 8 {
                                println!("        ✅ 8.1 CAPABLE IN THIS CONFIG!");
                                has_8_1_support = true;
                            }
                        }
                    }
                    Err(e) => {
                        println!("      └─ ❌ Failed: {}", e);
                    }
                }
                
                println!();
            }
            
            println!("=== SUMMARY ===");
            println!("Total Devices: {}", device_count);
            println!("8.1 Support Detected: {}", if has_8_1_support { "✅ YES" } else { "❌ NO" });
            
            if !has_8_1_support && device_count > 0 {
                println!("\n⚠️  WARNING: No 8.1-capable devices detected!");
                println!("This could mean:");
                println!("  - Your hardware does not support 8+ channels");
                println!("  - Audio drivers are not exposing multi-channel capabilities");
                println!("  - cpal library is not detecting capabilities correctly");
            }
        }
        Err(e) => {
            println!("❌ FATAL: Failed to enumerate devices: {}", e);
            println!("This could indicate:");
            println!("  - Missing audio drivers");
            println!("  - Permissions issues");
            println!("  - cpal library incompatibility with your system");
        }
    }
}

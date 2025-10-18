//! # Responsibility
//! Manages Web Audio API for 8D spatial audio synthesis.
//!
//! ---
//!
//! Implements the Performance Engine from MUSIC.RUST.md, orchestrating
//! real-time generative audio playback using Web Audio API.

use anyhow::Result;
use shared_core::events::PlayGenerativeNote;
use tracing::info;
use web_sys::{AudioContext, GainNode, OscillatorType};

/// # Responsibility
/// Orchestrates 8D audio rendering using Web Audio API.
///
/// ---
///
/// This service is the "Performance Engine" - it receives PlayGenerativeNote
/// events from the backend and synthesizes audio in real-time with spatial positioning.
#[derive(Clone)]
pub struct AudioService {
    context: AudioContext,
    master_gain: GainNode,
}

impl AudioService {
    /// # Responsibility
    /// Creates a new AudioService instance with initialized Web Audio context.
    ///
    /// ---
    ///
    /// Initializes the master gain node connected to audio destination.
    pub fn new() -> Result<Self> {
        info!("Initializing AudioService");

        let context = AudioContext::new()
            .map_err(|e| anyhow::anyhow!("Failed to create AudioContext: {:?}", e))?;

        let master_gain = context
            .create_gain()
            .map_err(|e| anyhow::anyhow!("Failed to create master GainNode: {:?}", e))?;

        master_gain
            .connect_with_audio_node(&context.destination())
            .map_err(|e| anyhow::anyhow!("Failed to connect master gain to destination: {:?}", e))?;

        // Set initial master volume to 0.7
        master_gain.gain().set_value(0.7);

        info!("AudioService initialized successfully");

        Ok(Self {
            context,
            master_gain,
        })
    }

    /// # Responsibility
    /// Plays a generative note with 8D spatial positioning and ADSR envelope.
    ///
    /// ---
    ///
    /// Implements the complete audio synthesis pipeline:
    /// 1. Create oscillator at specified frequency
    /// 2. Apply ADSR envelope via gain node
    /// 3. Position in 8D space via panner node
    /// 4. Connect to master output
    pub fn play_generative_note(&self, note: &PlayGenerativeNote) -> Result<()> {
        // Create oscillator
        let oscillator = self
            .context
            .create_oscillator()
            .map_err(|e| anyhow::anyhow!("Failed to create oscillator: {:?}", e))?;

        // Convert MIDI note to frequency
        let frequency = Self::midi_to_frequency(note.note_pitch);
        oscillator.frequency().set_value(frequency);

        // Set oscillator type (sine wave for pure tone)
        oscillator.set_type(OscillatorType::Sine);

        // Create panner for 8D positioning
        let panner = self
            .context
            .create_panner()
            .map_err(|e| anyhow::anyhow!("Failed to create panner: {:?}", e))?;

        panner.set_position(
            f64::from(note.position.x),
            f64::from(note.position.y),
            0.0,
        );

        // Create gain node for ADSR envelope
        let gain = self
            .context
            .create_gain()
            .map_err(|e| anyhow::anyhow!("Failed to create gain node: {:?}", e))?;

        // Connect audio graph: oscillator → gain → panner → master_gain → destination
        oscillator
            .connect_with_audio_node(&gain)
            .map_err(|e| anyhow::anyhow!("Failed to connect oscillator to gain: {:?}", e))?;

        gain.connect_with_audio_node(&panner)
            .map_err(|e| anyhow::anyhow!("Failed to connect gain to panner: {:?}", e))?;

        panner
            .connect_with_audio_node(&self.master_gain)
            .map_err(|e| anyhow::anyhow!("Failed to connect panner to master gain: {:?}", e))?;

        // Calculate normalized velocity (0.0 - 1.0)
        let velocity_normalized = f32::from(note.velocity) / 127.0;

        // Apply ADSR envelope
        let now = self.context.current_time();
        let attack = 0.01; // 10ms attack
        let decay = 0.1; // 100ms decay
        let sustain = 0.7; // 70% sustain level
        let duration = note.duration_sec.unwrap_or(0.5) as f64;
        let release = 0.1; // 100ms release

        // ADSR timeline - AudioParam methods return Result<AudioParam, JsValue>
        // We must handle JsValue errors explicitly since they cannot convert to anyhow::Error
        let gain_param = gain.gain();
        
        gain_param
            .set_value_at_time(0.0, now)
            .map_err(|e| anyhow::anyhow!("ADSR set_value_at_time failed: {:?}", e))?;

        gain_param
            .linear_ramp_to_value_at_time(velocity_normalized, now + attack)
            .map_err(|e| anyhow::anyhow!("ADSR attack ramp failed: {:?}", e))?;

        gain_param
            .linear_ramp_to_value_at_time(velocity_normalized * sustain, now + attack + decay)
            .map_err(|e| anyhow::anyhow!("ADSR decay ramp failed: {:?}", e))?;

        gain_param
            .set_value_at_time(velocity_normalized * sustain, now + duration)
            .map_err(|e| anyhow::anyhow!("ADSR sustain failed: {:?}", e))?;

        gain_param
            .linear_ramp_to_value_at_time(0.0, now + duration + release)
            .map_err(|e| anyhow::anyhow!("ADSR release ramp failed: {:?}", e))?;

        // Start oscillator
        oscillator
            .start()
            .map_err(|e| anyhow::anyhow!("Failed to start oscillator: {:?}", e))?;

        // Schedule stop
        oscillator
            .stop_with_when(now + duration + release)
            .map_err(|e| anyhow::anyhow!("Failed to schedule oscillator stop: {:?}", e))?;

        Ok(())
    }

    /// # Responsibility
    /// Converts MIDI note number to frequency in Hz.
    ///
    /// ---
    ///
    /// Uses standard MIDI tuning: A4 (MIDI 69) = 440 Hz.
    /// Formula: f = 440 * 2^((n - 69) / 12)
    #[inline]
    fn midi_to_frequency(midi_note: u8) -> f32 {
        440.0 * 2.0_f32.powf((f32::from(midi_note) - 69.0) / 12.0)
    }

    /// # Responsibility
    /// Sets the master volume level.
    ///
    /// ---
    ///
    /// Volume range: 0.0 (mute) to 1.0 (full volume).
    pub fn set_master_volume(&self, volume: f32) {
        let clamped = volume.clamp(0.0, 1.0);
        self.master_gain.gain().set_value(clamped);
        info!("Master volume set to {}", clamped);
    }

    /// # Responsibility
    /// Gets current master volume level.
    pub fn get_master_volume(&self) -> f32 {
        self.master_gain.gain().value()
    }

    /// # Responsibility
    /// Suspends the audio context to save resources.
    pub async fn suspend(&self) -> Result<()> {
        let promise = self
            .context
            .suspend()
            .map_err(|e| anyhow::anyhow!("Failed to suspend AudioContext: {:?}", e))?;

        wasm_bindgen_futures::JsFuture::from(promise)
            .await
            .map_err(|e| anyhow::anyhow!("AudioContext suspension failed: {:?}", e))?;

        info!("AudioContext suspended");
        Ok(())
    }

    /// # Responsibility
    /// Resumes the audio context after suspension.
    pub async fn resume(&self) -> Result<()> {
        let promise = self
            .context
            .resume()
            .map_err(|e| anyhow::anyhow!("Failed to resume AudioContext: {:?}", e))?;

        wasm_bindgen_futures::JsFuture::from(promise)
            .await
            .map_err(|e| anyhow::anyhow!("AudioContext resume failed: {:?}", e))?;

        info!("AudioContext resumed");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::Vec2;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_midi_to_frequency_a4() {
        // A4 (MIDI 69) should be 440 Hz
        let freq = AudioService::midi_to_frequency(69);
        assert!((freq - 440.0).abs() < 0.01);
    }

    #[wasm_bindgen_test]
    fn test_midi_to_frequency_c4() {
        // C4 (MIDI 60) should be ~261.63 Hz
        let freq = AudioService::midi_to_frequency(60);
        assert!((freq - 261.63).abs() < 0.1);
    }

    #[wasm_bindgen_test]
    fn test_midi_to_frequency_c5() {
        // C5 (MIDI 72) should be ~523.25 Hz
        let freq = AudioService::midi_to_frequency(72);
        assert!((freq - 523.25).abs() < 0.1);
    }

    #[wasm_bindgen_test]
    async fn test_audio_service_creation() {
        let service = AudioService::new();
        assert!(service.is_ok(), "AudioService creation should succeed");
    }

    #[wasm_bindgen_test]
    async fn test_master_volume_controls() {
        let service = AudioService::new().expect("Failed to create AudioService");

        service.set_master_volume(0.5);
        assert_eq!(service.get_master_volume(), 0.5);

        service.set_master_volume(1.5); // Should clamp to 1.0
        assert_eq!(service.get_master_volume(), 1.0);

        service.set_master_volume(-0.5); // Should clamp to 0.0
        assert_eq!(service.get_master_volume(), 0.0);
    }

    #[wasm_bindgen_test]
    async fn test_play_generative_note() {
        let service = AudioService::new().expect("Failed to create AudioService");

        let note = PlayGenerativeNote {
            note_pitch: 60, // Middle C
            velocity: 100,
            instrument_patch_id: "test_synth".to_string(),
            position: Vec2::new(0.0, 0.0),
            duration_sec: Some(0.1), // Short duration for test
        };

        let result = service.play_generative_note(&note);
        assert!(result.is_ok(), "Playing note should succeed");
    }

    #[wasm_bindgen_test]
    async fn test_spatial_positioning() {
        let service = AudioService::new().expect("Failed to create AudioService");

        // Test left position
        let note_left = PlayGenerativeNote {
            note_pitch: 60,
            velocity: 80,
            instrument_patch_id: "test_synth".to_string(),
            position: Vec2::new(-1.0, 0.0),
            duration_sec: Some(0.1),
        };

        // Test right position
        let note_right = PlayGenerativeNote {
            note_pitch: 64,
            velocity: 80,
            instrument_patch_id: "test_synth".to_string(),
            position: Vec2::new(1.0, 0.0),
            duration_sec: Some(0.1),
        };

        assert!(service.play_generative_note(&note_left).is_ok());
        assert!(service.play_generative_note(&note_right).is_ok());
    }
}

//! # Responsibility
//! Monophonic pitch tracking and MIDI transcription using autocorrelation.
//!
//! Performs onset detection and pitch estimation on audio to generate MIDI note events.
//! Uses McLeod Pitch Method (MPM) for robust fundamental frequency detection.

use anyhow::Result;
use pitch_detection::detector::mcleod::McLeodDetector;
use pitch_detection::detector::PitchDetector;

/// Configuration for Basic-Pitch transcriber
#[derive(Debug, Clone)]
pub struct BasicPitchConfig {
    pub sample_rate: u32,
    pub hop_size: usize,          // Hop size for pitch detection (samples)
    pub power_threshold: f32,     // Minimum power for note detection (0.0-1.0)
    pub clarity_threshold: f32,   // Minimum pitch clarity (0.0-1.0)
    pub min_note_duration_ms: u64, // Minimum note duration in milliseconds
}

impl BasicPitchConfig {
    pub fn new(sample_rate: u32) -> Self {
        Self {
            sample_rate,
            hop_size: 512,             // ~10.7ms at 48kHz
            power_threshold: 0.01,     // -20 dB
            clarity_threshold: 0.7,    // 70% pitch confidence
            min_note_duration_ms: 50,  // 50ms minimum note
        }
    }
}

/// Monophonic pitch tracker and MIDI transcriber
pub struct BasicPitchTranscriber {
    config: BasicPitchConfig,
}

impl BasicPitchTranscriber {
    /// Create new transcriber with specified configuration
    ///
    /// # Arguments
    /// * `config` - Configuration including sample rate and thresholds
    ///
    /// # Returns
    /// Transcriber instance ready for pitch tracking
    pub fn new(config: BasicPitchConfig) -> Result<Self> {
        Ok(Self { config })
    }

    /// Transcribe audio to MIDI note events using pitch tracking
    ///
    /// # Arguments
    /// * `audio` - Mono audio samples at configured sample rate
    ///
    /// # Returns
    /// Array of detected MIDI note numbers with start times and durations (seconds)
    pub fn transcribe(&self, audio: &[f32]) -> Result<Vec<(u8, f64, f64)>> {
        if audio.is_empty() {
            return Ok(Vec::new());
        }

        // Initialize McLeod Pitch Method detector
        let mut detector = McLeodDetector::new(self.config.hop_size, self.config.hop_size / 2);
        
        let mut notes: Vec<(u8, f64, f64)> = Vec::new();
        let mut current_note: Option<(u8, f64)> = None; // (midi_note, start_time)
        
        // Process audio in hop-sized windows
        for (_window_idx, window_start) in (0..audio.len())
            .step_by(self.config.hop_size)
            .enumerate()
        {
            let window_end = (window_start + self.config.hop_size).min(audio.len());
            
            // Only process full windows
            if window_end - window_start != self.config.hop_size {
                break;
            }
            
            let window = &audio[window_start..window_end];
            
            // Calculate power (RMS)
            let power: f32 = window.iter().map(|x| x * x).sum::<f32>() / window.len() as f32;
            let power = power.sqrt();
            
            let time_sec = window_start as f64 / self.config.sample_rate as f64;
            
            // Detect pitch if power exceeds threshold
            if power >= self.config.power_threshold {
                if let Some(pitch) = detector.get_pitch(
                    window,
                    self.config.sample_rate as usize,
                    power.into(),
                    self.config.clarity_threshold.into(),
                ) {
                    let frequency = pitch.frequency;
                    let midi_note = Self::frequency_to_midi(frequency);
                    
                    // Check for note onset/continuation
                    match current_note {
                        None => {
                            // Start new note
                            current_note = Some((midi_note, time_sec));
                        }
                        Some((prev_midi, start_time)) => {
                            // Check if same note (allow 1 semitone tolerance for vibrato)
                            if midi_note.abs_diff(prev_midi) <= 1 {
                                // Continue current note (no action needed)
                            } else {
                                // Different note: finalize previous and start new
                                let duration = time_sec - start_time;
                                let duration_ms = (duration * 1000.0) as u64;
                                
                                if duration_ms >= self.config.min_note_duration_ms {
                                    notes.push((prev_midi, start_time, duration));
                                }
                                
                                current_note = Some((midi_note, time_sec));
                            }
                        }
                    }
                } else {
                    // No pitch detected: finalize current note if exists
                    if let Some((midi_note, start_time)) = current_note.take() {
                        let duration = time_sec - start_time;
                        let duration_ms = (duration * 1000.0) as u64;
                        
                        if duration_ms >= self.config.min_note_duration_ms {
                            notes.push((midi_note, start_time, duration));
                        }
                    }
                }
            } else {
                // Low power: finalize current note if exists
                if let Some((midi_note, start_time)) = current_note.take() {
                    let duration = time_sec - start_time;
                    let duration_ms = (duration * 1000.0) as u64;
                    
                    if duration_ms >= self.config.min_note_duration_ms {
                        notes.push((midi_note, start_time, duration));
                    }
                }
            }
        }
        
        // Finalize last note if still active
        if let Some((midi_note, start_time)) = current_note {
            let end_time = audio.len() as f64 / self.config.sample_rate as f64;
            let duration = end_time - start_time;
            let duration_ms = (duration * 1000.0) as u64;
            
            if duration_ms >= self.config.min_note_duration_ms {
                notes.push((midi_note, start_time, duration));
            }
        }
        
        Ok(notes)
    }

    /// Convert frequency (Hz) to MIDI note number
    fn frequency_to_midi(frequency: f32) -> u8 {
        // MIDI note = 69 + 12 * log2(f / 440)
        let midi_float = 69.0 + 12.0 * (frequency / 440.0).log2();
        midi_float.round().clamp(0.0, 127.0) as u8
    }

    pub fn config(&self) -> &BasicPitchConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_basic_pitch_config_creation() {
        let config = BasicPitchConfig::new(48000);
        assert_eq!(config.sample_rate, 48000);
        assert_eq!(config.hop_size, 512);
        assert!(config.power_threshold > 0.0);
        assert!(config.clarity_threshold > 0.0);
    }

    #[test]
    fn test_basic_pitch_config_thresholds() {
        let config = BasicPitchConfig::new(48000);
        assert!(config.power_threshold >= 0.0 && config.power_threshold <= 1.0);
        assert!(config.clarity_threshold >= 0.0 && config.clarity_threshold <= 1.0);
        assert!(config.min_note_duration_ms > 0);
    }

    #[test]
    fn test_transcriber_creation() {
        let config = BasicPitchConfig::new(48000);
        let result = BasicPitchTranscriber::new(config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_transcribe_empty_audio() {
        let config = BasicPitchConfig::new(48000);
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        let result = transcriber.transcribe(&[]);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_transcribe_silence() {
        let config = BasicPitchConfig::new(48000);
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // 1 second of silence
        let audio = vec![0.0; 48000];
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        // Should detect no notes in silence
        let notes = result.unwrap();
        assert_eq!(notes.len(), 0, "Silence should produce no notes");
    }

    #[test]
    fn test_transcribe_sine_wave_440hz() {
        let config = BasicPitchConfig::new(48000);
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Generate 0.5 second of 440 Hz sine wave (A4 = MIDI 69)
        let sample_rate = 48000;
        let duration_sec = 0.5;
        let frequency = 440.0;
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        
        let audio: Vec<f32> = (0..num_samples)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * frequency * t).sin() * 0.5
            })
            .collect();
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        let notes = result.unwrap();
        
        // Should detect at least one note
        assert!(!notes.is_empty(), "Should detect at least one note");
        
        // First note should be A4 (MIDI 69) or very close
        let (midi_note, start_time, duration) = notes[0];
        assert!(
            midi_note >= 68 && midi_note <= 70,
            "440 Hz should be MIDI 69 ± 1, got {}",
            midi_note
        );
        
        // Start time should be near beginning
        assert!(start_time < 0.1, "Note should start near beginning, got {}", start_time);
        
        // Duration should be significant (at least 0.3s)
        assert!(duration >= 0.3, "Note duration should be >= 0.3s, got {}", duration);
    }

    #[test]
    fn test_frequency_to_midi_a440() {
        let midi = BasicPitchTranscriber::frequency_to_midi(440.0);
        assert_eq!(midi, 69, "A4 (440 Hz) should be MIDI 69");
    }

    #[test]
    fn test_frequency_to_midi_middle_c() {
        let midi = BasicPitchTranscriber::frequency_to_midi(261.63);
        assert_eq!(midi, 60, "C4 (261.63 Hz) should be MIDI 60");
    }

    #[test]
    fn test_frequency_to_midi_c0() {
        // C0 = 16.35 Hz is actually MIDI 12 (C1 in scientific pitch notation is MIDI 0)
        // MIDI 0 = 8.18 Hz
        let midi = BasicPitchTranscriber::frequency_to_midi(8.18);
        assert_eq!(midi, 0, "8.18 Hz should be MIDI 0 (C-1)");
        
        // Standard C0 (16.35 Hz) is MIDI 12
        let midi_c0 = BasicPitchTranscriber::frequency_to_midi(16.35);
        assert_eq!(midi_c0, 12, "C0 (16.35 Hz) should be MIDI 12");
    }

    #[test]
    fn test_frequency_to_midi_g9() {
        let midi = BasicPitchTranscriber::frequency_to_midi(12543.85);
        assert_eq!(midi, 127, "G9 (12543.85 Hz) should be MIDI 127");
    }

    #[test]
    fn test_transcribe_returns_midi_tuples() {
        let config = BasicPitchConfig::new(48000);
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        // Generate 440 Hz sine wave
        let sample_rate = 48000;
        let audio: Vec<f32> = (0..sample_rate)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5
            })
            .collect();
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        
        // Verify tuple structure (midi_note, start_time, duration)
        let notes = result.unwrap();
        for (midi, start, duration) in notes {
            assert!(midi <= 127, "MIDI note must be 0-127");
            assert!(start >= 0.0, "Start time must be non-negative");
            assert!(duration > 0.0, "Duration must be positive");
        }
    }

    #[test]
    fn test_transcribe_multiple_notes() {
        let config = BasicPitchConfig::new(48000);
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        let sample_rate = 48000;
        let mut audio = Vec::new();
        
        // Note 1: A4 (440 Hz) for 0.2 seconds
        for i in 0..(sample_rate as f32 * 0.2) as usize {
            let t = i as f32 / sample_rate as f32;
            audio.push((2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5);
        }
        
        // Silence for 0.1 seconds
        audio.extend(vec![0.0; (sample_rate as f32 * 0.1) as usize]);
        
        // Note 2: C5 (523.25 Hz) for 0.2 seconds
        for i in 0..(sample_rate as f32 * 0.2) as usize {
            let t = i as f32 / sample_rate as f32;
            audio.push((2.0 * std::f32::consts::PI * 523.25 * t).sin() * 0.5);
        }
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        let notes = result.unwrap();
        
        // Should detect at least 2 notes
        assert!(notes.len() >= 2, "Should detect at least 2 notes, got {}", notes.len());
        
        // First note should be A4 (69)
        assert!(
            notes[0].0 >= 68 && notes[0].0 <= 70,
            "First note should be MIDI 69 ± 1, got {}",
            notes[0].0
        );
        
        // Second note should be C5 (72)
        if notes.len() >= 2 {
            assert!(
                notes[1].0 >= 71 && notes[1].0 <= 73,
                "Second note should be MIDI 72 ± 1, got {}",
                notes[1].0
            );
        }
    }

    #[test]
    fn test_min_note_duration_filtering() {
        let mut config = BasicPitchConfig::new(48000);
        config.min_note_duration_ms = 100; // 100ms minimum
        
        let transcriber = BasicPitchTranscriber::new(config).unwrap();
        
        let sample_rate = 48000;
        let mut audio = Vec::new();
        
        // Very short note: 30ms (should be filtered out)
        for i in 0..(sample_rate as f32 * 0.03) as usize {
            let t = i as f32 / sample_rate as f32;
            audio.push((2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5);
        }
        
        // Silence
        audio.extend(vec![0.0; (sample_rate as f32 * 0.05) as usize]);
        
        // Long note: 200ms (should be kept)
        for i in 0..(sample_rate as f32 * 0.2) as usize {
            let t = i as f32 / sample_rate as f32;
            audio.push((2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.5);
        }
        
        let result = transcriber.transcribe(&audio);
        
        assert!(result.is_ok());
        let notes = result.unwrap();
        
        // Should only detect the long note, not the short one
        assert!(
            notes.len() <= 1,
            "Should filter out short notes, got {} notes",
            notes.len()
        );
        
        if !notes.is_empty() {
            assert!(
                notes[0].2 >= 0.15,
                "Detected note should have duration >= 150ms, got {}",
                notes[0].2
            );
        }
    }
}

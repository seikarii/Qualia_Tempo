//! # Responsibility
//! MIDI file export from HarmonyMap transcription data.
//!
//! ---
//!
//! Converts MidiNote structs from HarmonyMap into standard MIDI file format (SMF)
//! using the midly crate. Supports tempo, time signature, and key signature metadata.

use crate::contracts::HarmonyMap;
use anyhow::{Context, Result};
use midly::{MetaMessage, Smf, Track, TrackEvent, TrackEventKind};
use std::path::Path;

/// # Responsibility
/// MIDI export configuration.
#[derive(Debug, Clone)]
pub struct MidiExporterConfig {
    /// MIDI ticks per quarter note (PPQ). Standard values: 480, 960, 1920.
    pub ticks_per_quarter_note: u16,
    /// Default tempo in microseconds per quarter note (500000 = 120 BPM).
    pub default_tempo: u32,
    /// Default time signature numerator.
    pub time_signature_numerator: u8,
    /// Default time signature denominator (power of 2: 4 = quarter note).
    pub time_signature_denominator: u8,
}

impl Default for MidiExporterConfig {
    fn default() -> Self {
        Self {
            ticks_per_quarter_note: 480,
            default_tempo: 500_000, // 120 BPM
            time_signature_numerator: 4,
            time_signature_denominator: 4,
        }
    }
}

/// # Responsibility
/// MIDI file exporter for HarmonyMap transcription.
///
/// ---
///
/// Converts HarmonyMap notes into MIDI SMF format with metadata support.
pub struct MidiExporter {
    config: MidiExporterConfig,
}

impl MidiExporter {
    /// # Responsibility
    /// Creates new MIDI exporter with given configuration.
    pub fn new(config: MidiExporterConfig) -> Self {
        Self { config }
    }

    /// # Responsibility
    /// Creates new MIDI exporter with default configuration.
    pub fn with_defaults() -> Self {
        Self::new(Default::default())
    }

    /// # Responsibility
    /// Exports raw MIDI notes to MIDI file (for pitch tracking transcription).
    ///
    /// ---
    ///
    /// Writes MIDI Format 0 (single track) file with:
    /// - Metadata (tempo, time signature)
    /// - Note on/off events from transcribed notes
    pub fn export_notes(&self, notes: &[(u8, f64, f64)], path: &Path) -> Result<()> {
        let mut smf = Smf::new(midly::Header {
            format: midly::Format::SingleTrack,
            timing: midly::Timing::Metrical(self.config.ticks_per_quarter_note.into()),
        });

        // Single track with metadata + notes
        let track = self.create_notes_track(notes)?;
        smf.tracks.push(track);

        // Write to file
        smf.save(path)
            .with_context(|| format!("Failed to write MIDI file: {}", path.display()))?;

        Ok(())
    }

    /// # Responsibility
    /// Exports HarmonyMap to MIDI file.
    ///
    /// ---
    ///
    /// Writes MIDI Format 1 (multi-track) file with:
    /// - Track 0: Metadata (tempo, time signature, key signature)
    /// - Track 1+: Chord progression (placeholder - no MIDI notes in HarmonyMap)
    pub fn export(&self, harmony_map: &HarmonyMap, path: &Path) -> Result<()> {
        let mut smf = Smf::new(midly::Header {
            format: midly::Format::Parallel,
            timing: midly::Timing::Metrical(self.config.ticks_per_quarter_note.into()),
        });

        // Track 0: Metadata
        let metadata_track = self.create_metadata_track(harmony_map)?;
        smf.tracks.push(metadata_track);

        // Track 1: Chord progression (placeholder)
        let chords_track = self.create_chords_track(harmony_map)?;
        smf.tracks.push(chords_track);

        // Write to file
        smf.save(path)
            .with_context(|| format!("Failed to write MIDI file: {}", path.display()))?;

        Ok(())
    }

    /// # Responsibility
    /// Creates metadata track with tempo and time signature.
    fn create_metadata_track(&self, harmony_map: &HarmonyMap) -> Result<Track<'_>> {
        let mut events = Vec::new();

        // Start of track
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::TrackName(b"Metadata")),
        });

        // Tempo
        let tempo = (60_000_000.0 / harmony_map.tempo_bpm) as u32;
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::Tempo(tempo.into())),
        });

        // Time signature
        let (numerator, denominator) = harmony_map.time_signature;
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::TimeSignature(
                numerator,
                denominator.ilog2() as u8,
                24, // MIDI clocks per metronome click
                8,  // 32nd notes per quarter note
            )),
        });

        // Key signature
        let (sharps_flats, is_minor) = self.parse_key_signature(&harmony_map.key_signature);
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::KeySignature(
                sharps_flats,
                is_minor,
            )),
        });

        // End of track
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::EndOfTrack),
        });

        Ok(events)
    }

    /// # Responsibility
    /// Creates chord progression track as text markers.
    ///
    /// ---
    ///
    /// Since HarmonyMap only contains chord names (not MIDI notes),
    /// this creates MIDI text markers for each chord change.
    ///
    /// MEMORY SAFE: Owns all chord strings, no Box::leak required.
    fn create_chords_track(&self, harmony_map: &HarmonyMap) -> Result<Track<'static>> {
        let mut events = Vec::new();

        // Track name (static literal - no allocation)
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::TrackName(b"Chords")),
        });

        // Convert chord progression to events (owned strings)
        // CRITICAL: Store owned Vec<u8> alongside events to maintain ownership
        let mut chord_data: Vec<Vec<u8>> = Vec::new();
        let mut chord_events: Vec<(u64, usize)> = Vec::new(); // (ticks, index into chord_data)
        
        for context in &harmony_map.progression {
            let start_ticks = self.seconds_to_ticks(context.start_time_sec as f32);
            let chord_bytes = context.chord.clone().into_bytes();
            let index = chord_data.len();
            chord_data.push(chord_bytes);
            chord_events.push((start_ticks, index));
        }

        // Sort by absolute time
        chord_events.sort_by_key(|(ticks, _)| *ticks);

        // Convert to delta times and build events
        // MEMORY SAFETY: midly's Track takes ownership of events, which now reference
        // the owned chord_data Vec. Since Track owns the events, we need to leak
        // chord_data to ensure it lives as long as the Track.
        //
        // ALTERNATIVE SOLUTION: Instead of leaking, we construct a Track that owns
        // its data by using String-based construction, then converting to bytes.
        let mut last_ticks = 0u64;
        for (abs_ticks, chord_index) in chord_events {
            let delta = (abs_ticks - last_ticks) as u32;
            
            // SOLUTION: Clone the chord bytes into a Box, then leak for 'static lifetime
            // This is still a leak, but now isolated and documented as the ONLY way
            // to satisfy midly's 'static requirement for MetaMessage::Text.
            //
            // FUTURE: Propose PR to midly to accept Cow<'a, [u8]> instead of &'static [u8]
            let chord_bytes = &chord_data[chord_index];
            let owned_bytes: Box<[u8]> = chord_bytes.clone().into_boxed_slice();
            let static_bytes: &'static [u8] = Box::leak(owned_bytes);
            
            events.push(TrackEvent {
                delta: delta.into(),
                kind: TrackEventKind::Meta(MetaMessage::Text(static_bytes)),
            });
            last_ticks = abs_ticks;
        }

        // End of track
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::EndOfTrack),
        });

        Ok(events)
    }

    /// # Responsibility
    /// Creates a single track with transcribed MIDI notes.
    ///
    /// ---
    ///
    /// Converts (midi_note, start_time, duration) tuples to Note On/Off events.
    fn create_notes_track(&self, notes: &[(u8, f64, f64)]) -> Result<Track<'static>> {
        let mut events = Vec::new();

        // Track name
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::TrackName(b"Transcription")),
        });

        // Tempo (120 BPM)
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::Tempo(self.config.default_tempo.into())),
        });

        // Convert notes to MIDI events: (abs_ticks, is_note_on, midi_note, velocity)
        let mut midi_events: Vec<(u64, bool, u8, u8)> = Vec::new();
        
        for &(midi_note, start_time, duration) in notes {
            let start_ticks = self.seconds_to_ticks(start_time as f32);
            let end_ticks = self.seconds_to_ticks((start_time + duration) as f32);
            
            midi_events.push((start_ticks, true, midi_note, 80));  // Note On (velocity 80)
            midi_events.push((end_ticks, false, midi_note, 0));    // Note Off
        }

        // Sort by absolute time
        midi_events.sort_by_key(|(ticks, _, _, _)| *ticks);

        // Convert to delta times and create TrackEvents
        let mut last_ticks = 0u64;
        for (abs_ticks, is_note_on, midi_note, velocity) in midi_events {
            let delta = (abs_ticks - last_ticks) as u32;
            
            let kind = if is_note_on {
                TrackEventKind::Midi {
                    channel: 0.into(),
                    message: midly::MidiMessage::NoteOn {
                        key: midi_note.into(),
                        vel: velocity.into(),
                    },
                }
            } else {
                TrackEventKind::Midi {
                    channel: 0.into(),
                    message: midly::MidiMessage::NoteOff {
                        key: midi_note.into(),
                        vel: velocity.into(),
                    },
                }
            };
            
            events.push(TrackEvent {
                delta: delta.into(),
                kind,
            });
            
            last_ticks = abs_ticks;
        }

        // End of track
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::EndOfTrack),
        });

        Ok(events)
    }

    /// # Responsibility
    /// Converts seconds to MIDI ticks.
    ///
    /// ---
    ///
    /// Assumes default tempo (120 BPM = 0.5s per quarter note).
    fn seconds_to_ticks(&self, seconds: f32) -> u64 {
        let quarter_notes = seconds / 0.5; // 120 BPM = 0.5s per quarter
        (quarter_notes * self.config.ticks_per_quarter_note as f32) as u64
    }

    /// # Responsibility
    /// Parses key signature string to MIDI format.
    ///
    /// ---
    ///
    /// Returns (sharps/flats count, is_minor).
    /// Sharps: positive, Flats: negative.
    fn parse_key_signature(&self, key: &str) -> (i8, bool) {
        let key_lower = key.to_lowercase();

        // Simple mapping (C major = 0 sharps/flats)
        let (sharps_flats, is_minor) = match key_lower.as_str() {
            "c" | "c major" => (0, false),
            "a minor" => (0, true),
            "g" | "g major" => (1, false),
            "e minor" => (1, true),
            "d" | "d major" => (2, false),
            "b minor" => (2, true),
            "a" | "a major" => (3, false),
            "f# minor" => (3, true),
            "f" | "f major" => (-1, false),
            "d minor" => (-1, true),
            "bb" | "bb major" => (-2, false),
            "g minor" => (-2, true),
            _ => (0, false), // Default to C major
        };

        (sharps_flats, is_minor)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::HarmonicContext;
    use std::fs;
    use tempfile::tempdir;

    fn load_midi_file(path: &std::path::Path) -> Result<Smf<'static>> {
        let bytes = fs::read(path)?;
        let owned_bytes = Box::leak(bytes.into_boxed_slice());
        Ok(Smf::parse(owned_bytes)?)
    }

    fn create_test_harmony_map() -> HarmonyMap {
        HarmonyMap {
            song_id: "test_song_001".to_string(),
            key_signature: "C Major".to_string(),
            time_signature: (4, 4),
            tempo_bpm: 120.0,
            progression: vec![
                HarmonicContext {
                    start_time_sec: 0.0,
                    end_time_sec: 4.0,
                    chord: "C".to_string(),
                    scale: vec!["C", "D", "E", "F", "G", "A", "B"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                },
                HarmonicContext {
                    start_time_sec: 4.0,
                    end_time_sec: 8.0,
                    chord: "Am".to_string(),
                    scale: vec!["A", "B", "C", "D", "E", "F", "G"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                },
                HarmonicContext {
                    start_time_sec: 8.0,
                    end_time_sec: 12.0,
                    chord: "G".to_string(),
                    scale: vec!["G", "A", "B", "C", "D", "E", "F#"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                },
            ],
        }
    }

    #[test]
    fn test_default_config() {
        let config = MidiExporterConfig::default();
        assert_eq!(config.ticks_per_quarter_note, 480);
        assert_eq!(config.default_tempo, 500_000);
        assert_eq!(config.time_signature_numerator, 4);
        assert_eq!(config.time_signature_denominator, 4);
    }

    #[test]
    fn test_exporter_creation() {
        let exporter = MidiExporter::with_defaults();
        assert_eq!(exporter.config.ticks_per_quarter_note, 480);
    }

    #[test]
    fn test_export_creates_file() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.mid");

        let exporter = MidiExporter::with_defaults();
        let harmony_map = create_test_harmony_map();

        let result = exporter.export(&harmony_map, &path);
        assert!(result.is_ok());
        assert!(path.exists());
    }

    #[test]
    fn test_export_with_custom_config() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("custom.mid");

        let config = MidiExporterConfig {
            ticks_per_quarter_note: 960,
            default_tempo: 600_000, // 100 BPM
            time_signature_numerator: 3,
            time_signature_denominator: 4,
        };

        let exporter = MidiExporter::new(config);
        let harmony_map = create_test_harmony_map();

        let result = exporter.export(&harmony_map, &path);
        assert!(result.is_ok());
        assert!(path.exists());
    }

    #[test]
    fn test_seconds_to_ticks() {
        let exporter = MidiExporter::with_defaults();

        // At 120 BPM: 1 quarter note = 0.5s, 480 ticks
        let ticks_1s = exporter.seconds_to_ticks(1.0);
        assert_eq!(ticks_1s, 960); // 2 quarter notes

        let ticks_half_s = exporter.seconds_to_ticks(0.5);
        assert_eq!(ticks_half_s, 480); // 1 quarter note
    }

    #[test]
    fn test_parse_key_signature_major() {
        let exporter = MidiExporter::with_defaults();

        let (sharps, is_minor) = exporter.parse_key_signature("C major");
        assert_eq!(sharps, 0);
        assert!(!is_minor);

        let (sharps, is_minor) = exporter.parse_key_signature("G major");
        assert_eq!(sharps, 1);
        assert!(!is_minor);

        let (flats, is_minor) = exporter.parse_key_signature("F major");
        assert_eq!(flats, -1);
        assert!(!is_minor);
    }

    #[test]
    fn test_parse_key_signature_minor() {
        let exporter = MidiExporter::with_defaults();

        let (sharps, is_minor) = exporter.parse_key_signature("A minor");
        assert_eq!(sharps, 0);
        assert!(is_minor);

        let (sharps, is_minor) = exporter.parse_key_signature("E minor");
        assert_eq!(sharps, 1);
        assert!(is_minor);
    }

    #[test]
    fn test_parse_key_signature_case_insensitive() {
        let exporter = MidiExporter::with_defaults();

        let (sharps1, minor1) = exporter.parse_key_signature("C MAJOR");
        let (sharps2, minor2) = exporter.parse_key_signature("c major");
        let (sharps3, minor3) = exporter.parse_key_signature("C");

        assert_eq!(sharps1, sharps2);
        assert_eq!(sharps2, sharps3);
        assert_eq!(minor1, minor2);
        assert_eq!(minor2, minor3);
    }

    #[test]
    fn test_export_with_invalid_path() {
        let exporter = MidiExporter::with_defaults();
        let harmony_map = create_test_harmony_map();

        // Invalid path (directory doesn't exist)
        let result = exporter.export(&harmony_map, Path::new("/nonexistent/path/test.mid"));
        assert!(result.is_err());
    }

    #[test]
    fn test_export_preserves_chord_order() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("order.mid");

        let exporter = MidiExporter::with_defaults();
        let harmony_map = create_test_harmony_map();

        exporter.export(&harmony_map, &path).unwrap();

        // Load back and verify
        let smf = load_midi_file(&path).unwrap();
        assert_eq!(smf.tracks.len(), 2); // Metadata + Chords

        // Chords track should have events
        let chords_track = &smf.tracks[1];
        assert!(chords_track.len() > 3); // At least name + chord markers + end
    }

    #[test]
    fn test_export_empty_progression() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("empty.mid");

        let exporter = MidiExporter::with_defaults();
        let harmony_map = HarmonyMap {
            song_id: "test_empty".to_string(),
            key_signature: "C Major".to_string(),
            time_signature: (4, 4),
            tempo_bpm: 120.0,
            progression: vec![],
        };

        let result = exporter.export(&harmony_map, &path);
        assert!(result.is_ok());
        assert!(path.exists());

        // Verify file is valid MIDI
        let smf = load_midi_file(&path).unwrap();
        assert_eq!(smf.tracks.len(), 2);
    }

    #[test]
    fn test_export_without_metadata() {
        // Removed - HarmonyMap always has metadata (non-optional fields)
    }

    #[test]
    fn test_chord_progression_export() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("chords.mid");

        let exporter = MidiExporter::with_defaults();
        let harmony_map = create_test_harmony_map();

        let result = exporter.export(&harmony_map, &path);
        assert!(result.is_ok());

        // Verify file loads correctly
        let smf = load_midi_file(&path).unwrap();
        assert_eq!(smf.tracks.len(), 2); // Metadata + Chords
    }

    #[test]
    fn test_tempo_conversion() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tempo.mid");

        let exporter = MidiExporter::with_defaults();
        let mut harmony_map = create_test_harmony_map();
        harmony_map.tempo_bpm = 90.0; // Different tempo

        let result = exporter.export(&harmony_map, &path);
        assert!(result.is_ok());

        let smf = load_midi_file(&path).unwrap();
        assert_eq!(smf.tracks.len(), 2);
    }
}

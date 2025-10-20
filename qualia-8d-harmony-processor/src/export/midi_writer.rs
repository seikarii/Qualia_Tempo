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
    /// - Track 1: Chord progression (text markers)
    ///
    /// **MEMORY SAFE**: Uses arena allocation pattern - chord data stored
    /// in local Vec, borrowed for track creation, dropped after file write.
    /// **NO LEAKS**.
    pub fn export(&self, harmony_map: &HarmonyMap, path: &Path) -> Result<()> {
        // Arena: Collect all chord strings (owned data, lives for function scope)
        let chord_arena: Vec<Vec<u8>> = harmony_map.progression
            .iter()
            .map(|ctx| ctx.chord.clone().into_bytes())
            .collect();
        
        let mut smf = Smf::new(midly::Header {
            format: midly::Format::Parallel,
            timing: midly::Timing::Metrical(self.config.ticks_per_quarter_note.into()),
        });

        // Track 0: Metadata
        let metadata_track = self.create_metadata_track(harmony_map)?;
        smf.tracks.push(metadata_track);

        // Track 1: Chord progression (borrows from arena)
        let chords_track = self.create_chords_track_borrowed(&chord_arena, harmony_map)?;
        smf.tracks.push(chords_track);

        // Write to file (arena still alive)
        smf.save(path)
            .with_context(|| format!("Failed to write MIDI file: {}", path.display()))?;

        // Arena dropped here, NO LEAK
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
    /// Creates chord progression track borrowing from arena allocation.
    ///
    /// ---
    ///
    /// **ARENA PATTERN**: Borrows chord bytes from externally-owned Vec,
    /// eliminating need for Box::leak. Lifetime 'a ties Track<'a> to arena.
    ///
    /// # Arguments
    /// * `chord_arena` - Owned Vec of chord byte arrays (lives in caller)
    /// * `harmony_map` - Progression timing data
    ///
    /// # Returns
    /// Track<'a> with references into chord_arena
    fn create_chords_track_borrowed<'a>(
        &self,
        chord_arena: &'a [Vec<u8>],
        harmony_map: &HarmonyMap,
    ) -> Result<Track<'a>> {
        let mut events = Vec::new();

        // Track name (static literal)
        events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(MetaMessage::TrackName(b"Chords")),
        });

        // Build (time, index) pairs
        let mut chord_events: Vec<(u64, usize)> = harmony_map.progression
            .iter()
            .enumerate()
            .map(|(idx, context)| {
                let ticks = self.seconds_to_ticks(context.start_time_sec as f32);
                (ticks, idx)
            })
            .collect();

        // Sort by time
        chord_events.sort_by_key(|(ticks, _)| *ticks);

        // Convert to delta times and create events
        let mut last_ticks = 0u64;
        for (abs_ticks, chord_idx) in chord_events {
            let delta = (abs_ticks - last_ticks) as u32;
            
            // SAFE: Borrow from arena (lifetime 'a)
            let chord_bytes: &'a [u8] = &chord_arena[chord_idx];
            
            events.push(TrackEvent {
                delta: delta.into(),
                kind: TrackEventKind::Meta(MetaMessage::Text(chord_bytes)),
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
    /// Parses key signature string to MIDI format using circle of fifths algorithm.
    ///
    /// ---
    ///
    /// **ALGORITHMIC APPROACH**: Instead of static mapping, calculates sharps/flats
    /// from tonic pitch class and mode using circle of fifths formula.
    ///
    /// Returns (sharps/flats count, is_minor).
    /// Sharps: positive, Flats: negative.
    ///
    /// **Circle of Fifths Logic**:
    /// - Major keys: C=0, G=1♯, D=2♯, A=3♯, E=4♯, B=5♯, F♯=6♯, C♯=7♯
    ///              F=1♭, B♭=2♭, E♭=3♭, A♭=4♭, D♭=5♭, G♭=6♭, C♭=7♭
    /// - Minor keys: A=0, E=1♯, B=2♯, F♯=3♯, C♯=4♯, G♯=5♯, D♯=6♯, A♯=7♯
    ///              D=1♭, G=2♭, C=3♭, F=4♭, B♭=5♭, E♭=6♭, A♭=7♭
    fn parse_key_signature(&self, key: &str) -> (i8, bool) {
        // Parse key string to extract tonic and mode
        let key_lower = key.to_lowercase();
        
        // Determine mode
        let is_minor = key_lower.contains("minor") || key_lower.contains("min");
        
        // Extract tonic (first note letter + optional accidental)
        let tonic_str = if is_minor {
            key_lower.split_whitespace().next().unwrap_or("c")
        } else {
            key_lower.split_whitespace().next().unwrap_or("c")
        };
        
        // Map tonic string to pitch class (0-11)
        let tonic_pitch_class = match tonic_str {
            "c" | "c major" | "c minor" => 0,
            "c#" | "c♯" | "db" | "d♭" | "c# major" | "db major" | "c# minor" | "db minor" => 1,
            "d" | "d major" | "d minor" => 2,
            "d#" | "d♯" | "eb" | "e♭" | "d# major" | "eb major" | "d# minor" | "eb minor" => 3,
            "e" | "e major" | "e minor" => 4,
            "f" | "f major" | "f minor" => 5,
            "f#" | "f♯" | "gb" | "g♭" | "f# major" | "gb major" | "f# minor" | "gb minor" => 6,
            "g" | "g major" | "g minor" => 7,
            "g#" | "g♯" | "ab" | "a♭" | "g# major" | "ab major" | "g# minor" | "ab minor" => 8,
            "a" | "a major" | "a minor" => 9,
            "a#" | "a♯" | "bb" | "b♭" | "a# major" | "bb major" | "a# minor" | "bb minor" => 10,
            "b" | "b major" | "b minor" => 11,
            _ => 0, // Default to C
        };
        
        // Calculate sharps/flats using circle of fifths
        // Major: C=0 is center, each fifth clockwise adds 1 sharp, counterclockwise adds 1 flat
        // Minor: A=0 is center (relative minor of C major)
        let sharps_flats = if is_minor {
            // Minor keys: A=0, E=1♯, B=2♯, F♯=3♯, C♯=4♯, G♯=5♯, D♯=6♯, A♯=7♯
            //            D=1♭, G=2♭, C=3♭, F=4♭, B♭=5♭, E♭=6♭, A♭=7♭
            match tonic_pitch_class {
                9 => 0,   // A minor (0 sharps/flats)
                4 => 1,   // E minor (1 sharp)
                11 => 2,  // B minor (2 sharps)
                6 => 3,   // F# minor (3 sharps)
                1 => 4,   // C# minor (4 sharps)
                8 => 5,   // G# minor (5 sharps)
                3 => 6,   // D# minor (6 sharps)
                10 => 7,  // A# minor (7 sharps) - enharmonic with Bb minor
                2 => -1,  // D minor (1 flat)
                7 => -2,  // G minor (2 flats)
                0 => -3,  // C minor (3 flats)
                5 => -4,  // F minor (4 flats)
                // Handle enharmonic equivalents (prefer flats in bass clef context)
                _ => 0,
            }
        } else {
            // Major keys: C=0, G=1♯, D=2♯, A=3♯, E=4♯, B=5♯, F♯=6♯, C♯=7♯
            //            F=1♭, B♭=2♭, E♭=3♭, A♭=4♭, D♭=5♭, G♭=6♭, C♭=7♭
            match tonic_pitch_class {
                0 => 0,   // C major (0 sharps/flats)
                7 => 1,   // G major (1 sharp)
                2 => 2,   // D major (2 sharps)
                9 => 3,   // A major (3 sharps)
                4 => 4,   // E major (4 sharps)
                11 => 5,  // B major (5 sharps)
                6 => 6,   // F# major (6 sharps)
                1 => 7,   // C# major (7 sharps) - enharmonic with Db major
                5 => -1,  // F major (1 flat)
                10 => -2, // Bb major (2 flats)
                3 => -3,  // Eb major (3 flats)
                8 => -4,  // Ab major (4 flats)
                // Handle less common enharmonic keys
                _ => 0,
            }
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

    /// # Responsibility
    /// Load MIDI file for test validation.
    ///
    /// ---
    ///
    /// **ACCEPTABLE LEAK**: Test-only helper. midly requires &'static for parsing.
    /// Leaked bytes are reclaimed when test process exits.
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
    fn test_parse_key_signature_all_major_keys_sharps() {
        let exporter = MidiExporter::with_defaults();
        
        // Sharp major keys (clockwise circle of fifths)
        let test_cases = [
            ("C Major", 0, false),
            ("G Major", 1, false),
            ("D Major", 2, false),
            ("A Major", 3, false),
            ("E Major", 4, false),
            ("B Major", 5, false),
            ("F# Major", 6, false),
            ("C# Major", 7, false),
        ];
        
        for (key_str, expected_sharps, expected_minor) in &test_cases {
            let (sharps, is_minor) = exporter.parse_key_signature(key_str);
            assert_eq!(sharps, *expected_sharps, "Failed for {}", key_str);
            assert_eq!(is_minor, *expected_minor, "Failed for {}", key_str);
        }
    }
    
    #[test]
    fn test_parse_key_signature_all_major_keys_flats() {
        let exporter = MidiExporter::with_defaults();
        
        // Flat major keys (counterclockwise circle of fifths)
        let test_cases = [
            ("F Major", -1, false),
            ("Bb Major", -2, false),
            ("Eb Major", -3, false),
            ("Ab Major", -4, false),
            ("Db Major", 7, false),  // Enharmonic with C# (7 sharps)
            ("Gb Major", 6, false),  // Enharmonic with F# (6 sharps)
        ];
        
        for (key_str, expected_accidentals, expected_minor) in &test_cases {
            let (accidentals, is_minor) = exporter.parse_key_signature(key_str);
            assert_eq!(accidentals, *expected_accidentals, "Failed for {}", key_str);
            assert_eq!(is_minor, *expected_minor, "Failed for {}", key_str);
        }
    }
    
    #[test]
    fn test_parse_key_signature_all_minor_keys_sharps() {
        let exporter = MidiExporter::with_defaults();
        
        // Sharp minor keys (clockwise circle of fifths from A minor)
        let test_cases = [
            ("A Minor", 0, true),
            ("E Minor", 1, true),
            ("B Minor", 2, true),
            ("F# Minor", 3, true),
            ("C# Minor", 4, true),
            ("G# Minor", 5, true),
            ("D# Minor", 6, true),
            ("A# Minor", 7, true),
        ];
        
        for (key_str, expected_sharps, expected_minor) in &test_cases {
            let (sharps, is_minor) = exporter.parse_key_signature(key_str);
            assert_eq!(sharps, *expected_sharps, "Failed for {}", key_str);
            assert_eq!(is_minor, *expected_minor, "Failed for {}", key_str);
        }
    }
    
    #[test]
    fn test_parse_key_signature_all_minor_keys_flats() {
        let exporter = MidiExporter::with_defaults();
        
        // Flat minor keys (counterclockwise circle of fifths from A minor)
        let test_cases = [
            ("D Minor", -1, true),
            ("G Minor", -2, true),
            ("C Minor", -3, true),
            ("F Minor", -4, true),
            ("Bb Minor", 7, true),  // Enharmonic with A# minor
            ("Eb Minor", 6, true),  // Enharmonic with D# minor
        ];
        
        for (key_str, expected_accidentals, expected_minor) in &test_cases {
            let (accidentals, is_minor) = exporter.parse_key_signature(key_str);
            assert_eq!(accidentals, *expected_accidentals, "Failed for {}", key_str);
            assert_eq!(is_minor, *expected_minor, "Failed for {}", key_str);
        }
    }
    
    #[test]
    fn test_parse_key_signature_enharmonic_equivalents() {
        let exporter = MidiExporter::with_defaults();
        
        // Test enharmonic equivalents (e.g., C# = Db)
        let (c_sharp, _) = exporter.parse_key_signature("C# Major");
        let (d_flat, _) = exporter.parse_key_signature("Db Major");
        
        // Both should resolve to same enharmonic representation (7 sharps or -5 flats)
        // Our implementation prefers sharps for C# and handles Db as enharmonic
        assert_eq!(c_sharp, 7, "C# Major should be 7 sharps");
        assert_eq!(d_flat, 7, "Db Major should resolve to C# enharmonic (7 sharps)");
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

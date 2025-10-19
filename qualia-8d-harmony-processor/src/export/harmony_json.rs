//! # Responsibility
//! JSON export for HarmonyMap musical analysis data.

use crate::contracts::harmony_map::HarmonyMap;
use anyhow::{Context, Result};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

/// HarmonyMap JSON exporter
pub struct HarmonyMapExporter;

impl HarmonyMapExporter {
    /// Export HarmonyMap to pretty-printed JSON file
    pub fn export_pretty(harmony_map: &HarmonyMap, path: &Path) -> Result<()> {
        let file = File::create(path)
            .context(format!("Failed to create JSON file: {:?}", path))?;
        
        let writer = BufWriter::new(file);
        
        serde_json::to_writer_pretty(writer, harmony_map)
            .context("Failed to serialize HarmonyMap to JSON")?;
        
        Ok(())
    }

    /// Export HarmonyMap to compact JSON file
    pub fn export_compact(harmony_map: &HarmonyMap, path: &Path) -> Result<()> {
        let file = File::create(path)
            .context(format!("Failed to create JSON file: {:?}", path))?;
        
        let writer = BufWriter::new(file);
        
        serde_json::to_writer(writer, harmony_map)
            .context("Failed to serialize HarmonyMap to JSON")?;
        
        Ok(())
    }

    /// Export HarmonyMap to JSON string
    pub fn to_json_string(harmony_map: &HarmonyMap) -> Result<String> {
        serde_json::to_string_pretty(harmony_map)
            .context("Failed to serialize HarmonyMap to JSON string")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::harmony_map::{HarmonicContext, HarmonyMap};
    use tempfile::tempdir;

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
                    chord: "C maj".to_string(),
                    scale: vec!["C", "D", "E", "F", "G", "A", "B"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                },
                HarmonicContext {
                    start_time_sec: 4.0,
                    end_time_sec: 8.0,
                    chord: "G maj".to_string(),
                    scale: vec!["C", "D", "E", "F", "G", "A", "B"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                },
            ],
        }
    }

    #[test]
    fn test_export_pretty_creates_file() {
        let harmony_map = create_test_harmony_map();
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("harmony.json");

        let result = HarmonyMapExporter::export_pretty(&harmony_map, &file_path);
        assert!(result.is_ok());
        assert!(file_path.exists());
    }

    #[test]
    fn test_export_compact_creates_file() {
        let harmony_map = create_test_harmony_map();
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("harmony_compact.json");

        let result = HarmonyMapExporter::export_compact(&harmony_map, &file_path);
        assert!(result.is_ok());
        assert!(file_path.exists());
    }

    #[test]
    fn test_to_json_string_valid() {
        let harmony_map = create_test_harmony_map();
        
        let result = HarmonyMapExporter::to_json_string(&harmony_map);
        assert!(result.is_ok());
        
        let json_str = result.unwrap();
        assert!(json_str.contains("test_song_001"));
        assert!(json_str.contains("C Major"));
        assert!(json_str.contains("C maj"));
    }

    #[test]
    fn test_exported_json_can_be_deserialized() {
        let original = create_test_harmony_map();
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("roundtrip.json");

        HarmonyMapExporter::export_pretty(&original, &file_path).unwrap();

        // Read back and deserialize
        let json_str = std::fs::read_to_string(&file_path).unwrap();
        let deserialized: HarmonyMap = serde_json::from_str(&json_str).unwrap();

        assert_eq!(deserialized.song_id, original.song_id);
        assert_eq!(deserialized.key_signature, original.key_signature);
        assert_eq!(deserialized.tempo_bpm, original.tempo_bpm);
        assert_eq!(deserialized.progression.len(), original.progression.len());
    }

    #[test]
    fn test_compact_is_smaller_than_pretty() {
        let harmony_map = create_test_harmony_map();
        let dir = tempdir().unwrap();
        
        let pretty_path = dir.path().join("pretty.json");
        let compact_path = dir.path().join("compact.json");

        HarmonyMapExporter::export_pretty(&harmony_map, &pretty_path).unwrap();
        HarmonyMapExporter::export_compact(&harmony_map, &compact_path).unwrap();

        let pretty_size = std::fs::metadata(&pretty_path).unwrap().len();
        let compact_size = std::fs::metadata(&compact_path).unwrap().len();

        assert!(compact_size < pretty_size, 
                "Compact ({}) should be smaller than pretty ({})", 
                compact_size, pretty_size);
    }

    #[test]
    fn test_export_to_invalid_path() {
        let harmony_map = create_test_harmony_map();
        let invalid_path = Path::new("/nonexistent_directory/test.json");

        let result = HarmonyMapExporter::export_pretty(&harmony_map, invalid_path);
        assert!(result.is_err());
    }
}

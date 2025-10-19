//! # Responsibility
//! Audio file metadata for tracking processing information.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioMetadata {
    pub original_filename: String,
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_sec: f64,
    pub format: AudioFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AudioFormat {
    Wav,
    Mp3,
    Flac,
    Ogg,
    Unknown,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metadata_serialization() {
        let metadata = AudioMetadata {
            original_filename: "test.wav".to_string(),
            sample_rate: 48000,
            channels: 2,
            duration_sec: 120.5,
            format: AudioFormat::Wav,
        };

        let json = serde_json::to_string(&metadata).unwrap();
        let deserialized: AudioMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(metadata, deserialized);
    }
}

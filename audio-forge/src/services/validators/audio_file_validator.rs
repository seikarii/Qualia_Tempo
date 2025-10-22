//! # Responsibility
//! Centralized audio file format validation via magic number detection.
//!
//! ---
//!
//! SECURITY: Does NOT trust file extensions. Reads first 12 bytes to identify
//! actual file format via magic numbers. Prevents malicious files from crashing
//! the decoder.
//!
//! Supported formats:
//! - WAV: b"RIFF" at offset 0
//! - FLAC: b"fLaC" at offset 0
//! - MP3: ID3v2 tag (b"ID3") or MPEG sync (0xFF 0xFB/0xF3/0xF2) at offset 0
//! - OGG: b"OggS" at offset 0
//! - M4A/AAC: b"ftyp" at offset 4

use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

/// # Responsibility
/// Audio file format validator using magic number detection.
///
/// ---
///
/// Thread-safe, zero-dependency validation. Can be called from any context
/// (UI thread, async task, test harness).
pub struct AudioFileValidator;

impl AudioFileValidator {
    /// # Responsibility
    /// Validate audio file format via magic number detection (security critical).
    ///
    /// ---
    ///
    /// ALGORITHM:
    /// 1. Read first 12 bytes of file (minimum for all format checks)
    /// 2. Check magic numbers in priority order (most common first)
    /// 3. Return Ok(()) if recognized, Err with diagnostic message if not
    ///
    /// PERFORMANCE: Single file read (12 bytes), no allocation, O(1) checks.
    pub fn validate(path: &Path) -> io::Result<()> {
        let mut file = File::open(path)?;
        
        let mut magic = [0u8; 12];
        file.read_exact(&mut magic)?;
        
        // WAV format (RIFF container)
        if &magic[0..4] == b"RIFF" {
            return Ok(());
        }
        
        // FLAC format
        if &magic[0..4] == b"fLaC" {
            return Ok(());
        }
        
        // MP3: ID3v2 tag (most MP3 files start with this metadata)
        if &magic[0..3] == b"ID3" {
            return Ok(());
        }
        
        // MP3: MPEG-1 Layer 3 sync word (files without ID3 tags)
        if magic[0] == 0xFF && (magic[1] == 0xFB || magic[1] == 0xF3 || magic[1] == 0xF2) {
            return Ok(());
        }
        
        // OGG container (Vorbis/Opus)
        if &magic[0..4] == b"OggS" {
            return Ok(());
        }
        
        // M4A/AAC format (ISO Base Media File Format)
        if &magic[4..8] == b"ftyp" {
            return Ok(());
        }
        
        // No recognized format: return diagnostic error
        Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Unsupported or invalid audio file format. Supported: WAV, FLAC, MP3, OGG, M4A/AAC"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    /// Test: WAV magic number validation
    #[test]
    fn test_validate_wav_format() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"RIFF....WAVE").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_ok(), "Should recognize WAV format");
    }
    
    /// Test: FLAC magic number validation
    #[test]
    fn test_validate_flac_format() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"fLaC............").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_ok(), "Should recognize FLAC format");
    }
    
    /// Test: MP3 with ID3v2 tag
    #[test]
    fn test_validate_mp3_with_id3_tag() {
        let mut temp = NamedTempFile::new().unwrap();
        // Write 12 bytes (ID3v2 tag header requires at least this much)
        temp.write_all(b"ID3\x04\x00\x00\x00\x00\x00\x00\x00\x00").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_ok(), "Should recognize MP3 with ID3v2 tag");
    }
    
    /// Test: MP3 with MPEG sync word (no ID3 tag)
    #[test]
    fn test_validate_mp3_with_mpeg_sync() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"\xFF\xFB\x90\x00............").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_ok(), "Should recognize MP3 with MPEG sync word");
    }
    
    /// Test: OGG format validation
    #[test]
    fn test_validate_ogg_format() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"OggS............").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_ok(), "Should recognize OGG format");
    }
    
    /// Test: M4A/AAC format validation
    #[test]
    fn test_validate_m4a_format() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"....ftypM4A ").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_ok(), "Should recognize M4A format");
    }
    
    /// Test: Reject invalid file (random bytes)
    #[test]
    fn test_reject_invalid_file() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"INVALID_DATA").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_err(), "Should reject unrecognized format");
        
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Unsupported"), "Should provide diagnostic message");
    }
    
    /// Test: Reject file too small (less than 12 bytes)
    #[test]
    fn test_reject_file_too_small() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"RIFF").unwrap();
        temp.flush().unwrap();
        
        let result = AudioFileValidator::validate(temp.path());
        assert!(result.is_err(), "Should reject file with insufficient bytes");
    }
}

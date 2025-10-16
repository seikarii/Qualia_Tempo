//! # Responsibility
//! Displays synchronized lyrics/subtitles during musical combat.
//!
//! ---
//!
//! Parses subtitle data, synchronizes with audio playback timing,
//! and provides fade-in/fade-out animations for visual polish.

use std::sync::{Arc, Mutex};
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for subtitle display system.
#[derive(Debug, Clone)]
pub struct SubtitleConfig {
    /// Fade-in duration (seconds)
    pub fade_in_sec: f64,
    
    /// Fade-out duration (seconds)
    pub fade_out_sec: f64,
    
    /// Time offset (seconds) - display subtitles slightly ahead of audio
    pub time_offset_sec: f64,
    
    /// Whether subtitles are enabled
    pub enabled: bool,
}

impl Default for SubtitleConfig {
    fn default() -> Self {
        Self {
            fade_in_sec: 0.2,
            fade_out_sec: 0.2,
            time_offset_sec: 0.0,
            enabled: true,
        }
    }
}

/// # Responsibility
/// Represents a single subtitle entry with timing.
#[derive(Debug, Clone)]
pub struct SubtitleEntry {
    pub text: String,
    pub start_time_sec: f64,
    pub end_time_sec: f64,
}

impl SubtitleEntry {
    /// # Responsibility
    /// Creates a new subtitle entry.
    pub fn new(text: String, start_time_sec: f64, end_time_sec: f64) -> Self {
        Self {
            text,
            start_time_sec,
            end_time_sec,
        }
    }
    
    /// # Responsibility
    /// Checks if subtitle should be visible at given time.
    pub fn is_active(&self, current_time_sec: f64, offset_sec: f64) -> bool {
        let adjusted_time = current_time_sec + offset_sec;
        adjusted_time >= self.start_time_sec && adjusted_time <= self.end_time_sec
    }
    
    /// # Responsibility
    /// Calculates opacity for fade-in/fade-out animation.
    pub fn calculate_opacity(
        &self,
        current_time_sec: f64,
        fade_in_sec: f64,
        fade_out_sec: f64,
    ) -> f32 {
        let time_since_start = current_time_sec - self.start_time_sec;
        let time_until_end = self.end_time_sec - current_time_sec;
        
        // Fade-in phase
        if time_since_start < fade_in_sec {
            return (time_since_start / fade_in_sec) as f32;
        }
        
        // Fade-out phase
        if time_until_end < fade_out_sec {
            return (time_until_end / fade_out_sec) as f32;
        }
        
        // Fully visible
        1.0
    }
}

/// # Responsibility
/// Current subtitle state for UI rendering.
#[derive(Debug, Clone)]
pub struct SubtitleState {
    pub text: String,
    pub opacity: f32,
}

impl SubtitleState {
    /// # Responsibility
    /// Creates empty subtitle state.
    pub fn empty() -> Self {
        Self {
            text: String::new(),
            opacity: 0.0,
        }
    }
}

/// # Responsibility
/// Manages subtitle display synchronized with audio playback.
///
/// ---
///
/// Parses subtitle data from song metadata, tracks playback time,
/// and calculates visibility + opacity for smooth animations.
pub struct SubtitleService {
    config: SubtitleConfig,
    logger: Arc<dyn ILogger>,
    
    // Subtitle data (thread-safe for async loading)
    entries: Arc<Mutex<Vec<SubtitleEntry>>>,
    
    // Current playback state
    current_time_sec: Arc<Mutex<f64>>,
}

impl SubtitleService {
    /// # Responsibility
    /// Creates new subtitle service.
    pub fn new(config: SubtitleConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            entries: Arc::new(Mutex::new(Vec::new())),
            current_time_sec: Arc::new(Mutex::new(0.0)),
        }
    }
    
    /// # Responsibility
    /// Loads subtitle data from entries.
    pub fn load_subtitles(&self, entries: Vec<SubtitleEntry>) {
        self.logger.info(&format!("Loading {} subtitle entries", entries.len()));
        
        let mut storage = self.entries.lock().unwrap();
        *storage = entries;
    }
    
    /// # Responsibility
    /// Parses subtitle data from SRT format.
    ///
    /// Format:
    /// ```
    /// 1
    /// 00:00:10,500 --> 00:00:13,000
    /// Never gonna give you up
    /// ```
    pub fn parse_srt(&self, srt_content: &str) -> Vec<SubtitleEntry> {
        let mut entries = Vec::new();
        let blocks: Vec<&str> = srt_content.split("\n\n").collect();
        
        for block in blocks {
            let lines: Vec<&str> = block.lines().collect();
            if lines.len() < 3 {
                continue;
            }
            
            // Parse timing line (format: "00:00:10,500 --> 00:00:13,000")
            let timing_line = lines[1];
            if let Some((start, end)) = timing_line.split_once(" --> ") {
                if let (Some(start_sec), Some(end_sec)) = (
                    Self::parse_srt_timestamp(start),
                    Self::parse_srt_timestamp(end),
                ) {
                    let text = lines[2..].join("\n");
                    entries.push(SubtitleEntry::new(text, start_sec, end_sec));
                }
            }
        }
        
        self.logger.info(&format!("Parsed {} subtitle entries from SRT", entries.len()));
        entries
    }
    
    /// # Responsibility
    /// Parses SRT timestamp (00:00:10,500) to seconds.
    fn parse_srt_timestamp(timestamp: &str) -> Option<f64> {
        let parts: Vec<&str> = timestamp.split(':').collect();
        if parts.len() != 3 {
            return None;
        }
        
        let hours: f64 = parts[0].parse().ok()?;
        let minutes: f64 = parts[1].parse().ok()?;
        
        // Handle seconds + milliseconds (10,500)
        let sec_parts: Vec<&str> = parts[2].split(',').collect();
        let seconds: f64 = sec_parts[0].parse().ok()?;
        let millis: f64 = sec_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0.0);
        
        Some(hours * 3600.0 + minutes * 60.0 + seconds + millis / 1000.0)
    }
    
    /// # Responsibility
    /// Updates current playback time (called by AudioPlaybackService).
    pub fn update_time(&self, current_time_sec: f64) {
        let mut time = self.current_time_sec.lock().unwrap();
        *time = current_time_sec;
    }
    
    /// # Responsibility
    /// Gets current subtitle state for rendering.
    pub fn get_current_subtitle(&self) -> SubtitleState {
        if !self.config.enabled {
            return SubtitleState::empty();
        }
        
        let current_time = *self.current_time_sec.lock().unwrap();
        let entries = self.entries.lock().unwrap();
        
        // Find active subtitle
        for entry in entries.iter() {
            if entry.is_active(current_time, self.config.time_offset_sec) {
                let opacity = entry.calculate_opacity(
                    current_time,
                    self.config.fade_in_sec,
                    self.config.fade_out_sec,
                );
                
                return SubtitleState {
                    text: entry.text.clone(),
                    opacity,
                };
            }
        }
        
        SubtitleState::empty()
    }
    
    /// # Responsibility
    /// Clears all subtitle data.
    pub fn clear(&self) {
        self.entries.lock().unwrap().clear();
        *self.current_time_sec.lock().unwrap() = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    fn create_test_service() -> SubtitleService {
        let config = SubtitleConfig::default();
        let logger = Arc::new(MockLogger);
        SubtitleService::new(config, logger)
    }
    
    #[test]
    fn test_subtitle_service_creation() {
        let service = create_test_service();
        let state = service.get_current_subtitle();
        assert_eq!(state.text, "");
        assert_eq!(state.opacity, 0.0);
    }
    
    #[test]
    fn test_load_subtitles() {
        let service = create_test_service();
        
        let entries = vec![
            SubtitleEntry::new("Line 1".to_string(), 0.0, 2.0),
            SubtitleEntry::new("Line 2".to_string(), 2.5, 4.5),
        ];
        
        service.load_subtitles(entries);
        
        // At time 1.0, should show Line 1
        service.update_time(1.0);
        let state = service.get_current_subtitle();
        assert_eq!(state.text, "Line 1");
        assert!(state.opacity > 0.0);
    }
    
    #[test]
    fn test_subtitle_timing() {
        let service = create_test_service();
        
        let entries = vec![
            SubtitleEntry::new("First".to_string(), 0.0, 2.0),
            SubtitleEntry::new("Second".to_string(), 3.0, 5.0),
        ];
        
        service.load_subtitles(entries);
        
        // Before first subtitle
        service.update_time(0.0);
        assert_eq!(service.get_current_subtitle().text, "First");
        
        // Between subtitles
        service.update_time(2.5);
        assert_eq!(service.get_current_subtitle().text, "");
        
        // During second subtitle
        service.update_time(4.0);
        assert_eq!(service.get_current_subtitle().text, "Second");
        
        // After all subtitles
        service.update_time(10.0);
        assert_eq!(service.get_current_subtitle().text, "");
    }
    
    #[test]
    fn test_subtitle_fade_in() {
        let entry = SubtitleEntry::new("Test".to_string(), 0.0, 10.0);
        
        // At start (0% through fade-in)
        let opacity_start = entry.calculate_opacity(0.0, 1.0, 1.0);
        assert_eq!(opacity_start, 0.0);
        
        // Middle of fade-in (50% through)
        let opacity_mid = entry.calculate_opacity(0.5, 1.0, 1.0);
        assert_eq!(opacity_mid, 0.5);
        
        // End of fade-in (100% through)
        let opacity_end = entry.calculate_opacity(1.0, 1.0, 1.0);
        assert_eq!(opacity_end, 1.0);
    }
    
    #[test]
    fn test_subtitle_fade_out() {
        let entry = SubtitleEntry::new("Test".to_string(), 0.0, 10.0);
        
        // Start of fade-out (1 second before end, 100% opacity)
        let opacity_start = entry.calculate_opacity(9.0, 1.0, 1.0);
        assert_eq!(opacity_start, 1.0);
        
        // Middle of fade-out (0.5 seconds before end, 50% opacity)
        let opacity_mid = entry.calculate_opacity(9.5, 1.0, 1.0);
        assert_eq!(opacity_mid, 0.5);
        
        // End (0% opacity)
        let opacity_end = entry.calculate_opacity(10.0, 1.0, 1.0);
        assert_eq!(opacity_end, 0.0);
    }
    
    #[test]
    fn test_parse_srt_timestamp() {
        assert_eq!(SubtitleService::parse_srt_timestamp("00:00:00,000"), Some(0.0));
        assert_eq!(SubtitleService::parse_srt_timestamp("00:00:10,500"), Some(10.5));
        assert_eq!(SubtitleService::parse_srt_timestamp("00:01:30,250"), Some(90.25));
        assert_eq!(SubtitleService::parse_srt_timestamp("01:00:00,000"), Some(3600.0));
    }
    
    #[test]
    fn test_parse_srt_format() {
        let service = create_test_service();
        
        let srt_content = r#"1
00:00:10,500 --> 00:00:13,000
Never gonna give you up

2
00:00:13,500 --> 00:00:16,000
Never gonna let you down"#;
        
        let entries = service.parse_srt(srt_content);
        
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].text, "Never gonna give you up");
        assert_eq!(entries[0].start_time_sec, 10.5);
        assert_eq!(entries[0].end_time_sec, 13.0);
        assert_eq!(entries[1].text, "Never gonna let you down");
    }
}

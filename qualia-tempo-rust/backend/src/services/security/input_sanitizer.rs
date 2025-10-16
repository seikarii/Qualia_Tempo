//! # Responsibility
//! Provides input sanitization to prevent XSS and SQL injection attacks.
//!
//! ---
//!
//! Phase 1: Basic validation (length limits, HTML tag stripping, SQL keyword rejection).
//! Phase 3: Full XSS library integration (ammonia crate), prepared statement validation.

use shaku::Component;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

use super::super::infrastructure::ILogger;

/// # Responsibility
/// Input sanitizer configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputSanitizerConfig {
    /// Maximum allowed input length
    pub max_input_length: usize,
    
    /// Enable HTML tag stripping
    pub strip_html_tags: bool,
    
    /// Enable SQL keyword rejection
    pub reject_sql_keywords: bool,
    
    /// List of forbidden SQL keywords (uppercase)
    pub sql_keywords: Vec<String>,
}

impl Default for InputSanitizerConfig {
    fn default() -> Self {
        Self {
            max_input_length: 1000,
            strip_html_tags: true,
            reject_sql_keywords: true,
            sql_keywords: vec![
                "DROP".to_string(),
                "DELETE".to_string(),
                "INSERT".to_string(),
                "UPDATE".to_string(),
                "UNION".to_string(),
                "SELECT".to_string(),
                "EXEC".to_string(),
                "EXECUTE".to_string(),
                "SCRIPT".to_string(),
                "--".to_string(),
                ";--".to_string(),
            ],
        }
    }
}

/// # Responsibility
/// Sanitization result with cleaned input.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SanitizationResult {
    /// Whether the input is safe
    pub safe: bool,
    
    /// Sanitized/cleaned input (empty if unsafe)
    pub sanitized_input: String,
    
    /// Error message if unsafe
    pub error_message: Option<String>,
}

/// # Responsibility
/// Trait for input sanitization services.
pub trait IInputSanitizer: shaku::Interface {
    /// Sanitizes user input.
    ///
    /// # Arguments
    /// * `input` - The raw user input string
    ///
    /// # Returns
    /// * `SanitizationResult` with cleaned input or error
    fn sanitize(&self, input: &str) -> SanitizationResult;
    
    /// Checks if input contains HTML tags.
    ///
    /// # Arguments
    /// * `input` - The input string to check
    ///
    /// # Returns
    /// * `true` if HTML tags detected
    fn contains_html_tags(&self, input: &str) -> bool;
    
    /// Checks if input contains SQL keywords.
    ///
    /// # Arguments
    /// * `input` - The input string to check
    ///
    /// # Returns
    /// * `true` if SQL keywords detected
    fn contains_sql_keywords(&self, input: &str) -> bool;
}

/// # Responsibility
/// Implements basic input sanitization (Phase 1).
///
/// ---
///
/// Phase 1: Length checks, HTML tag stripping, SQL keyword rejection.
/// Phase 3: Full ammonia crate integration, Unicode normalization, prepared statement validation.
#[derive(Component)]
#[shaku(interface = IInputSanitizer)]
pub struct InputSanitizerService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<InputSanitizerConfig>,
}

impl InputSanitizerService {
    /// Creates a new InputSanitizerService instance.
    pub fn new(logger: Arc<dyn ILogger>, config: Arc<InputSanitizerConfig>) -> Self {
        logger.info("InputSanitizerService initialized (Phase 1: basic validation)");
        Self { logger, config }
    }
    
    /// Strips HTML tags from input (basic implementation).
    fn strip_html(&self, input: &str) -> String {
        // Phase 1: Simple regex-style removal (replace < > brackets)
        // Phase 3: Use ammonia crate for comprehensive HTML sanitization
        input
            .replace('<', "")
            .replace('>', "")
    }
}

impl IInputSanitizer for InputSanitizerService {
    fn sanitize(&self, input: &str) -> SanitizationResult {
        // Check length
        if input.len() > self.config.max_input_length {
            return SanitizationResult {
                safe: false,
                sanitized_input: String::new(),
                error_message: Some(format!(
                    "Input too long (max {} chars)",
                    self.config.max_input_length
                )),
            };
        }
        
        // Strip HTML tags if enabled (do this BEFORE SQL keyword check)
        let mut sanitized = input.to_string();
        if self.config.strip_html_tags {
            sanitized = self.strip_html(&sanitized);
        }
        
        // Check for SQL keywords in SANITIZED input
        if self.config.reject_sql_keywords && self.contains_sql_keywords(&sanitized) {
            self.logger.warn(&format!("SQL injection attempt detected: {}", input));
            return SanitizationResult {
                safe: false,
                sanitized_input: String::new(),
                error_message: Some("Input contains forbidden SQL keywords".to_string()),
            };
        }
        
        SanitizationResult {
            safe: true,
            sanitized_input: sanitized,
            error_message: None,
        }
    }
    
    fn contains_html_tags(&self, input: &str) -> bool {
        // Simple check for < and > brackets
        input.contains('<') || input.contains('>')
    }
    
    fn contains_sql_keywords(&self, input: &str) -> bool {
        let input_upper = input.to_uppercase();
        
        for keyword in &self.config.sql_keywords {
            // Word boundary check: keyword must be surrounded by non-alphanumeric chars or start/end of string
            if let Some(pos) = input_upper.find(keyword) {
                let before_ok = pos == 0 || !input_upper.chars().nth(pos - 1).unwrap().is_alphanumeric();
                let after_pos = pos + keyword.len();
                let after_ok = after_pos >= input_upper.len() 
                    || !input_upper.chars().nth(after_pos).unwrap().is_alphanumeric();
                
                if before_ok && after_ok {
                    return true;
                }
            }
        }
        
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    
    fn create_test_service() -> InputSanitizerService {
        let logger = Arc::new(QualiaLogger);
        let config = Arc::new(InputSanitizerConfig::default());
        InputSanitizerService::new(logger, config)
    }
    
    #[test]
    fn test_sanitize_clean_input() {
        let service = create_test_service();
        
        let input = "Hello, world! This is a clean input.";
        let result = service.sanitize(input);
        
        assert!(result.safe, "Clean input should be safe");
        assert_eq!(result.sanitized_input, input, "Should not modify clean input");
        assert!(result.error_message.is_none(), "Should not have error message");
    }
    
    #[test]
    fn test_sanitize_removes_html_tags() {
        let service = create_test_service();
        
        let input = "<script>alert('XSS')</script>";
        let result = service.sanitize(input);
        
        assert!(result.safe, "Should strip HTML and return safe");
        assert!(!result.sanitized_input.contains('<'), "Should remove < brackets");
        assert!(!result.sanitized_input.contains('>'), "Should remove > brackets");
    }
    
    #[test]
    fn test_sanitize_rejects_sql_keywords() {
        let service = create_test_service();
        
        let input = "'; DROP TABLE users; --";
        let result = service.sanitize(input);
        
        assert!(!result.safe, "SQL injection attempt should be rejected");
        assert!(result.error_message.is_some(), "Should have error message");
        assert!(result.error_message.unwrap().contains("SQL"), "Should mention SQL");
    }
    
    #[test]
    fn test_sanitize_rejects_too_long_input() {
        let service = create_test_service();
        
        // Default max_input_length = 1000
        let long_input = "a".repeat(1500);
        let result = service.sanitize(&long_input);
        
        assert!(!result.safe, "Too long input should be rejected");
        assert!(result.error_message.unwrap().contains("too long"), "Should mention length");
    }
    
    #[test]
    fn test_contains_html_tags_true() {
        let service = create_test_service();
        
        assert!(service.contains_html_tags("<div>"), "Should detect < bracket");
        assert!(service.contains_html_tags("</div>"), "Should detect > bracket");
        assert!(service.contains_html_tags("<script src='evil.js'>"), "Should detect HTML tag");
    }
    
    #[test]
    fn test_contains_html_tags_false() {
        let service = create_test_service();
        
        assert!(!service.contains_html_tags("Clean text"), "Should not detect in clean text");
        assert!(!service.contains_html_tags("1 + 2 = 3"), "Should not false positive on math");
    }
    
    #[test]
    fn test_contains_sql_keywords_true() {
        let service = create_test_service();
        
        assert!(service.contains_sql_keywords("DROP TABLE users"), "Should detect DROP");
        assert!(service.contains_sql_keywords("SELECT * FROM passwords"), "Should detect SELECT");
        assert!(service.contains_sql_keywords("'; DELETE FROM --"), "Should detect DELETE");
    }
    
    #[test]
    fn test_contains_sql_keywords_false() {
        let service = create_test_service();
        
        assert!(!service.contains_sql_keywords("Hello world"), "Should not detect in clean text");
        assert!(!service.contains_sql_keywords("I like droplets"), "Should not false positive on partial match");
    }
    
    #[test]
    fn test_sanitize_case_insensitive_sql_detection() {
        let service = create_test_service();
        
        let input = "drop table users";  // lowercase
        let result = service.sanitize(input);
        
        assert!(!result.safe, "Should detect SQL keywords case-insensitively");
    }
}

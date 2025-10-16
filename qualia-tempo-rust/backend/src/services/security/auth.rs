//! # Responsibility
//! Provides session token validation for WebSocket client authentication.
//!
//! ---
//!
//! Phase 1: Basic format validation (prefix check, length validation).
//! Phase 3: Full JWT parsing, signature verification, OAuth integration.

use shaku::Component;
use std::sync::Arc;
use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};

use super::super::infrastructure::ILogger;

/// # Responsibility
/// Authentication service configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    /// Expected token prefix (e.g., "Bearer", "Session")
    pub token_prefix: String,
    
    /// Minimum token length (excluding prefix)
    pub min_token_length: usize,
    
    /// Maximum token length (excluding prefix)
    pub max_token_length: usize,
    
    /// Enable strict validation (Phase 3: JWT signature verification)
    pub enable_strict_validation: bool,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            token_prefix: "Session".to_string(),
            min_token_length: 16,
            max_token_length: 256,
            enable_strict_validation: false, // Phase 1: stub only
        }
    }
}

/// # Responsibility
/// Authentication result after token validation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuthResult {
    /// Whether the token is valid
    pub valid: bool,
    
    /// Extracted player ID (Phase 1: None, Phase 3: Some(player_id))
    pub player_id: Option<String>,
    
    /// Error message if validation failed
    pub error_message: Option<String>,
}

/// # Responsibility
/// Trait for authentication services.
pub trait IAuthService: shaku::Interface {
    /// Validates a session token.
    ///
    /// # Arguments
    /// * `token` - The token string to validate
    ///
    /// # Returns
    /// * `AuthResult` with validation status
    fn validate_token(&self, token: &str) -> AuthResult;
    
    /// Extracts player ID from a valid token (Phase 3 feature).
    ///
    /// # Arguments
    /// * `token` - The token string
    ///
    /// # Returns
    /// * `Option<String>` with player ID if extractable
    fn extract_player_id(&self, token: &str) -> Option<String>;
}

/// # Responsibility
/// Implements basic token validation (Phase 1 stub).
///
/// ---
///
/// Phase 1: Validates token format (prefix + length).
/// Phase 3: Full JWT parsing with signature verification, expiry checks.
#[derive(Component)]
#[shaku(interface = IAuthService)]
pub struct AuthService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<AuthConfig>,
}

impl AuthService {
    /// Creates a new AuthService instance.
    pub fn new(logger: Arc<dyn ILogger>, config: Arc<AuthConfig>) -> Self {
        logger.info("AuthService initialized (Phase 1: format validation only)");
        Self { logger, config }
    }
}

impl IAuthService for AuthService {
    fn validate_token(&self, token: &str) -> AuthResult {
        // Phase 1: Basic format validation
        
        // Check empty token
        if token.is_empty() {
            return AuthResult {
                valid: false,
                player_id: None,
                error_message: Some("Token is empty".to_string()),
            };
        }
        
        // Check prefix
        let expected_prefix = format!("{} ", self.config.token_prefix);
        if !token.starts_with(&expected_prefix) {
            return AuthResult {
                valid: false,
                player_id: None,
                error_message: Some(format!("Token must start with '{}'", expected_prefix.trim())),
            };
        }
        
        // Extract token body (after prefix)
        let token_body = &token[expected_prefix.len()..];
        
        // Check length bounds
        if token_body.len() < self.config.min_token_length {
            return AuthResult {
                valid: false,
                player_id: None,
                error_message: Some(format!(
                    "Token too short (min {} chars)",
                    self.config.min_token_length
                )),
            };
        }
        
        if token_body.len() > self.config.max_token_length {
            return AuthResult {
                valid: false,
                player_id: None,
                error_message: Some(format!(
                    "Token too long (max {} chars)",
                    self.config.max_token_length
                )),
            };
        }
        
        // Phase 1: Accept all tokens with valid format
        // Phase 3: Add JWT signature verification here
        
        self.logger.info(&format!("Token validated successfully (Phase 1 stub): {}", &token_body[..8.min(token_body.len())]));
        
        AuthResult {
            valid: true,
            player_id: None, // Phase 3: Extract from JWT claims
            error_message: None,
        }
    }
    
    fn extract_player_id(&self, _token: &str) -> Option<String> {
        // Phase 1: Not implemented (returns None)
        // Phase 3: Parse JWT claims and extract "sub" or "player_id" field
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    
    fn create_test_service() -> AuthService {
        let logger = Arc::new(QualiaLogger);
        let config = Arc::new(AuthConfig::default());
        AuthService::new(logger, config)
    }
    
    #[test]
    fn test_validate_token_valid_format() {
        let service = create_test_service();
        
        // Valid token: "Session <16+ chars>"
        let token = "Session abcdefghijklmnop1234567890";
        let result = service.validate_token(token);
        
        assert!(result.valid, "Token should be valid");
        assert!(result.error_message.is_none(), "Should not have error message");
    }
    
    #[test]
    fn test_validate_token_empty() {
        let service = create_test_service();
        
        let result = service.validate_token("");
        
        assert!(!result.valid, "Empty token should be invalid");
        assert!(result.error_message.is_some(), "Should have error message");
        assert!(result.error_message.unwrap().contains("empty"), "Should mention empty");
    }
    
    #[test]
    fn test_validate_token_wrong_prefix() {
        let service = create_test_service();
        
        let token = "Bearer abcdefghijklmnop1234567890";
        let result = service.validate_token(token);
        
        assert!(!result.valid, "Token with wrong prefix should be invalid");
        assert!(result.error_message.unwrap().contains("Session"), "Should mention expected prefix");
    }
    
    #[test]
    fn test_validate_token_too_short() {
        let service = create_test_service();
        
        // Default min_token_length = 16
        let token = "Session short";
        let result = service.validate_token(token);
        
        assert!(!result.valid, "Token too short should be invalid");
        assert!(result.error_message.unwrap().contains("too short"), "Should mention length");
    }
    
    #[test]
    fn test_validate_token_too_long() {
        let service = create_test_service();
        
        // Default max_token_length = 256
        let long_token = "a".repeat(300);
        let token = format!("Session {}", long_token);
        let result = service.validate_token(&token);
        
        assert!(!result.valid, "Token too long should be invalid");
        assert!(result.error_message.unwrap().contains("too long"), "Should mention length");
    }
    
    #[test]
    fn test_extract_player_id_returns_none_phase1() {
        let service = create_test_service();
        
        // Phase 1: Always returns None
        let token = "Session abcdefghijklmnop1234567890";
        let player_id = service.extract_player_id(token);
        
        assert!(player_id.is_none(), "Phase 1 should not extract player ID");
    }
}

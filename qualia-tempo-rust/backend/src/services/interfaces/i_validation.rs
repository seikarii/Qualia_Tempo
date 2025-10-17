//! # Responsibility
//! Input validation and anti-cheat service interface.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use uuid::Uuid;
use shared_core::contracts::PlayerAction;

/// # Responsibility
/// Validation result with detailed error messages.
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

/// # Responsibility
/// Validates player input and enforces anti-cheat measures.
///
/// ---
///
/// This service provides:
/// - Input validation (bounds checking, type validation)
/// - Anti-cheat measures (timing validation, impossible moves)
/// - Rate limiting per client
/// - Sanity checks (health, position, cooldowns)
#[async_trait]
pub trait IValidationService: Interface {
    /// Validates player action for correctness and anti-cheat.
    ///
    /// # Arguments
    /// * `client_id` - Client UUID (for rate limiting)
    /// * `action` - Player action to validate
    ///
    /// # Returns
    /// Validation result with errors if invalid
    async fn validate_action(&self, client_id: Uuid, action: &PlayerAction) -> Result<ValidationResult>;
    
    /// Checks if client is rate limited.
    ///
    /// # Arguments
    /// * `client_id` - Client UUID
    ///
    /// # Returns
    /// true if client has exceeded rate limit
    async fn is_rate_limited(&self, client_id: Uuid) -> bool;
    
    /// Resets rate limit for client.
    ///
    /// # Arguments
    /// * `client_id` - Client UUID
    async fn reset_rate_limit(&self, client_id: Uuid) -> Result<()>;
}

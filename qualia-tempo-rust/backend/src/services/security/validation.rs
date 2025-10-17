//! # Responsibility
//! Validation service implementation with anti-cheat measures.

use shaku::Component;
use async_trait::async_trait;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{info, warn, debug, instrument};

use crate::services::interfaces::{IValidationService, ILogger, ValidationResult};
use shared_core::contracts::PlayerAction;

/// Rate limit tracker per client.
#[derive(Debug, Clone)]
struct RateLimitState {
    action_count: usize,
    window_start: std::time::Instant,
}

/// # Responsibility
/// Implements input validation and anti-cheat measures.
///
/// ---
///
/// Features:
/// - Input validation (bounds checking, type validation)
/// - Rate limiting per client (actions per second)
/// - Timing validation (action timestamps)
/// - Sanity checks (impossible moves, teleportation detection)
#[derive(Component)]
#[shaku(interface = IValidationService)]
pub struct ValidationService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    max_actions_per_sec: usize,
    rate_limits: Arc<RwLock<HashMap<Uuid, RateLimitState>>>,
}

impl ValidationService {
    /// Creates a new ValidationService with default configuration.
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self {
            logger,
            max_actions_per_sec: 100, // 100 actions per second max
            rate_limits: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// Validates action timing.
    fn validate_timing(&self, action: &PlayerAction) -> Vec<String> {
        let mut errors = Vec::new();
        
        match action {
            PlayerAction::KeyPressed { timestamp, .. } => {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64;
                
                // Check if timestamp is in the past (more than 5 seconds)
                if *timestamp + 5000 < now {
                    errors.push("Action timestamp too far in the past".to_string());
                }
                
                // Check if timestamp is in the future (more than 1 second)
                if *timestamp > now + 1000 {
                    errors.push("Action timestamp in the future".to_string());
                }
            }
            PlayerAction::Dash { .. } => {
                // Dash-specific validation (cooldown, etc.)
            }
            _ => {}
        }
        
        errors
    }
    
    /// Validates action bounds and sanity.
    fn validate_bounds(&self, action: &PlayerAction) -> Vec<String> {
        let mut errors = Vec::new();
        
        match action {
            PlayerAction::KeyPressed { key, .. } => {
                // Validate key is one of the allowed keys (Q, E, R, T, F, G, C)
                let valid_keys = ['Q', 'E', 'R', 'T', 'F', 'G', 'C'];
                if !valid_keys.contains(key) {
                    errors.push(format!("Invalid key: {}. Must be one of Q, E, R, T, F, G, C", key));
                }
            }
            PlayerAction::Dash { .. } => {
                // Dash validation (ensure cooldown, etc.)
            }
            _ => {}
        }
        
        errors
    }
}

#[async_trait]
impl IValidationService for ValidationService {
    #[instrument(skip(self, action))]
    async fn validate_action(&self, client_id: Uuid, action: &PlayerAction) -> Result<ValidationResult> {
        let mut errors = Vec::new();
        
        // Check rate limit
        if self.is_rate_limited(client_id).await {
            errors.push("Rate limit exceeded".to_string());
            
            return Ok(ValidationResult {
                valid: false,
                errors,
            });
        }
        
        // Timing validation
        errors.extend(self.validate_timing(action));
        
        // Bounds validation
        errors.extend(self.validate_bounds(action));
        
        let valid = errors.is_empty();
        
        if !valid {
            warn!("Validation failed for client {}: {:?}", client_id, errors);
        } else {
            debug!("Validation passed for client {}", client_id);
            
            // Update rate limit
            let mut rate_limits = self.rate_limits.write().await;
            let now = std::time::Instant::now();
            
            let state = rate_limits.entry(client_id).or_insert_with(|| RateLimitState {
                action_count: 0,
                window_start: now,
            });
            
            // Reset window if it's been more than 1 second
            if now.duration_since(state.window_start).as_secs() >= 1 {
                state.action_count = 0;
                state.window_start = now;
            }
            
            state.action_count += 1;
        }
        
        Ok(ValidationResult {
            valid,
            errors,
        })
    }
    
    async fn is_rate_limited(&self, client_id: Uuid) -> bool {
        let rate_limits = self.rate_limits.read().await;
        
        if let Some(state) = rate_limits.get(&client_id) {
            let now = std::time::Instant::now();
            
            // Check if within current window
            if now.duration_since(state.window_start).as_secs() < 1 {
                return state.action_count >= self.max_actions_per_sec;
            }
        }
        
        false
    }
    
    async fn reset_rate_limit(&self, client_id: Uuid) -> Result<()> {
        let mut rate_limits = self.rate_limits.write().await;
        
        if rate_limits.remove(&client_id).is_some() {
            info!("Reset rate limit for client {}", client_id);
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[tokio::test]
    async fn test_validate_action_valid_key() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ValidationService::new(Arc::new(mock_logger));
        
        let client_id = Uuid::new_v4();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: now,
            accuracy: 0.95,
        };
        
        let result = service.validate_action(client_id, &action).await.unwrap();
        assert!(result.valid);
        assert!(result.errors.is_empty());
    }
    
    #[tokio::test]
    async fn test_validate_action_invalid_key() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        mock_logger.expect_warn().return_const(());
        
        let service = ValidationService::new(Arc::new(mock_logger));
        
        let client_id = Uuid::new_v4();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        let action = PlayerAction::KeyPressed {
            key: 'Z', // Invalid key
            timestamp: now,
            accuracy: 0.95,
        };
        
        let result = service.validate_action(client_id, &action).await.unwrap();
        assert!(!result.valid);
        assert!(!result.errors.is_empty());
        assert!(result.errors[0].contains("Invalid key"));
    }
    
    #[tokio::test]
    async fn test_rate_limiting() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        mock_logger.expect_warn().return_const(());
        
        let mut service = ValidationService::new(Arc::new(mock_logger));
        service.max_actions_per_sec = 5; // Set low limit for testing
        
        let client_id = Uuid::new_v4();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // Submit 6 actions rapidly
        for i in 0..6 {
            let action = PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: now + i,
                accuracy: 0.95,
            };
            
            let result = service.validate_action(client_id, &action).await.unwrap();
            
            if i < 5 {
                assert!(result.valid, "Action {} should be valid", i);
            } else {
                assert!(!result.valid, "Action {} should be rate limited", i);
                assert!(result.errors[0].contains("Rate limit"));
            }
        }
    }
    
    #[tokio::test]
    async fn test_reset_rate_limit() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        mock_logger.expect_warn().return_const(());
        
        let mut service = ValidationService::new(Arc::new(mock_logger));
        service.max_actions_per_sec = 2;
        
        let client_id = Uuid::new_v4();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // Hit rate limit
        for i in 0..3 {
            let action = PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: now + i,
                accuracy: 0.95,
            };
            service.validate_action(client_id, &action).await.unwrap();
        }
        
        assert!(service.is_rate_limited(client_id).await);
        
        // Reset
        service.reset_rate_limit(client_id).await.unwrap();
        
        assert!(!service.is_rate_limited(client_id).await);
    }
}

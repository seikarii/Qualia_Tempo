//! # Responsibility
//! Provides per-client rate limiting using token bucket algorithm.
//!
//! ---
//!
//! Phase 1: In-memory HashMap for per-client token buckets.
//! Phase 3: Redis-backed distributed rate limiting for horizontal scaling.

use shaku::Component;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use std::time::Instant;
use serde::{Deserialize, Serialize};
use async_trait::async_trait;

use super::super::infrastructure::ILogger;

/// # Responsibility
/// Rate limiter configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimiterConfig {
    /// Maximum tokens per bucket (burst capacity)
    pub max_tokens: u32,
    
    /// Token refill rate (tokens per second)
    pub refill_rate: f64,
    
    /// Cost per request (tokens consumed per action)
    pub cost_per_request: u32,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            max_tokens: 100,           // Allow burst of 100 requests
            refill_rate: 10.0,         // Refill 10 tokens/sec (600 req/min)
            cost_per_request: 1,       // Each request costs 1 token
        }
    }
}

/// # Responsibility
/// Token bucket for a single client.
#[derive(Debug, Clone)]
struct TokenBucket {
    /// Current number of tokens
    tokens: f64,
    
    /// Last refill timestamp
    last_refill: Instant,
    
    /// Maximum tokens (burst capacity)
    max_tokens: u32,
    
    /// Refill rate (tokens per second)
    refill_rate: f64,
}

impl TokenBucket {
    fn new(max_tokens: u32, refill_rate: f64) -> Self {
        Self {
            tokens: max_tokens as f64, // Start with full bucket
            last_refill: Instant::now(),
            max_tokens,
            refill_rate,
        }
    }
    
    /// Refills tokens based on elapsed time.
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        
        // Calculate tokens to add
        let tokens_to_add = elapsed * self.refill_rate;
        
        // Add tokens, capped at max_tokens
        self.tokens = (self.tokens + tokens_to_add).min(self.max_tokens as f64);
        
        self.last_refill = now;
    }
    
    /// Attempts to consume tokens.
    ///
    /// # Returns
    /// * `true` if tokens available and consumed
    /// * `false` if insufficient tokens (rate limited)
    fn try_consume(&mut self, cost: u32) -> bool {
        self.refill();
        
        if self.tokens >= cost as f64 {
            self.tokens -= cost as f64;
            true
        } else {
            false
        }
    }
}

/// # Responsibility
/// Trait for rate limiting services.
#[async_trait]
pub trait IRateLimiter: shaku::Interface {
    /// Checks if a client is allowed to proceed (within rate limit).
    ///
    /// # Arguments
    /// * `client_id` - Unique client identifier
    ///
    /// # Returns
    /// * `true` if allowed, `false` if rate limited
    async fn check_rate_limit(&self, client_id: &str) -> bool;
    
    /// Resets rate limit for a specific client.
    ///
    /// # Arguments
    /// * `client_id` - Client to reset
    async fn reset_client(&self, client_id: &str);
}

/// # Responsibility
/// Implements token bucket rate limiting (Phase 1: in-memory).
///
/// ---
///
/// Phase 1: HashMap<client_id, TokenBucket> with RwLock for thread safety.
/// Phase 3: Redis-backed distributed rate limiting for multi-server deployments.
#[derive(Component)]
#[shaku(interface = IRateLimiter)]
pub struct RateLimiterService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<RateLimiterConfig>,
    
    /// Per-client token buckets (thread-safe)
    buckets: Arc<RwLock<HashMap<String, TokenBucket>>>,
}

impl RateLimiterService {
    /// Creates a new RateLimiterService instance.
    pub fn new(logger: Arc<dyn ILogger>, config: Arc<RateLimiterConfig>) -> Self {
        logger.info(&format!(
            "RateLimiterService initialized (max_tokens: {}, refill_rate: {}/sec)",
            config.max_tokens, config.refill_rate
        ));
        Self {
            logger,
            config,
            buckets: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl IRateLimiter for RateLimiterService {
    async fn check_rate_limit(&self, client_id: &str) -> bool {
        let mut buckets = self.buckets.write().await;
        
        // Get or create bucket for client
        let bucket = buckets.entry(client_id.to_string()).or_insert_with(|| {
            TokenBucket::new(self.config.max_tokens, self.config.refill_rate)
        });
        
        // Try to consume tokens
        let allowed = bucket.try_consume(self.config.cost_per_request);
        
        if !allowed {
            self.logger.warn(&format!("Rate limit exceeded for client: {}", client_id));
        }
        
        allowed
    }
    
    async fn reset_client(&self, client_id: &str) {
        let mut buckets = self.buckets.write().await;
        buckets.remove(client_id);
        self.logger.info(&format!("Rate limit reset for client: {}", client_id));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    use tokio::time::{sleep, Duration};
    
    fn create_test_service() -> RateLimiterService {
        let logger = Arc::new(QualiaLogger);
        let config = Arc::new(RateLimiterConfig {
            max_tokens: 10,
            refill_rate: 5.0,  // 5 tokens/sec for faster testing
            cost_per_request: 1,
        });
        RateLimiterService::new(logger, config)
    }
    
    #[tokio::test]
    async fn test_rate_limiter_allows_within_limit() {
        let service = create_test_service();
        
        // First 10 requests should succeed (max_tokens = 10)
        for i in 0..10 {
            let allowed = service.check_rate_limit("client1").await;
            assert!(allowed, "Request {} should be allowed", i + 1);
        }
    }
    
    #[tokio::test]
    async fn test_rate_limiter_blocks_over_limit() {
        let service = create_test_service();
        
        // Consume all 10 tokens
        for _ in 0..10 {
            service.check_rate_limit("client1").await;
        }
        
        // 11th request should be blocked
        let allowed = service.check_rate_limit("client1").await;
        assert!(!allowed, "Request over limit should be blocked");
    }
    
    #[tokio::test]
    async fn test_rate_limiter_token_bucket_refill() {
        let service = create_test_service();
        
        // Consume all 10 tokens
        for _ in 0..10 {
            service.check_rate_limit("client1").await;
        }
        
        // Next request should be blocked
        let allowed_before_wait = service.check_rate_limit("client1").await;
        assert!(!allowed_before_wait, "Should be blocked before refill");
        
        // Wait 1 second (refill_rate = 5 tokens/sec, so +5 tokens)
        sleep(Duration::from_secs(1)).await;
        
        // Should now have ~5 tokens available
        for i in 0..5 {
            let allowed = service.check_rate_limit("client1").await;
            assert!(allowed, "Request {} should be allowed after refill", i + 1);
        }
        
        // 6th request after refill should be blocked
        let allowed_after_refill = service.check_rate_limit("client1").await;
        assert!(!allowed_after_refill, "Should be blocked after consuming refilled tokens");
    }
    
    #[tokio::test]
    async fn test_rate_limiter_per_client_independence() {
        let service = create_test_service();
        
        // Consume all tokens for client1
        for _ in 0..10 {
            service.check_rate_limit("client1").await;
        }
        
        // client1 should be blocked
        let client1_allowed = service.check_rate_limit("client1").await;
        assert!(!client1_allowed, "client1 should be blocked");
        
        // client2 should still have full bucket
        let client2_allowed = service.check_rate_limit("client2").await;
        assert!(client2_allowed, "client2 should be allowed (independent bucket)");
    }
    
    #[tokio::test]
    async fn test_reset_client() {
        let service = create_test_service();
        
        // Consume all tokens
        for _ in 0..10 {
            service.check_rate_limit("client1").await;
        }
        
        // Should be blocked
        let allowed_before_reset = service.check_rate_limit("client1").await;
        assert!(!allowed_before_reset, "Should be blocked before reset");
        
        // Reset client
        service.reset_client("client1").await;
        
        // Should have full bucket again
        let allowed_after_reset = service.check_rate_limit("client1").await;
        assert!(allowed_after_reset, "Should be allowed after reset");
    }
}

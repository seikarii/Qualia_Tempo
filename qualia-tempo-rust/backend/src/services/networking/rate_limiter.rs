//! # Responsibility
//! Provides rate limiting for WebSocket connections to prevent abuse.
//!
//! ---
//!
//! COMPLIANCE: QUALIA.CODE.RUST §1.1 - Performance by design
//! Uses token bucket algorithm with per-connection tracking via DashMap.

use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use anyhow::{Result, bail};
use shaku::Component;
use shared_core::traits::{IRateLimiterService, ILogger};
use async_trait::async_trait;

/// # Responsibility
/// Configuration for rate limiting behavior.
#[derive(Debug, Clone)]
pub struct RateLimiterConfig {
    /// Maximum number of messages allowed in the window
    pub max_messages: u32,
    
    /// Time window duration for rate limiting
    pub window_duration: Duration,
    
    /// Burst allowance (extra messages allowed briefly)
    pub burst_capacity: u32,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            max_messages: 100,
            window_duration: Duration::from_secs(1),
            burst_capacity: 20,
        }
    }
}

/// # Responsibility
/// Tracks rate limiting state for a single connection using token bucket algorithm.
#[derive(Debug, Clone)]
pub struct ConnectionRateLimitState {
    /// Current number of available tokens
    tokens: f64,
    
    /// Last time tokens were refilled
    last_refill: Instant,
    
    /// Maximum token capacity
    capacity: f64,
    
    /// Token refill rate per second
    refill_rate: f64,
}

impl ConnectionRateLimitState {
    pub fn new(capacity: f64, refill_rate: f64) -> Self {
        Self {
            tokens: capacity,
            last_refill: Instant::now(),
            capacity,
            refill_rate,
        }
    }
    
    /// Attempts to consume one token. Returns true if allowed, false if rate limited.
    pub fn try_consume(&mut self) -> bool {
        self.refill();
        
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
    
    /// Refills tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        
        self.tokens += elapsed * self.refill_rate;
        self.tokens = self.tokens.min(self.capacity);
        self.last_refill = now;
    }
}

/// # Responsibility
/// Service for rate limiting WebSocket connections.
///
/// ---
///
/// Uses token bucket algorithm for smooth rate limiting with burst capacity.
/// Thread-safe via DashMap for concurrent connection tracking.
#[derive(Component)]
#[shaku(interface = IRateLimiterService)]
pub struct RateLimiterService {
    /// Per-connection rate limit state
    connections: Arc<DashMap<String, ConnectionRateLimitState>>,
    
    /// Configuration
    config: RateLimiterConfig,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

impl RateLimiterService {
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self::with_config(logger, RateLimiterConfig::default())
    }
    
    pub fn with_config(logger: Arc<dyn ILogger>, config: RateLimiterConfig) -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
            config,
            logger,
        }
    }
}

#[async_trait]
impl IRateLimiterService for RateLimiterService {
    /// Checks if a message is allowed for the given connection.
    ///
    /// # Errors
    /// Returns error if rate limit is exceeded.
    async fn check_rate_limit(&self, connection_id: &str) -> Result<()> {
        let capacity = f64::from(self.config.max_messages + self.config.burst_capacity);
        let refill_rate = f64::from(self.config.max_messages) 
            / self.config.window_duration.as_secs_f64();
        
        // Get or insert connection state
        let mut entry = self.connections
            .entry(connection_id.to_string())
            .or_insert_with(|| ConnectionRateLimitState::new(capacity, refill_rate));
        
        if entry.try_consume() {
            Ok(())
        } else {
            self.logger.warn(&format!(
                "Rate limit exceeded for connection: {connection_id}"
            ));
            bail!("Rate limit exceeded")
        }
    }
    
    /// Removes rate limiting state for a disconnected connection.
    async fn remove_connection(&self, connection_id: &str) {
        self.connections.remove(connection_id);
        self.logger.info(&format!(
            "Rate limiter cleaned up connection: {connection_id}"
        ));
    }
    
    /// Resets rate limit for a connection (admin override).
    async fn reset_limit(&self, connection_id: &str) {
        if let Some(mut entry) = self.connections.get_mut(connection_id) {
            entry.tokens = entry.capacity;
            self.logger.info(&format!(
                "Rate limit reset for connection: {connection_id}"
            ));
        }
    }
}

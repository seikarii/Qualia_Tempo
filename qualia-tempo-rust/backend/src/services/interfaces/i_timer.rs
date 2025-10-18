//! # Responsibility
//! Defines the `ITimer` trait interface for precise time management.
//!
//! ---
//!
//! Used for game tick synchronization, cooldown management, and performance
//! metrics. Implementation uses `tokio::time` for async-compatible timing.

use shaku::Interface;
use std::time::{Duration, Instant};

/// # Responsibility
/// Provides high-precision timing services for gameplay synchronization.
///
/// ---
///
/// Implemented by `TimerService` in services/core/timer.rs, wrapping
/// `tokio::time` for async compatibility.
pub trait ITimer: Interface {
    /// Get current elapsed time since timer start
    fn elapsed(&self) -> Duration;

    /// Get current instant (monotonic clock)
    fn now(&self) -> Instant;

    /// Reset timer to zero
    fn reset(&mut self);
}

//! # Responsibility
//! Provides high-precision timing services for gameplay synchronization.
//!
//! ---
//!
//! Uses `std::time::Instant` for monotonic clock access, ensuring accurate
//! timing even during system clock adjustments.

use crate::services::interfaces::ITimer;
use shaku::Component;
use std::time::{Duration, Instant};

/// # Responsibility
/// Implements precise time tracking for game mechanics and performance metrics.
///
/// ---
///
/// Wraps `std::time::Instant` to provide a monotonic clock that is immune to
/// system clock adjustments. Used for:
/// - Game tick synchronization
/// - Cooldown management
/// - Performance metrics
/// - Frame time calculations
///
/// # Thread Safety
/// Instant is Copy and safe to use across threads.
#[derive(Component)]
#[shaku(interface = ITimer)]
pub struct TimerService {
    start_time: Instant,
}

impl TimerService {
    /// Create a new `TimerService`, starting from current instant
    #[must_use]
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
        }
    }
}

impl ITimer for TimerService {
    fn elapsed(&self) -> Duration {
        self.start_time.elapsed()
    }

    fn now(&self) -> Instant {
        Instant::now()
    }

    fn reset(&mut self) {
        self.start_time = Instant::now();
    }
}

impl Default for TimerService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_timer_elapsed() {
        let timer = TimerService::new();
        
        // Wait a bit
        thread::sleep(Duration::from_millis(10));
        
        let elapsed = timer.elapsed();
        assert!(elapsed >= Duration::from_millis(10), "Elapsed time should be at least 10ms");
    }

    #[test]
    fn test_timer_reset() {
        let mut timer = TimerService::new();
        
        thread::sleep(Duration::from_millis(10));
        let elapsed_before = timer.elapsed();
        assert!(elapsed_before >= Duration::from_millis(10));
        
        // Reset timer
        timer.reset();
        
        let elapsed_after = timer.elapsed();
        assert!(elapsed_after < elapsed_before, "Elapsed time after reset should be less than before");
    }

    #[test]
    fn test_timer_now_monotonic() {
        let timer = TimerService::new();
        
        let now1 = timer.now();
        thread::sleep(Duration::from_millis(1));
        let now2 = timer.now();
        
        assert!(now2 > now1, "Time should be monotonically increasing");
    }

    #[test]
    fn test_timer_default() {
        let timer = TimerService::default();
        assert!(timer.elapsed() < Duration::from_millis(10), "Default timer should start from now");
    }
}

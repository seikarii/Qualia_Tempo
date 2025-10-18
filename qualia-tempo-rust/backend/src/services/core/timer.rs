//! # Responsibility
//! Provides timing utilities using tokio::time.

use shaku::Component;
use tokio::time::{Duration, Instant};
use shared_core::traits::IBaseService;
use async_trait::async_trait;
use anyhow::Result;

/// # Responsibility
/// Manages timing operations for the backend.
#[derive(Component)]
#[shaku(interface = IBaseService)]
pub struct TimerService {
    #[shaku(default = Instant::now())]
    start_time: Instant,
}

impl TimerService {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
        }
    }

    #[allow(clippy::cast_possible_truncation)]
    pub fn elapsed_ms(&self) -> u64 {
        self.start_time.elapsed().as_millis() as u64
    }

    pub async fn sleep(&self, ms: u64) {
        tokio::time::sleep(Duration::from_millis(ms)).await;
    }
}

#[async_trait]
impl IBaseService for TimerService {
    async fn initialize(&self) -> Result<()> {
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        Ok(())
    }

    fn name(&self) -> &'static str {
        "TimerService"
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

    #[tokio::test]
    async fn test_timer_elapsed() {
        let timer = TimerService::new();
        tokio::time::sleep(Duration::from_millis(100)).await;
        let elapsed = timer.elapsed_ms();
        assert!(elapsed >= 100, "Timer should measure at least 100ms");
    }

    #[tokio::test]
    async fn test_timer_sleep() {
        let timer = TimerService::new();
        let start = Instant::now();
        timer.sleep(50).await;
        let elapsed = start.elapsed().as_millis();
        assert!(elapsed >= 50, "Sleep should wait at least 50ms");
    }
}

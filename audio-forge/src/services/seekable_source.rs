//! # Responsibility
//! Provides sample-accurate seeking by consuming and discarding samples until target position.

use rodio::Source;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

/// # Responsibility
/// Wrapper source that skips initial samples to implement seeking.
///
/// ---
///
/// Since rodio's Sink doesn't support native seeking on custom sources,
/// this wrapper consumes (and discards) samples until reaching the target
/// seek position, then begins yielding samples normally.
///
/// The sample counter is updated atomically to reflect the actual position.
pub struct SeekableSource<S> {
    inner: S,
    /// Target sample to start yielding (all samples before this are skipped)
    skip_until_sample: u64,
    /// Current sample count
    current_sample: u64,
    /// Shared counter for external position queries
    sample_counter: Arc<AtomicU64>,
}

impl<S> SeekableSource<S>
where
    S: Source<Item = f32>,
{
    /// Create a new SeekableSource that will skip to the specified sample position.
    ///
    /// # Arguments
    /// * `inner` - The underlying audio source
    /// * `skip_to_sample` - Number of samples to skip before yielding
    /// * `sample_counter` - Shared atomic counter for position tracking
    pub fn new(inner: S, skip_to_sample: u64, sample_counter: Arc<AtomicU64>) -> Self {
        // Initialize counter to target position
        sample_counter.store(skip_to_sample, Ordering::Relaxed);
        
        Self {
            inner,
            skip_until_sample: skip_to_sample,
            current_sample: 0,
            sample_counter,
        }
    }
}

impl<S> Iterator for SeekableSource<S>
where
    S: Source<Item = f32>,
{
    type Item = f32;

    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        loop {
            let sample = self.inner.next()?;
            
            if self.current_sample < self.skip_until_sample {
                // Still in skip phase - consume and discard
                self.current_sample += 1;
                continue;
            } else {
                // Past skip point - yield samples normally and update counter
                self.current_sample += 1;
                self.sample_counter.store(self.current_sample, Ordering::Relaxed);
                return Some(sample);
            }
        }
    }

    #[inline]
    fn size_hint(&self) -> (usize, Option<usize>) {
        let (lower, upper) = self.inner.size_hint();
        let remaining_skip = self.skip_until_sample.saturating_sub(self.current_sample) as usize;
        
        (
            lower.saturating_sub(remaining_skip),
            upper.map(|u| u.saturating_sub(remaining_skip))
        )
    }
}

impl<S> Source for SeekableSource<S>
where
    S: Source<Item = f32>,
{
    #[inline]
    fn current_span_len(&self) -> Option<usize> {
        self.inner.current_span_len()
    }

    #[inline]
    fn channels(&self) -> u16 {
        self.inner.channels()
    }

    #[inline]
    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    #[inline]
    fn total_duration(&self) -> Option<Duration> {
        // Total duration remains the same as inner source
        self.inner.total_duration()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::atomic::AtomicU64;

    /// Mock source that generates sequential samples
    struct MockSource {
        current: f32,
        max: usize,
        count: usize,
    }

    impl MockSource {
        fn new(count: usize) -> Self {
            Self {
                current: 0.0,
                max: count,
                count: 0,
            }
        }
    }

    impl Iterator for MockSource {
        type Item = f32;

        fn next(&mut self) -> Option<Self::Item> {
            if self.count >= self.max {
                return None;
            }
            let sample = self.current;
            self.current += 1.0;
            self.count += 1;
            Some(sample)
        }
    }

    impl Source for MockSource {
        fn current_span_len(&self) -> Option<usize> {
            Some(1)
        }

        fn channels(&self) -> u16 {
            1
        }

        fn sample_rate(&self) -> u32 {
            44100
        }

        fn total_duration(&self) -> Option<Duration> {
            Some(Duration::from_secs(1))
        }
    }

    #[test]
    fn test_seekable_source_skips_to_position() {
        let mock = MockSource::new(100);
        let counter = Arc::new(AtomicU64::new(0));
        
        let mut seekable = SeekableSource::new(mock, 50, counter.clone());
        
        // First sample yielded should be sample #50 (0-indexed, so value is 50.0)
        let first = seekable.next();
        assert_eq!(first, Some(50.0));
        
        // Counter should be at 51 (we've consumed 51 samples total, skipped 50)
        assert_eq!(counter.load(Ordering::Relaxed), 51);
    }

    #[test]
    fn test_seekable_source_zero_skip() {
        let mock = MockSource::new(10);
        let counter = Arc::new(AtomicU64::new(0));
        
        let mut seekable = SeekableSource::new(mock, 0, counter.clone());
        
        // Should start yielding immediately
        assert_eq!(seekable.next(), Some(0.0));
        assert_eq!(seekable.next(), Some(1.0));
        assert_eq!(counter.load(Ordering::Relaxed), 2);
    }

    #[test]
    fn test_seekable_source_exhausts_correctly() {
        let mock = MockSource::new(10);
        let counter = Arc::new(AtomicU64::new(0));
        
        let mut seekable = SeekableSource::new(mock, 8, counter);
        
        // Should yield samples 8, 9, then None
        assert_eq!(seekable.next(), Some(8.0));
        assert_eq!(seekable.next(), Some(9.0));
        assert_eq!(seekable.next(), None);
    }
}

//! # Responsibility
//! Wrapper around rodio Source that captures audio samples for real-time analysis.

use rodio::Source;
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// # Responsibility
/// Thread-safe circular buffer for audio samples.
///
/// ---
///
/// Stores the most recent N samples for FFT analysis.
/// Uses circular buffer to prevent unbounded memory growth.
#[derive(Clone)]
pub struct SampleBuffer {
    samples: Arc<Mutex<Vec<f32>>>,
    capacity: usize,
}

impl SampleBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            samples: Arc::new(Mutex::new(Vec::with_capacity(capacity))),
            capacity,
        }
    }

    /// # Responsibility
    /// Add samples to buffer, maintaining circular behavior.
    pub fn push_samples(&self, new_samples: &[f32]) {
        let mut buffer = self.samples.lock().unwrap();
        
        // If buffer would exceed capacity, remove oldest samples
        let total_len = buffer.len() + new_samples.len();
        if total_len > self.capacity {
            let overflow = total_len - self.capacity;
            buffer.drain(0..overflow);
        }
        
        buffer.extend_from_slice(new_samples);
    }

    /// # Responsibility
    /// Get snapshot of current buffer for analysis.
    pub fn get_samples(&self) -> Vec<f32> {
        self.samples.lock().unwrap().clone()
    }

    /// # Responsibility
    /// Clear buffer (used on stop/seek).
    pub fn clear(&self) {
        self.samples.lock().unwrap().clear();
    }
}

/// # Responsibility
/// Wrapper around rodio Source that captures samples during playback.
///
/// ---
///
/// Implements the Source trait, forwarding all calls while intercepting
/// sample data for real-time visualization.
pub struct AnalyzingSource<S>
where
    S: Source<Item = f32>,
{
    inner: S,
    buffer: SampleBuffer,
    chunk_size: usize,
    chunk_accumulator: Vec<f32>,
}

impl<S> AnalyzingSource<S>
where
    S: Source<Item = f32>,
{
    /// # Responsibility
    /// Create new analyzing source with specified buffer capacity.
    ///
    /// ---
    ///
    /// Chunk size determines how many samples to accumulate before
    /// writing to buffer (reduces lock contention).
    pub fn new(source: S, buffer_capacity: usize, chunk_size: usize) -> Self {
        Self {
            inner: source,
            buffer: SampleBuffer::new(buffer_capacity),
            chunk_size,
            chunk_accumulator: Vec::with_capacity(chunk_size),
        }
    }

    /// Get reference to the sample buffer
    pub fn buffer(&self) -> SampleBuffer {
        self.buffer.clone()
    }
}

impl<S> Iterator for AnalyzingSource<S>
where
    S: Source<Item = f32>,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.inner.next()?;
        
        // Accumulate samples in chunk
        self.chunk_accumulator.push(sample);
        
        // When chunk is full, write to buffer
        if self.chunk_accumulator.len() >= self.chunk_size {
            self.buffer.push_samples(&self.chunk_accumulator);
            self.chunk_accumulator.clear();
        }
        
        Some(sample)
    }
}

impl<S> Source for AnalyzingSource<S>
where
    S: Source<Item = f32>,
{
    fn current_span_len(&self) -> Option<usize> {
        self.inner.current_span_len()
    }

    fn channels(&self) -> u16 {
        self.inner.channels()
    }

    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<Duration> {
        self.inner.total_duration()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sample_buffer_creation() {
        let buffer = SampleBuffer::new(1000);
        assert_eq!(buffer.get_samples().len(), 0);
    }

    #[test]
    fn test_sample_buffer_push() {
        let buffer = SampleBuffer::new(1000);
        buffer.push_samples(&[1.0, 2.0, 3.0]);
        
        let samples = buffer.get_samples();
        assert_eq!(samples.len(), 3);
        assert_eq!(samples[0], 1.0);
        assert_eq!(samples[1], 2.0);
        assert_eq!(samples[2], 3.0);
    }

    #[test]
    fn test_sample_buffer_circular() {
        let buffer = SampleBuffer::new(5);
        
        // Fill buffer
        buffer.push_samples(&[1.0, 2.0, 3.0, 4.0, 5.0]);
        assert_eq!(buffer.get_samples().len(), 5);
        
        // Overflow: should drop oldest
        buffer.push_samples(&[6.0, 7.0]);
        let samples = buffer.get_samples();
        assert_eq!(samples.len(), 5);
        assert_eq!(samples[0], 3.0); // 1.0 and 2.0 dropped
        assert_eq!(samples[4], 7.0);
    }

    #[test]
    fn test_sample_buffer_clear() {
        let buffer = SampleBuffer::new(1000);
        buffer.push_samples(&[1.0, 2.0, 3.0]);
        buffer.clear();
        assert_eq!(buffer.get_samples().len(), 0);
    }
}

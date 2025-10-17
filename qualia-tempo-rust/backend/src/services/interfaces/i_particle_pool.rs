//! # Responsibility
//! Particle pool service interface for CPU-intensive particle computations.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;

/// # Responsibility
/// Job description for particle update computation.
#[derive(Debug, Clone)]
pub struct ParticleUpdateJob {
    pub job_id: String,
    pub particle_count: usize,
    pub delta_time: f32,
}

/// # Responsibility
/// Result of particle update computation.
#[derive(Debug, Clone)]
pub struct ParticleUpdateResult {
    pub job_id: String,
    pub positions: Vec<(f32, f32, f32)>,
    pub velocities: Vec<(f32, f32, f32)>,
    pub compute_time_ms: f64,
}

/// # Responsibility
/// Manages pool of Tokio tasks for CPU-intensive particle computations.
///
/// ---
///
/// This service provides:
/// - Tokio task pool for particle physics calculations
/// - spawn_blocking for CPU-intensive work offloading
/// - Work queue with mpsc channels
/// - Load balancing across worker tasks
/// - Graceful shutdown and worker recovery
#[async_trait]
pub trait IParticlePoolService: Interface {
    /// Starts the particle pool service with N worker tasks.
    ///
    /// # Arguments
    /// * `worker_count` - Number of worker tasks to spawn (typically num_cpus::get())
    async fn start(&self, worker_count: usize) -> Result<()>;
    
    /// Submits a particle update job to the pool.
    ///
    /// # Arguments
    /// * `job` - The particle update job to process
    ///
    /// # Returns
    /// Job ID for tracking
    async fn submit_job(&self, job: ParticleUpdateJob) -> Result<String>;
    
    /// Polls for completed particle update results.
    ///
    /// # Returns
    /// Next available result, or None if queue is empty
    async fn poll_result(&self) -> Option<ParticleUpdateResult>;
    
    /// Returns the number of active worker tasks.
    fn get_worker_count(&self) -> usize;
    
    /// Returns the number of pending jobs in the queue.
    fn get_pending_job_count(&self) -> usize;
    
    /// Shuts down the particle pool, completing pending jobs.
    async fn shutdown(&self) -> Result<()>;
}

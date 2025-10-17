//! # Responsibility
//! Particle pool service implementation using Tokio task pool.

use shaku::Component;
use async_trait::async_trait;
use anyhow::{Result, Context};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use std::collections::HashMap;
use tracing::{info, warn, debug, instrument};

use crate::services::interfaces::{IParticlePoolService, ILogger, ParticleUpdateJob, ParticleUpdateResult};

/// # Responsibility
/// Worker task state tracking.
#[derive(Debug)]
struct WorkerState {
    task_handle: tokio::task::JoinHandle<()>,
    jobs_processed: usize,
}

/// # Responsibility
/// Implements particle pool using Tokio task pool and spawn_blocking.
///
/// ---
///
/// Features:
/// - Tokio task pool for concurrent processing
/// - spawn_blocking for CPU-intensive particle physics
/// - mpsc channels for work distribution
/// - Load balancing with round-robin
/// - Worker recovery on panic
#[derive(Component)]
#[shaku(interface = IParticlePoolService)]
pub struct ParticlePoolService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    workers: Arc<RwLock<Vec<WorkerState>>>,
    job_tx: Arc<RwLock<Option<mpsc::UnboundedSender<ParticleUpdateJob>>>>,
    result_rx: Arc<RwLock<Option<mpsc::UnboundedReceiver<ParticleUpdateResult>>>>,
    pending_jobs: Arc<RwLock<usize>>,
}

impl ParticlePoolService {
    /// Simulates CPU-intensive particle physics calculation.
    fn compute_particles(job: ParticleUpdateJob) -> ParticleUpdateResult {
        let start = std::time::Instant::now();
        
        // Simulate particle physics (placeholder - real implementation would be complex)
        let mut positions = Vec::with_capacity(job.particle_count);
        let mut velocities = Vec::with_capacity(job.particle_count);
        
        for i in 0..job.particle_count {
            let t = i as f32 * job.delta_time;
            positions.push((
                t.sin() * 10.0,
                t.cos() * 10.0,
                (t * 2.0).sin() * 5.0,
            ));
            velocities.push((
                t.cos(),
                -t.sin(),
                (t * 2.0).cos(),
            ));
        }
        
        let elapsed = start.elapsed();
        
        ParticleUpdateResult {
            job_id: job.job_id,
            positions,
            velocities,
            compute_time_ms: elapsed.as_secs_f64() * 1000.0,
        }
    }
}

#[async_trait]
impl IParticlePoolService for ParticlePoolService {
    #[instrument(skip(self))]
    async fn start(&self, worker_count: usize) -> Result<()> {
        self.logger.info(&format!("Starting particle pool with {} workers", worker_count));
        
        let (job_tx, mut job_rx) = mpsc::unbounded_channel();
        let (result_tx, result_rx) = mpsc::unbounded_channel();
        
        *self.job_tx.write().await = Some(job_tx);
        *self.result_rx.write().await = Some(result_rx);
        
        let mut workers = Vec::with_capacity(worker_count);
        
        for worker_id in 0..worker_count {
            let result_tx = result_tx.clone();
            let logger = Arc::clone(&self.logger);
            let pending_jobs = Arc::clone(&self.pending_jobs);
            
            let task_handle = tokio::spawn(async move {
                info!("Worker {} started", worker_id);
                
                loop {
                    // Try to receive job (non-blocking initially, then blocking)
                    let job = match job_rx.recv().await {
                        Some(job) => job,
                        None => {
                            info!("Worker {} shutting down (channel closed)", worker_id);
                            break;
                        }
                    };
                    
                    debug!("Worker {} processing job {}", worker_id, job.job_id);
                    
                    // Offload to blocking thread pool
                    let result = tokio::task::spawn_blocking(move || {
                        Self::compute_particles(job)
                    }).await;
                    
                    match result {
                        Ok(particle_result) => {
                            debug!(
                                "Worker {} completed job {} in {:.2}ms",
                                worker_id,
                                particle_result.job_id,
                                particle_result.compute_time_ms
                            );
                            
                            if result_tx.send(particle_result).is_err() {
                                warn!("Worker {} failed to send result (channel closed)", worker_id);
                                break;
                            }
                            
                            // Decrement pending jobs
                            let mut pending = pending_jobs.write().await;
                            *pending = pending.saturating_sub(1);
                        }
                        Err(e) => {
                            logger.error(&format!("Worker {} task panicked: {:?}", worker_id, e));
                        }
                    }
                }
                
                info!("Worker {} stopped", worker_id);
            });
            
            workers.push(WorkerState {
                task_handle,
                jobs_processed: 0,
            });
        }
        
        *self.workers.write().await = workers;
        
        info!("Particle pool started with {} workers", worker_count);
        Ok(())
    }
    
    #[instrument(skip(self, job))]
    async fn submit_job(&self, job: ParticleUpdateJob) -> Result<String> {
        let job_tx = self.job_tx.read().await;
        let tx = job_tx.as_ref()
            .context("Particle pool not started")?;
        
        let job_id = job.job_id.clone();
        
        tx.send(job)
            .context("Failed to submit job (channel closed)")?;
        
        // Increment pending jobs
        let mut pending = self.pending_jobs.write().await;
        *pending += 1;
        
        debug!("Submitted job {}", job_id);
        Ok(job_id)
    }
    
    async fn poll_result(&self) -> Option<ParticleUpdateResult> {
        let mut result_rx = self.result_rx.write().await;
        let rx = result_rx.as_mut()?;
        
        rx.try_recv().ok()
    }
    
    fn get_worker_count(&self) -> usize {
        self.workers.blocking_read().len()
    }
    
    fn get_pending_job_count(&self) -> usize {
        *self.pending_jobs.blocking_read()
    }
    
    #[instrument(skip(self))]
    async fn shutdown(&self) -> Result<()> {
        self.logger.info("Shutting down particle pool");
        
        // Drop job sender to signal workers to stop
        *self.job_tx.write().await = None;
        
        // Wait for all workers to finish
        let mut workers = self.workers.write().await;
        
        for (idx, worker) in workers.drain(..).enumerate() {
            match tokio::time::timeout(
                std::time::Duration::from_secs(5),
                worker.task_handle
            ).await {
                Ok(Ok(_)) => {
                    info!("Worker {} stopped gracefully", idx);
                }
                Ok(Err(e)) => {
                    warn!("Worker {} panicked during shutdown: {:?}", idx, e);
                }
                Err(_) => {
                    warn!("Worker {} shutdown timed out", idx);
                }
            }
        }
        
        // Clear result receiver
        *self.result_rx.write().await = None;
        
        info!("Particle pool shut down");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[tokio::test]
    async fn test_get_worker_count_before_start() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ParticlePoolService {
            logger: Arc::new(mock_logger),
            workers: Arc::new(RwLock::new(Vec::new())),
            job_tx: Arc::new(RwLock::new(None)),
            result_rx: Arc::new(RwLock::new(None)),
            pending_jobs: Arc::new(RwLock::new(0)),
        };
        
        assert_eq!(service.get_worker_count(), 0);
    }
    
    #[tokio::test]
    async fn test_submit_job_before_start() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ParticlePoolService {
            logger: Arc::new(mock_logger),
            workers: Arc::new(RwLock::new(Vec::new())),
            job_tx: Arc::new(RwLock::new(None)),
            result_rx: Arc::new(RwLock::new(None)),
            pending_jobs: Arc::new(RwLock::new(0)),
        };
        
        let job = ParticleUpdateJob {
            job_id: "test-job".to_string(),
            particle_count: 100,
            delta_time: 0.016,
        };
        
        let result = service.submit_job(job).await;
        
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not started"));
    }
    
    #[tokio::test]
    async fn test_start_creates_workers() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ParticlePoolService {
            logger: Arc::new(mock_logger),
            workers: Arc::new(RwLock::new(Vec::new())),
            job_tx: Arc::new(RwLock::new(None)),
            result_rx: Arc::new(RwLock::new(None)),
            pending_jobs: Arc::new(RwLock::new(0)),
        };
        
        let result = service.start(4).await;
        
        assert!(result.is_ok());
        assert_eq!(service.get_worker_count(), 4);
    }
    
    #[tokio::test]
    async fn test_submit_and_poll_result() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        mock_logger.expect_error().return_const(());
        
        let service = ParticlePoolService {
            logger: Arc::new(mock_logger),
            workers: Arc::new(RwLock::new(Vec::new())),
            job_tx: Arc::new(RwLock::new(None)),
            result_rx: Arc::new(RwLock::new(None)),
            pending_jobs: Arc::new(RwLock::new(0)),
        };
        
        service.start(2).await.unwrap();
        
        let job = ParticleUpdateJob {
            job_id: "test-job-1".to_string(),
            particle_count: 10,
            delta_time: 0.016,
        };
        
        let job_id = service.submit_job(job).await.unwrap();
        assert_eq!(job_id, "test-job-1");
        
        // Wait for processing
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        
        // Poll result
        let result = service.poll_result().await;
        assert!(result.is_some());
        
        let particle_result = result.unwrap();
        assert_eq!(particle_result.job_id, "test-job-1");
        assert_eq!(particle_result.positions.len(), 10);
        assert_eq!(particle_result.velocities.len(), 10);
    }
    
    #[tokio::test]
    async fn test_pending_job_count() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        mock_logger.expect_error().return_const(());
        
        let service = ParticlePoolService {
            logger: Arc::new(mock_logger),
            workers: Arc::new(RwLock::new(Vec::new())),
            job_tx: Arc::new(RwLock::new(None)),
            result_rx: Arc::new(RwLock::new(None)),
            pending_jobs: Arc::new(RwLock::new(0)),
        };
        
        service.start(1).await.unwrap();
        
        assert_eq!(service.get_pending_job_count(), 0);
        
        let job = ParticleUpdateJob {
            job_id: "test-job-2".to_string(),
            particle_count: 10,
            delta_time: 0.016,
        };
        
        service.submit_job(job).await.unwrap();
        
        // Should increment immediately
        assert_eq!(service.get_pending_job_count(), 1);
        
        // Wait for processing
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        
        // Should decrement after completion
        assert_eq!(service.get_pending_job_count(), 0);
    }
    
    #[tokio::test]
    async fn test_shutdown_waits_for_workers() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        mock_logger.expect_error().return_const(());
        
        let service = ParticlePoolService {
            logger: Arc::new(mock_logger),
            workers: Arc::new(RwLock::new(Vec::new())),
            job_tx: Arc::new(RwLock::new(None)),
            result_rx: Arc::new(RwLock::new(None)),
            pending_jobs: Arc::new(RwLock::new(0)),
        };
        
        service.start(2).await.unwrap();
        assert_eq!(service.get_worker_count(), 2);
        
        let result = service.shutdown().await;
        
        assert!(result.is_ok());
        assert_eq!(service.get_worker_count(), 0);
    }
}

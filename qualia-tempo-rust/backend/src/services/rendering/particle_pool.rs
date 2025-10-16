//! # Responsibility
//! Manages a pool of Tokio tasks for particle simulation.
//!
//! ---
//!
//! Prevents blocking the Axum server threads with CPU-intensive particle updates.
//! Uses tokio::task::spawn_blocking for compute-heavy operations.
//! This service offloads physics calculations from the network I/O threads.

use tokio::sync::mpsc;
use std::sync::Arc;
use anyhow::{Result, Context};
use shaku::{Component, Interface};
use shared_core::contracts::particles::{OptimizedParticle, ParticleSystemConfig};
use crate::services::infrastructure::ILogger;

/// # Responsibility
/// Configuration for the particle engine worker pool.
#[derive(Debug, Clone)]
pub struct ParticlePoolConfig {
    /// Number of worker tasks in the pool
    pub num_workers: usize,
    
    /// Channel capacity for work requests
    pub work_queue_capacity: usize,
    
    /// Channel capacity for results
    pub result_queue_capacity: usize,
    
    /// Enable performance metrics
    pub enable_metrics: bool,
}

impl Default for ParticlePoolConfig {
    fn default() -> Self {
        Self {
            num_workers: 4, // 4 dedicated Tokio tasks
            work_queue_capacity: 100,
            result_queue_capacity: 100,
            enable_metrics: false,
        }
    }
}

/// # Responsibility
/// Represents a work request for particle simulation.
#[derive(Debug, Clone)]
pub struct ParticleWorkRequest {
    /// Unique ID for tracking this work
    pub request_id: u64,
    
    /// Current particle state to update
    pub particles: Vec<OptimizedParticle>,
    
    /// Delta time for physics integration (seconds)
    pub delta_time: f32,
    
    /// System configuration (gravity, forces, etc.)
    pub config: ParticleSystemConfig,
}

/// # Responsibility
/// Represents the result of particle simulation.
#[derive(Debug, Clone)]
pub struct ParticleWorkResult {
    /// Matches the request_id from ParticleWorkRequest
    pub request_id: u64,
    
    /// Updated particle state after physics simulation
    pub particles: Vec<OptimizedParticle>,
}

/// # Responsibility
/// Interface for particle engine worker pool.
pub trait IParticlePoolService: Interface {
    /// Submits work to the pool (non-blocking)
    fn submit_work(&self, request: ParticleWorkRequest) -> Result<()>;
    
    /// Attempts to retrieve a completed result (non-blocking)
    fn try_get_result(&self) -> Option<ParticleWorkResult>;
}

/// # Responsibility
/// Manages a pool of Tokio tasks for particle simulation.
///
/// ---
///
/// Uses tokio::task::spawn_blocking to offload CPU-intensive particle physics
/// calculations, preventing blocking of the Axum server's async runtime.
#[derive(Component)]
#[shaku(interface = IParticlePoolService)]
pub struct ParticlePoolService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<ParticlePoolConfig>,
    work_tx: mpsc::UnboundedSender<ParticleWorkRequest>,
    result_rx: Arc<tokio::sync::Mutex<mpsc::UnboundedReceiver<ParticleWorkResult>>>,
}

impl ParticlePoolService {
    /// Creates a new particle pool with the given configuration.
    pub fn new(logger: Arc<dyn ILogger>, config: Arc<ParticlePoolConfig>) -> Self {
        let (work_tx, work_rx) = mpsc::unbounded_channel();
        let (result_tx, result_rx) = mpsc::unbounded_channel();
        
        // Spawn worker pool
        Self::spawn_workers(
            config.clone(),
            work_rx,
            result_tx,
            logger.clone(),
        );
        
        logger.info(&format!(
            "ParticlePoolService initialized with {} workers",
            config.num_workers
        ));
        
        Self {
            logger,
            config,
            work_tx,
            result_rx: Arc::new(tokio::sync::Mutex::new(result_rx)),
        }
    }
    
    fn spawn_workers(
        config: Arc<ParticlePoolConfig>,
        work_rx: mpsc::UnboundedReceiver<ParticleWorkRequest>,
        result_tx: mpsc::UnboundedSender<ParticleWorkResult>,
        logger: Arc<dyn ILogger>,
    ) {
        // Wrap work_rx in Arc<Mutex> so workers can share it
        let work_rx = Arc::new(tokio::sync::Mutex::new(work_rx));
        
        for worker_id in 0..config.num_workers {
            let work_rx_clone = Arc::clone(&work_rx);
            let result_tx_clone = result_tx.clone();
            let logger_clone = logger.clone();
            
            tokio::spawn(async move {
                logger_clone.info(&format!("Particle worker {} started", worker_id));
                
                loop {
                    // Wait for work (all workers share the same receiver)
                    let request = {
                        let mut rx = work_rx_clone.lock().await;
                        match rx.recv().await {
                            Some(req) => req,
                            None => {
                                logger_clone.warn(&format!(
                                    "Particle worker {} shutting down (channel closed)",
                                    worker_id
                                ));
                                break;
                            }
                        }
                    };
                    
                    let request_id = request.request_id;
                    
                    // Offload CPU-intensive work to blocking thread pool
                    let result = tokio::task::spawn_blocking(move || {
                        Self::calculate_particles(request)
                    })
                    .await;
                    
                    match result {
                        Ok(particles) => {
                            let work_result = ParticleWorkResult {
                                request_id,
                                particles,
                            };
                            
                            if let Err(e) = result_tx_clone.send(work_result) {
                                logger_clone.error(&format!(
                                    "Failed to send particle result: {:?}",
                                    e
                                ));
                            }
                        }
                        Err(e) => {
                            logger_clone.error(&format!(
                                "Particle calculation panic: {:?}",
                                e
                            ));
                        }
                    }
                }
            });
        }
    }
    
    /// Performs CPU-intensive particle physics calculation.
    ///
    /// CRITICAL: This runs on a blocking thread pool thread via spawn_blocking.
    fn calculate_particles(request: ParticleWorkRequest) -> Vec<OptimizedParticle> {
        let delta_time = request.delta_time;
        let config = request.config;
        
        request
            .particles
            .into_iter()
            .map(|mut particle| {
                if !particle.is_alive {
                    return particle;
                }
                
                // Update age
                particle.age += delta_time;
                
                // Kill particle if lifetime exceeded
                if particle.age >= particle.lifetime {
                    particle.is_alive = false;
                    return particle;
                }
                
                // Apply gravity
                particle.velocity.x += config.gravity.x * delta_time;
                particle.velocity.y += config.gravity.y * delta_time;
                particle.velocity.z += config.gravity.z * delta_time;
                
                // Update position (Euler integration)
                particle.position.x += particle.velocity.x * delta_time;
                particle.position.y += particle.velocity.y * delta_time;
                particle.position.z += particle.velocity.z * delta_time;
                
                // Interpolate size
                let t = particle.age / particle.lifetime;
                particle.size = config.size_start * (1.0 - t) + config.size_end * t;
                
                // Interpolate color
                particle.color[0] = config.color_gradient.start_color[0] * (1.0 - t)
                    + config.color_gradient.end_color[0] * t;
                particle.color[1] = config.color_gradient.start_color[1] * (1.0 - t)
                    + config.color_gradient.end_color[1] * t;
                particle.color[2] = config.color_gradient.start_color[2] * (1.0 - t)
                    + config.color_gradient.end_color[2] * t;
                particle.color[3] = config.color_gradient.start_color[3] * (1.0 - t)
                    + config.color_gradient.end_color[3] * t;
                
                particle
            })
            .collect()
    }
}

impl IParticlePoolService for ParticlePoolService {
    fn submit_work(&self, request: ParticleWorkRequest) -> Result<()> {
        self.work_tx
            .send(request)
            .context("Failed to submit particle work (channel closed)")?;
        
        Ok(())
    }
    
    fn try_get_result(&self) -> Option<ParticleWorkResult> {
        // Non-blocking poll
        let mut rx = self.result_rx.try_lock().ok()?;
        rx.try_recv().ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    use shared_core::utils::math::Vector3;
    use shared_core::contracts::particles::{EmissionShape, ColorGradient, ParticleBlendMode};
    
    fn create_test_service() -> ParticlePoolService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let config = Arc::new(ParticlePoolConfig {
            num_workers: 2,
            work_queue_capacity: 10,
            result_queue_capacity: 10,
            enable_metrics: false,
        });
        
        ParticlePoolService::new(logger, config)
    }
    
    fn create_test_config() -> ParticleSystemConfig {
        ParticleSystemConfig {
            id: "test".to_string(),
            max_particles: 100,
            emission_rate: 10.0,
            lifetime: 2.0,
            emission_shape: EmissionShape::Point,
            initial_velocity: Vector3::Y,
            velocity_variance: Vector3::ZERO,
            gravity: Vector3 { x: 0.0, y: -9.8, z: 0.0 },
            size_start: 1.0,
            size_end: 0.0,
            color_gradient: ColorGradient {
                start_color: [1.0, 1.0, 1.0, 1.0],
                end_color: [1.0, 1.0, 1.0, 0.0],
            },
            blend_mode: ParticleBlendMode::Additive,
            texture_path: "test.png".to_string(),
        }
    }
    
    #[tokio::test]
    async fn test_particle_pool_creation() {
        let service = create_test_service();
        assert!(service.config.num_workers == 2);
    }
    
    #[tokio::test]
    async fn test_submit_work_succeeds() {
        let service = create_test_service();
        
        let request = ParticleWorkRequest {
            request_id: 1,
            particles: vec![OptimizedParticle {
                position: Vector3::ZERO,
                velocity: Vector3::Y,
                color: [1.0, 1.0, 1.0, 1.0],
                size: 1.0,
                lifetime: 1.0,
                age: 0.0,
                is_alive: true,
            }],
            delta_time: 0.016,
            config: create_test_config(),
        };
        
        let result = service.submit_work(request);
        assert!(result.is_ok(), "Should submit work successfully");
    }
    
    #[tokio::test]
    async fn test_particle_physics_integration() {
        let service = create_test_service();
        
        let initial_position = Vector3 { x: 0.0, y: 10.0, z: 0.0 };
        
        let request = ParticleWorkRequest {
            request_id: 1,
            particles: vec![OptimizedParticle {
                position: initial_position,
                velocity: Vector3::ZERO,
                color: [1.0, 1.0, 1.0, 1.0],
                size: 1.0,
                lifetime: 2.0,
                age: 0.0,
                is_alive: true,
            }],
            delta_time: 0.1, // 100ms timestep
            config: create_test_config(),
        };
        
        service.submit_work(request).unwrap();
        
        // Wait for result
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        let result = service.try_get_result();
        assert!(result.is_some(), "Should receive result");
        
        let work_result = result.unwrap();
        assert_eq!(work_result.request_id, 1);
        assert_eq!(work_result.particles.len(), 1);
        
        let updated_particle = &work_result.particles[0];
        
        // Gravity should have moved particle down
        assert!(
            updated_particle.position.y < initial_position.y,
            "Gravity should pull particle down (expected < {}, got {})",
            initial_position.y,
            updated_particle.position.y
        );
        
        // Age should have increased
        assert!(updated_particle.age > 0.0, "Age should increase");
        assert!(updated_particle.is_alive, "Particle should still be alive");
    }
    
    #[tokio::test]
    async fn test_particle_dies_after_lifetime() {
        let service = create_test_service();
        
        let request = ParticleWorkRequest {
            request_id: 1,
            particles: vec![OptimizedParticle {
                position: Vector3::ZERO,
                velocity: Vector3::ZERO,
                color: [1.0, 1.0, 1.0, 1.0],
                size: 1.0,
                lifetime: 1.0,
                age: 0.99, // Almost dead
                is_alive: true,
            }],
            delta_time: 0.02, // Push over the edge
            config: create_test_config(),
        };
        
        service.submit_work(request).unwrap();
        
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        let result = service.try_get_result().unwrap();
        let updated_particle = &result.particles[0];
        
        assert!(
            !updated_particle.is_alive,
            "Particle should die after exceeding lifetime"
        );
    }
    
    #[tokio::test]
    async fn test_color_interpolation() {
        let service = create_test_service();
        
        let request = ParticleWorkRequest {
            request_id: 1,
            particles: vec![OptimizedParticle {
                position: Vector3::ZERO,
                velocity: Vector3::ZERO,
                color: [1.0, 1.0, 1.0, 1.0],
                size: 1.0,
                lifetime: 2.0,
                age: 1.0, // Halfway through lifetime
                is_alive: true,
            }],
            delta_time: 0.0, // No time advance, just test interpolation
            config: create_test_config(),
        };
        
        service.submit_work(request).unwrap();
        
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        let result = service.try_get_result().unwrap();
        let updated_particle = &result.particles[0];
        
        // At t=0.5, alpha should be interpolated: 1.0*(1-0.5) + 0.0*0.5 = 0.5
        assert!(
            (updated_particle.color[3] - 0.5).abs() < 0.01,
            "Alpha should be interpolated (expected ~0.5, got {})",
            updated_particle.color[3]
        );
    }
    
    #[tokio::test]
    async fn test_multiple_particles() {
        let service = create_test_service();
        
        let particles: Vec<OptimizedParticle> = (0..10)
            .map(|i| OptimizedParticle {
                position: Vector3 {
                    x: i as f32,
                    y: 0.0,
                    z: 0.0,
                },
                velocity: Vector3::Y,
                color: [1.0, 1.0, 1.0, 1.0],
                size: 1.0,
                lifetime: 2.0,
                age: 0.0,
                is_alive: true,
            })
            .collect();
        
        let request = ParticleWorkRequest {
            request_id: 1,
            particles,
            delta_time: 0.016,
            config: create_test_config(),
        };
        
        service.submit_work(request).unwrap();
        
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        let result = service.try_get_result().unwrap();
        
        assert_eq!(result.particles.len(), 10, "Should process all particles");
        
        // All particles should have moved
        for (i, particle) in result.particles.iter().enumerate() {
            assert!(
                particle.position.y > 0.0,
                "Particle {} should have moved upward",
                i
            );
        }
    }
    
    #[tokio::test]
    async fn test_dead_particles_skip_update() {
        let service = create_test_service();
        
        let dead_particle = OptimizedParticle {
            position: Vector3 { x: 5.0, y: 5.0, z: 5.0 },
            velocity: Vector3::Y,
            color: [1.0, 1.0, 1.0, 1.0],
            size: 1.0,
            lifetime: 1.0,
            age: 1.5,
            is_alive: false, // Dead
        };
        
        let request = ParticleWorkRequest {
            request_id: 1,
            particles: vec![dead_particle],
            delta_time: 0.1,
            config: create_test_config(),
        };
        
        service.submit_work(request).unwrap();
        
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        
        let result = service.try_get_result().unwrap();
        let updated_particle = &result.particles[0];
        
        // Position should NOT change for dead particles
        assert_eq!(
            updated_particle.position,
            dead_particle.position,
            "Dead particle should not move"
        );
        assert!(!updated_particle.is_alive);
    }
}

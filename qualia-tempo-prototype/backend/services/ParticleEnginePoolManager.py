# QUALIA.CODE v1.1 - ParticleEnginePoolManager
# Manages process pool for parallel particle calculation
# ARCHITECTURE.GOLD.CODE v2: Backend calculates STATE via parallel workers

import asyncio
import logging
import multiprocessing as mp
import time
import uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
import yaml
from pathlib import Path

from backend.utils.decorators import log_execution, handle_errors, time_execution

logger = logging.getLogger(__name__)


@dataclass
class PoolConfig:
    """Configuration for the process pool (loaded from YAML)."""
    num_workers: int = 4
    max_tasks_per_child: int = 100
    queue_max_size: int = 50
    queue_timeout_seconds: float = 5.0
    max_retries: int = 3
    retry_delay_seconds: float = 0.5
    collect_metrics: bool = True
    health_check_interval_seconds: float = 10.0
    grace_period_seconds: float = 5.0


@dataclass
class PoolMetrics:
    """Performance metrics for the pool."""
    total_tasks_submitted: int = 0
    total_tasks_completed: int = 0
    total_tasks_failed: int = 0
    total_retries: int = 0
    average_execution_time_ms: float = 0.0
    active_workers: int = 0
    queue_size: int = 0


class ParticleEnginePoolManager:
    """
    Manages a pool of worker processes for particle calculation.
    
    QUALIA.CODE Compliance:
    - Implements LAW OF PERFECTION (production-grade error handling)
    - Uses decorators for logging and error handling
    - Externalized configuration via YAML
    - Full telemetry and monitoring
    
    ARCHITECTURE.GOLD.CODE Compliance:
    - Isolates heavy computation from main event loop
    - Workers return JSON-serializable state
    - Enables horizontal scaling of particle calculations
    
    Architecture Pattern: Process Pool + Task Queue
    - Main thread submits tasks to queue
    - Worker processes consume tasks and return results
    - Async/await integration for FastAPI compatibility
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the pool manager.
        
        Args:
            config_path: Path to process-pool.yaml config file
        """
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Pool state
        self.pool: Optional[mp.Pool] = None
        self.is_running = False
        self.metrics = PoolMetrics()
        
        # Task tracking
        self.pending_tasks: Dict[str, asyncio.Future] = {}
        self.task_execution_times: List[float] = []
        
        logger.info(f"🏊 ParticleEnginePoolManager initialized with {self.config.num_workers} workers")
    
    def _load_config(self, config_path: Optional[str]) -> PoolConfig:
        """Load pool configuration from YAML file."""
        if config_path is None:
            config_path = str(Path(__file__).parent.parent / "config" / "process-pool.yaml")
        
        try:
            with open(config_path, 'r') as f:
                yaml_config = yaml.safe_load(f)
            
            # Extract relevant config sections
            pool_cfg = yaml_config.get('pool', {})
            queue_cfg = yaml_config.get('queue', {})
            error_cfg = yaml_config.get('error_handling', {})
            perf_cfg = yaml_config.get('performance', {})
            mon_cfg = yaml_config.get('monitoring', {})
            shutdown_cfg = yaml_config.get('shutdown', {})
            
            return PoolConfig(
                num_workers=pool_cfg.get('num_workers', 4),
                max_tasks_per_child=pool_cfg.get('max_tasks_per_child', 100),
                queue_max_size=queue_cfg.get('max_size', 50),
                queue_timeout_seconds=queue_cfg.get('timeout_seconds', 5.0),
                max_retries=error_cfg.get('max_retries', 3),
                retry_delay_seconds=error_cfg.get('retry_delay_seconds', 0.5),
                collect_metrics=perf_cfg.get('collect_metrics', True),
                health_check_interval_seconds=mon_cfg.get('health_check_interval_seconds', 10.0),
                grace_period_seconds=shutdown_cfg.get('grace_period_seconds', 5.0)
            )
        except Exception as e:
            logger.warning(f"Failed to load pool config from {config_path}: {e}. Using defaults.")
            return PoolConfig()
    
    @log_execution()
    async def start(self) -> bool:
        """
        Start the process pool.
        
        Returns:
            True if pool started successfully
        """
        if self.is_running:
            logger.warning("Pool already running")
            return True
        
        try:
            # Create process pool
            # Using 'spawn' start method for better isolation and compatibility
            ctx = mp.get_context('spawn')
            
            self.pool = ctx.Pool(
                processes=self.config.num_workers,
                maxtasksperchild=self.config.max_tasks_per_child
            )
            
            self.is_running = True
            self.metrics.active_workers = self.config.num_workers
            
            logger.info(f"✅ Process pool started with {self.config.num_workers} workers")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start process pool: {e}", exc_info=True)
            return False
    
    @log_execution()
    async def stop(self) -> bool:
        """
        Stop the process pool gracefully.
        
        Returns:
            True if pool stopped successfully
        """
        if not self.is_running or self.pool is None:
            logger.warning("Pool not running")
            return True
        
        try:
            logger.info(f"🛑 Stopping process pool (grace period: {self.config.grace_period_seconds}s)...")
            
            # Close pool to new tasks
            self.pool.close()
            
            # Wait for pending tasks (with timeout)
            self.pool.join()
            
            self.is_running = False
            self.metrics.active_workers = 0
            self.pool = None  # Clear pool reference
            
            logger.info("✅ Process pool stopped")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to stop process pool gracefully: {e}", exc_info=True)
            
            # Force termination
            if self.pool:
                self.pool.terminate()
                self.pool.join()
            
            self.is_running = False
            return False
    
    @log_execution()
    @handle_errors(fallback_return_value=None)
    async def submit_task(
        self,
        dt: float,
        qualia_state: Optional[Dict[str, Any]] = None,
        command: str = "update"
    ) -> Optional[Dict[str, Any]]:
        """
        Submit a particle calculation task to the pool.
        
        Args:
            dt: Delta time for physics simulation
            qualia_state: QualiaState dictionary to apply
            command: Command to execute ("update", "initialize", "reset")
            
        Returns:
            WorkerResult dictionary or None if failed
        """
        if not self.is_running or self.pool is None:
            logger.error("Cannot submit task: pool not running")
            return None
        
        # Create task
        task_id = str(uuid.uuid4())
        task_dict = {
            'task_id': task_id,
            'dt': dt,
            'qualia_state': qualia_state,
            'command': command
        }
        
        try:
            # Submit to pool (using apply_async for non-blocking)
            # Note: We need to import the worker function dynamically to avoid import issues
            from backend.workers.ParticleEngineWorker import worker_process_task
            
            # Create a future to await the result
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            
            # Callback to resolve future when task completes
            def on_task_complete(result):
                if not future.done():
                    loop.call_soon_threadsafe(future.set_result, result)
                    self.metrics.total_tasks_completed += 1
                    
                    # Update execution time metrics
                    if result.get('success') and self.config.collect_metrics:
                        exec_time = result.get('execution_time_ms', 0.0)
                        self.task_execution_times.append(exec_time)
                        
                        # Keep only last 100 measurements
                        if len(self.task_execution_times) > 100:
                            self.task_execution_times = self.task_execution_times[-100:]
                        
                        # Update average
                        self.metrics.average_execution_time_ms = sum(self.task_execution_times) / len(self.task_execution_times)
            
            def on_task_error(error):
                if not future.done():
                    loop.call_soon_threadsafe(future.set_exception, error)
                    self.metrics.total_tasks_failed += 1
                    logger.error(f"Task {task_id} failed: {error}")
            
            # Submit task
            worker_id = self.metrics.total_tasks_submitted % self.config.num_workers
            self.pool.apply_async(
                worker_process_task,
                args=((worker_id, task_dict),),
                callback=on_task_complete,
                error_callback=on_task_error
            )
            
            self.metrics.total_tasks_submitted += 1
            self.pending_tasks[task_id] = future
            
            # Wait for result with timeout
            try:
                result = await asyncio.wait_for(future, timeout=self.config.queue_timeout_seconds)
                return result
            except asyncio.TimeoutError:
                logger.error(f"Task {task_id} timed out after {self.config.queue_timeout_seconds}s")
                self.metrics.total_tasks_failed += 1
                return None
            finally:
                # Cleanup
                self.pending_tasks.pop(task_id, None)
                
        except Exception as e:
            logger.error(f"Failed to submit task: {e}", exc_info=True)
            self.metrics.total_tasks_failed += 1
            return None
    
    @log_execution()
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get current pool metrics.
        
        Returns:
            Dictionary with performance metrics
        """
        return {
            'total_tasks_submitted': self.metrics.total_tasks_submitted,
            'total_tasks_completed': self.metrics.total_tasks_completed,
            'total_tasks_failed': self.metrics.total_tasks_failed,
            'success_rate': (
                (self.metrics.total_tasks_completed / self.metrics.total_tasks_submitted) * 100.0
                if self.metrics.total_tasks_submitted > 0 else 0.0
            ),
            'average_execution_time_ms': self.metrics.average_execution_time_ms,
            'active_workers': self.metrics.active_workers,
            'pending_tasks': len(self.pending_tasks),
            'is_running': self.is_running
        }
    
    async def health_check(self) -> bool:
        """
        Check if the pool is healthy.
        
        Returns:
            True if pool is operational
        """
        if not self.is_running or self.pool is None:
            return False
        
        # Simple health check: submit a minimal task
        try:
            result = await self.submit_task(dt=0.001, command="update")
            return result is not None and result.get('success', False)
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


# Singleton instance (optional, for convenience)
_pool_manager_instance: Optional[ParticleEnginePoolManager] = None

def get_pool_manager() -> ParticleEnginePoolManager:
    """Get or create the global pool manager instance."""
    global _pool_manager_instance
    if _pool_manager_instance is None:
        _pool_manager_instance = ParticleEnginePoolManager()
    return _pool_manager_instance

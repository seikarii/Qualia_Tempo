# QUALIA.CODE v1.1 - ParticleEnginePoolManager
# Manages process pool for parallel particle calculation
# ARCHITECTURE.GOLD.CODE v2: Backend calculates STATE via parallel workers

import asyncio
import multiprocessing as mp
from multiprocessing.pool import Pool
import uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

from backend.services.interfaces.IFileSystemService import IFileSystemService
from backend.services.interfaces.ILogger import ILogger
from backend.services.interfaces.IBaseService import IBaseService
from backend.services.interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager
from backend.services.contracts.IParticleEnginePoolManager_contracts import ParticleEnginePoolManagerConfig
from backend.utils.decorators import log_execution, handle_errors


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


class ParticleEnginePoolManager(IParticleEnginePoolManager, IBaseService):
    """
    Manages a pool of worker processes for particle calculation.
    
    QUALIA.CODE Compliance:
    - Implements LAW OF PERFECTION (production-grade error handling)
    - Uses decorators for logging and error handling
    - Direct configuration injection (no Service Locator)
    - Structured logging via injected ILogger
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
    
    def __init__(
        self,
        config: ParticleEnginePoolManagerConfig,
        logger: ILogger,
        file_system_service: IFileSystemService
    ):
        """
        Initialize the pool manager.
        
        Args:
            config: ParticleEnginePoolManagerConfig from container
            logger: Injected ILogger instance (QUALIA.CODE §5.3 Logging Standard)
            file_system_service: FileSystemService for file operations (QUALIA.CODE §4 Platform Abstraction)
        """
        self._config = config
        self._logger = logger
        self._file_system_service = file_system_service
        
        # Pool state
        self.pool: Optional[Pool] = None
        self.is_running = False
        self.metrics = PoolMetrics()
        
        # Task tracking
        self.pending_tasks: Dict[str, asyncio.Future] = {}
        self.task_execution_times: List[float] = []
        
        self._logger.info(f"🏊 ParticleEnginePoolManager initialized with {self._config.num_workers} workers")
    
    @log_execution()
    async def start(self) -> bool:
        """
        Start the process pool.
        
        Returns:
            True if pool started successfully
        """
        if self.is_running:
            self._logger.warning("Pool already running")
            return True
        
        try:
            # Create process pool
            # Using 'spawn' start method for better isolation and compatibility
            ctx = mp.get_context('spawn')
            
            self.pool = ctx.Pool(
                processes=self._config.num_workers,
                maxtasksperchild=self._config.max_tasks_per_child
            )
            
            self.is_running = True
            self.metrics.active_workers = self._config.num_workers
            
            self._logger.info(f"✅ Process pool started with {self._config.num_workers} workers")
            return True
            
        except Exception as e:
            self._logger.error(f"❌ Failed to start process pool: {e}", exc_info=True)
            return False
    
    @log_execution()
    async def stop(self) -> bool:
        """
        Stop the process pool gracefully.
        
        Returns:
            True if pool stopped successfully
        """
        if not self.is_running or self.pool is None:
            self._logger.warning("Pool not running")
            return True
        
        try:
            self._logger.info(f"🛑 Stopping process pool (grace period: {self._config.grace_period_seconds}s)...")
            
            # Close pool to new tasks
            self.pool.close()
            
            # Wait for pending tasks (with timeout)
            self.pool.join()
            
            self.is_running = False
            self.metrics.active_workers = 0
            self.pool = None  # Clear pool reference
            
            self._logger.info("✅ Process pool stopped")
            return True
            
        except Exception as e:
            self._logger.error(f"❌ Failed to stop process pool gracefully: {e}", exc_info=True)
            
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
            self._logger.error("Cannot submit task: pool not running")
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
            @log_execution()
            def on_task_complete(result: Any) -> None:
                if not future.done():
                    loop.call_soon_threadsafe(future.set_result, result)
                    self.metrics.total_tasks_completed += 1
                    
                    # Update execution time metrics
                    if result.get('success') and self._config.collect_metrics:
                        exec_time = result.get('execution_time_ms', 0.0)
                        self.task_execution_times.append(exec_time)
                        
                        # Keep only last 100 measurements
                        if len(self.task_execution_times) > 100:
                            self.task_execution_times = self.task_execution_times[-100:]
                        
                        # Update average
                        self.metrics.average_execution_time_ms = sum(self.task_execution_times) / len(self.task_execution_times)
            
            @log_execution()
            def on_task_error(error: BaseException) -> None:
                if not future.done():
                    loop.call_soon_threadsafe(future.set_exception, error)
                    self.metrics.total_tasks_failed += 1
                    self._logger.error(f"Task {task_id} failed: {error}")
            
            # Submit task
            worker_id = self.metrics.total_tasks_submitted % self._config.num_workers
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
                result = await asyncio.wait_for(future, timeout=self._config.queue_timeout_seconds)
                return dict(result) if result else None
            except asyncio.TimeoutError:
                self._logger.error(f"Task {task_id} timed out after {self._config.queue_timeout_seconds}s")
                self.metrics.total_tasks_failed += 1
                return None
            finally:
                # Cleanup
                self.pending_tasks.pop(task_id, None)
                
        except Exception as e:
            self._logger.error(f"Failed to submit task: {e}", exc_info=True)
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
    
    # ==================== IBaseService Lifecycle Methods (PHASE 3.3) ====================

    async def initialize(self) -> None:
        """
        Initialize ParticleEnginePoolManager lifecycle (IBaseService implementation).
        
        PHASE 3.3: IBaseService implementation.
        Starts the process pool for particle calculations.
        
        This method is called automatically during system startup.
        """
        self._logger.info("ParticleEnginePoolManager lifecycle initializing (IBaseService)")
        await self.start()
        self._logger.info("ParticleEnginePoolManager lifecycle initialized (IBaseService)")

    async def cleanup(self) -> None:
        """
        Cleanup ParticleEnginePoolManager resources (IBaseService implementation).
        
        PHASE 3.3: IBaseService implementation.
        Stops the process pool and cleans up all worker processes.
        
        This method MUST NOT raise exceptions (per IBaseService contract).
        """
        try:
            self._logger.info("ParticleEnginePoolManager lifecycle cleanup (IBaseService)")
            await self.stop()
        except Exception as e:
            # Log but don't raise (IBaseService contract requirement)
            self._logger.error(f"Error during ParticleEnginePoolManager cleanup: {e}")

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status for diagnostics (IBaseService implementation).
        
        PHASE 3.3: IBaseService implementation.
        Returns comprehensive diagnostic information about pool state.
        
        Returns:
            Dict with health metrics including:
            - service: Service name
            - status: "healthy", "degraded", or "error"
            - is_running: Whether pool is running
            - num_workers: Number of worker processes
            - total_tasks_submitted: Total tasks submitted
            - total_tasks_completed: Total tasks completed
            - total_tasks_failed: Total tasks failed
            - success_rate: Task success rate percentage
            - average_execution_time_ms: Average task execution time
            - pending_tasks: Number of pending tasks
            - active_workers: Number of active workers
        """
        # Determine status based on pool state and metrics
        if not self.is_running:
            status = "error"
        elif self.metrics.total_tasks_failed > self.metrics.total_tasks_completed:
            status = "degraded"
        else:
            status = "healthy"
        
        return {
            'service': 'ParticleEnginePoolManager',
            'status': status,
            'is_running': self.is_running,
            'num_workers': self._config.num_workers,
            'total_tasks_submitted': self.metrics.total_tasks_submitted,
            'total_tasks_completed': self.metrics.total_tasks_completed,
            'total_tasks_failed': self.metrics.total_tasks_failed,
            'success_rate': (
                (self.metrics.total_tasks_completed / self.metrics.total_tasks_submitted) * 100.0
                if self.metrics.total_tasks_submitted > 0 else 0.0
            ),
            'average_execution_time_ms': self.metrics.average_execution_time_ms,
            'pending_tasks': len(self.pending_tasks),
            'active_workers': self.metrics.active_workers
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
            self._logger.error(f"Health check failed: {e}")
            return False


# DEPRECATED: Singleton pattern removed for proper IoC compliance (QUALIA.CODE §2)
# ParticleEnginePoolManager must be obtained through CompositionRoot
# Keeping function stub for backward compatibility during migration
_pool_manager_instance: Optional[ParticleEnginePoolManager] = None

def get_pool_manager() -> ParticleEnginePoolManager:
    """
    DEPRECATED: Get the global pool manager instance.
    
    WARNING: This function is deprecated and will be removed in future versions.
    Use CompositionRoot.get_service("particle_system") instead for proper IoC.
    """
    global _pool_manager_instance
    if _pool_manager_instance is None:
        raise RuntimeError(
            "ParticleEnginePoolManager singleton is deprecated. "
            "Use CompositionRoot.get_service('particle_system') instead."
        )
    return _pool_manager_instance

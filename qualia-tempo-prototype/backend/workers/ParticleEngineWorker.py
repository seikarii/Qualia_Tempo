# QUALIA.CODE v1.1 - ParticleEngineWorker
# Worker process for parallel particle state calculation
# ARCHITECTURE.GOLD.CODE v2: Backend calculates STATE, never renders

import sys
import os
import logging
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.qualia_particle_engine import QualiaParticleEngine, create_qualia_particle_engine
from engine.ParticleStateCalculator import PhysicsConfig

# Configure worker-specific logger
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [PID:%(process)d] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class WorkerTask:
    """
    Input task for particle calculation.
    
    ARCHITECTURE.GOLD.CODE: This is the input contract for the worker.
    Contains all necessary state to perform particle calculation.
    """
    task_id: str
    dt: float
    qualia_state: Optional[Dict[str, Any]] = None
    particle_data: Optional[Any] = None  # NumPy array or None
    command: str = "update"  # Options: "update", "initialize", "reset"


@dataclass
class WorkerResult:
    """
    Output result from particle calculation.
    
    ARCHITECTURE.GOLD.CODE: This is the output contract for the worker.
    Contains calculated particle states (JSON-serializable).
    """
    task_id: str
    success: bool
    particle_states: list[dict[str, Any]]
    statistics: Dict[str, Any]
    execution_time_ms: float
    error_message: Optional[str] = None


class ParticleEngineWorker:
    """
    Worker process that executes ParticleEngine calculations.
    
    QUALIA.CODE Compliance:
    - Pure state calculation (no rendering)
    - Isolated in separate process
    - Communicates via serializable data structures
    - Follows LAW OF PERFECTION (production-grade from inception)
    
    ARCHITECTURE.GOLD.CODE Compliance:
    - Backend NEVER renders - only calculates state
    - Returns JSON-serializable particle states
    - Fully decoupled from GPU/rendering infrastructure
    """
    
    def __init__(self, worker_id: int, max_particles: int = 1000):
        """
        Initialize the worker process.
        
        Args:
            worker_id: Unique identifier for this worker
            max_particles: Maximum number of particles to simulate
        """
        self.worker_id = worker_id
        self.max_particles = max_particles
        self.engine: Optional[QualiaParticleEngine] = None
        self.initialized = False
        
        logger.info(f"🔷 Worker {worker_id} initializing...")
    
    def initialize_engine(self) -> bool:
        """
        Initialize the ParticleEngine for this worker.
        
        Returns:
            True if initialization successful
        """
        try:
            # Create engine instance (no EventBus in worker process)
            self.engine = create_qualia_particle_engine(
                max_particles=self.max_particles,
                enable_metrics=True
            )
            
            # Initialize with default particles
            success = self.engine.initialize_buffers()
            
            if success:
                self.initialized = True
                logger.info(f"✅ Worker {self.worker_id} engine initialized: {self.max_particles} particles")
                return True
            else:
                logger.error(f"❌ Worker {self.worker_id} engine initialization failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Worker {self.worker_id} initialization exception: {e}", exc_info=True)
            return False
    
    def process_task(self, task: WorkerTask) -> WorkerResult:
        """
        Process a single calculation task.
        
        Args:
            task: WorkerTask containing calculation parameters
            
        Returns:
            WorkerResult with particle states and statistics
        """
        start_time = time.time()
        
        try:
            # Lazy initialization
            if not self.initialized:
                if not self.initialize_engine():
                    return WorkerResult(
                        task_id=task.task_id,
                        success=False,
                        particle_states=[],
                        statistics={},
                        execution_time_ms=0.0,
                        error_message="Worker engine not initialized"
                    )
            
            # Handle different commands
            if task.command == "initialize":
                success = self.engine.initialize_buffers(particles_data=task.particle_data)
                particle_states = self.engine.get_particle_states() if success else []
                
            elif task.command == "update":
                # Apply QualiaState if provided
                if task.qualia_state:
                    self.engine.update_from_qualia_state(task.qualia_state)
                
                # Perform particle calculation
                success = self.engine.update(dt=task.dt)
                particle_states = self.engine.get_particle_states() if success else []
                
            elif task.command == "reset":
                success = self.engine.initialize_buffers()
                particle_states = self.engine.get_particle_states() if success else []
                
            else:
                return WorkerResult(
                    task_id=task.task_id,
                    success=False,
                    particle_states=[],
                    statistics={},
                    execution_time_ms=0.0,
                    error_message=f"Unknown command: {task.command}"
                )
            
            # Get statistics
            stats = self.engine.get_statistics()
            
            # Calculate execution time
            execution_time_ms = (time.time() - start_time) * 1000.0
            
            return WorkerResult(
                task_id=task.task_id,
                success=success,
                particle_states=particle_states,
                statistics=stats,
                execution_time_ms=execution_time_ms
            )
            
        except Exception as e:
            logger.error(f"❌ Worker {self.worker_id} task {task.task_id} failed: {e}", exc_info=True)
            execution_time_ms = (time.time() - start_time) * 1000.0
            
            return WorkerResult(
                task_id=task.task_id,
                success=False,
                particle_states=[],
                statistics={},
                execution_time_ms=execution_time_ms,
                error_message=str(e)
            )
    
    def cleanup(self):
        """Cleanup worker resources."""
        if self.engine:
            try:
                self.engine.cleanup()
                logger.info(f"🧹 Worker {self.worker_id} cleaned up")
            except Exception as e:
                logger.error(f"❌ Worker {self.worker_id} cleanup failed: {e}")


# Worker process entry point (used by multiprocessing.Pool)
def worker_process_task(args: tuple[int, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Entry point for worker process task execution.
    
    This function is called by multiprocessing.Pool.map() and must be
    picklable (hence it's a module-level function).
    
    Args:
        args: Tuple of (worker_id, task_dict)
        
    Returns:
        Dictionary representation of WorkerResult
    """
    worker_id, task_dict = args
    
    # Convert dict back to WorkerTask
    task = WorkerTask(**task_dict)
    
    # Create worker instance (ephemeral for each task in this implementation)
    # Alternative: Use initializer function to create persistent worker per process
    worker = ParticleEngineWorker(worker_id=worker_id, max_particles=task_dict.get('max_particles', 1000))
    
    try:
        result = worker.process_task(task)
        return asdict(result)
    finally:
        worker.cleanup()


# Alternative: Persistent worker initialization (for Pool with initializer)
_persistent_worker: Optional[ParticleEngineWorker] = None

def init_persistent_worker(worker_id: int, max_particles: int):
    """
    Initialize a persistent worker for the process pool.
    
    This function is called once per worker process when using Pool(initializer=...).
    """
    global _persistent_worker
    _persistent_worker = ParticleEngineWorker(worker_id=worker_id, max_particles=max_particles)
    _persistent_worker.initialize_engine()
    logger.info(f"🔷 Persistent worker {worker_id} initialized")


def persistent_worker_process_task(task_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process task using persistent worker.
    
    This function assumes init_persistent_worker() was called once per process.
    """
    global _persistent_worker
    
    if _persistent_worker is None:
        logger.error("❌ Persistent worker not initialized!")
        return asdict(WorkerResult(
            task_id=task_dict.get('task_id', 'unknown'),
            success=False,
            particle_states=[],
            statistics={},
            execution_time_ms=0.0,
            error_message="Persistent worker not initialized"
        ))
    
    task = WorkerTask(**task_dict)
    result = _persistent_worker.process_task(task)
    return asdict(result)


if __name__ == "__main__":
    # Test worker standalone
    logger.info("🧪 Testing ParticleEngineWorker standalone...")
    
    worker = ParticleEngineWorker(worker_id=0, max_particles=100)
    
    # Test task
    test_task = WorkerTask(
        task_id="test-001",
        dt=0.016,
        command="update"
    )
    
    result = worker.process_task(test_task)
    
    logger.info(f"✅ Test result: success={result.success}, particles={len(result.particle_states)}, time={result.execution_time_ms:.2f}ms")
    
    worker.cleanup()

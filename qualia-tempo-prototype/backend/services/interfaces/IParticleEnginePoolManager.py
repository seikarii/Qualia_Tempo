# QUALIA.CODE v1.1 - IParticleEnginePoolManager Interface
from typing import Protocol, Any, Dict, Optional

class IParticleEnginePoolManager(Protocol):
    """
    Interface for particle engine pool management.
    
    Manages a pool of worker processes for parallel particle calculations.
    Uses multiprocessing for CPU-intensive computations.
    """
    
    async def start(self) -> bool:
        """
        Start the process pool.
        
        Returns:
            True if pool started successfully
        """
        ...
    
    async def stop(self) -> bool:
        """
        Stop the process pool gracefully.
        
        Returns:
            True if pool stopped successfully
        """
        ...
    
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
        ...
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get current pool metrics.
        
        Returns:
            Dictionary with performance metrics
        """
        ...
    
    async def health_check(self) -> bool:
        """
        Check if the pool is healthy.
        
        Returns:
            True if pool is operational
        """
        ...

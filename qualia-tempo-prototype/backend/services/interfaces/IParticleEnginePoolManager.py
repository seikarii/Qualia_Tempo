# QUALIA.CODE v1.1 - IParticleEnginePoolManager Interface
from typing import Protocol, Any, Dict

class IParticleEnginePoolManager(Protocol):
    """Interface for particle engine pool management."""
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get statistics about the particle engine pool."""
        ...
    
    def shutdown(self) -> None:
        """Shutdown all particle engines in the pool."""
        ...

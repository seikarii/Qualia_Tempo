"""High-Fidelity Mock for IParticleEnginePoolManager"""
from typing import Dict, List, Any, Optional
from backend.services.interfaces.IParticleEnginePoolManager import IParticleEnginePoolManager


class MockParticleEnginePoolManager(IParticleEnginePoolManager):
    """High-fidelity mock for IParticleEnginePoolManager."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.submit_calls: List[Dict[str, Any]] = []
        self._started = False
        self.pool_size = 4
    
    async def start(self) -> bool:
        """Start process pool."""
        self._started = True
        return True
    
    async def stop(self) -> bool:
        """Stop process pool."""
        self._started = False
        return True
    
    async def submit_task(
        self,
        dt: float,
        qualia_state: Optional[Dict[str, Any]] = None,
        command: str = "update"
    ) -> Optional[Dict[str, Any]]:
        """Submit task to pool."""
        self.submit_calls.append({"dt": dt, "qualia_state": qualia_state, "command": command})
        return {"processed": True, "worker_id": 0}
    
    def get_pool_size(self) -> int:
        """Get pool size."""
        return self.pool_size
    
    async def health_check(self) -> bool:
        """Check pool health."""
        return self._started

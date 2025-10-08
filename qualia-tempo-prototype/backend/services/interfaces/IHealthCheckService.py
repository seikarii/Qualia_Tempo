# QUALIA.CODE v1.1 - IHealthCheckService Interface
from typing import Protocol, Dict, Any

class IHealthCheckService(Protocol):
    """Interface for health check service."""
    
    async def check_health(self) -> Dict[str, Any]:
        """Perform health check and return status."""
        ...
    
    def is_healthy(self) -> bool:
        """Check if system is healthy."""
        ...

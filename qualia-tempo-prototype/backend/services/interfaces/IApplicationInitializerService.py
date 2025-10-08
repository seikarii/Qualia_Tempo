# QUALIA.CODE v1.1 - IApplicationInitializerService Interface
from typing import Protocol, List

class IApplicationInitializerService(Protocol):
    """Interface for application initialization service."""
    
    async def initialize_services(self, services: List[Any]) -> None:
        """Initialize all services with lifecycle management."""
        ...
    
    async def cleanup_services(self) -> None:
        """Cleanup all services."""
        ...

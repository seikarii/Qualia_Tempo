"""High-Fidelity Mock for IApplicationInitializerService"""
from typing import List, Dict, Any
from backend.services.interfaces.IApplicationInitializerService import IApplicationInitializerService


class MockApplicationInitializerService(IApplicationInitializerService):
    """High-fidelity mock for IApplicationInitializerService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.start_calls = 0
        self.stop_calls = 0
        self._started = False
        self.services_initialized: List[str] = []
    
    async def start(self) -> None:
        """Start application initialization."""
        self.start_calls += 1
        self._started = True
    
    async def stop(self) -> None:
        """Stop application."""
        self.stop_calls += 1
        self._started = False
    
    def is_started(self) -> bool:
        """Check if started."""
        return self._started
    
    def get_initialization_status(self) -> Dict[str, Any]:
        """Get initialization status."""
        return {
            "started": self._started,
            "services_count": len(self.services_initialized),
            "start_calls": self.start_calls
        }

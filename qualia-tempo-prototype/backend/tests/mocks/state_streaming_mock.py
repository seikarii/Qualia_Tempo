"""High-Fidelity Mock for IStateStreamingService"""
from typing import Dict, List, Any
from backend.services.interfaces.IStateStreamingService import IStateStreamingService


class MockStateStreamingService(IStateStreamingService):
    """High-fidelity mock for IStateStreamingService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.stream_calls: List[Dict[str, Any]] = []
        self._streaming = False
    
    async def stream_state(self, state_data: Dict[str, Any]) -> None:
        """Stream state data."""
        self.stream_calls.append(state_data)
    
    def is_streaming(self) -> bool:
        """Check if streaming is active."""
        return self._streaming
    
    async def start(self) -> None:
        """Start streaming."""
        self._streaming = True
    
    async def stop(self) -> None:
        """Stop streaming."""
        self._streaming = False
    
    def get_active_connections(self) -> int:
        """Get number of active connections."""
        return 1 if self._streaming else 0
    
    async def shutdown(self) -> None:
        """Shutdown streaming service."""
        self._streaming = False

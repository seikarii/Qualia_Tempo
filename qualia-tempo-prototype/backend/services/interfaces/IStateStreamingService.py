# QUALIA.CODE v1.1 - IStateStreamingService Interface
from typing import Protocol, Any, Dict

class IStateStreamingService(Protocol):
    """Interface for state streaming service."""
    
    async def stream_state(self, state_data: Dict[str, Any]) -> None:
        """Stream state data."""
        ...
    
    def is_streaming(self) -> bool:
        """Check if streaming is active."""
        ...

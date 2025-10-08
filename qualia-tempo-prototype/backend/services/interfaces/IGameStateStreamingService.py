# QUALIA.CODE v1.1 - IGameStateStreamingService Interface
from typing import Protocol, Any, Dict

class IGameStateStreamingService(Protocol):
    """Interface for game state streaming service."""
    
    async def stream_combat_state(self, combat_state: Dict[str, Any]) -> None:
        """Stream combat state data."""
        ...
    
    def get_streaming_stats(self) -> Dict[str, Any]:
        """Get streaming statistics."""
        ...

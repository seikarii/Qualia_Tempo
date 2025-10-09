"""High-Fidelity Mock for IQualiaProcessor"""
from typing import Dict, List, Any, Optional
from backend.services.interfaces.IQualiaProcessor import IQualiaProcessor


class MockQualiaProcessor(IQualiaProcessor):
    """High-fidelity mock for IQualiaProcessor."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.process_calls: List[Dict[str, Any]] = []
        self.current_state: Optional[Dict[str, Any]] = None
        self._enabled = True
    
    async def process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """Process qualia state."""
        self.process_calls.append(qualia_state)
        self.current_state = qualia_state
    
    def get_current_state(self) -> Optional[Dict[str, Any]]:
        """Get current qualia state."""
        return self.current_state
    
    def enable(self) -> None:
        """Enable qualia processing."""
        self._enabled = True
    
    def disable(self) -> None:
        """Disable qualia processing."""
        self._enabled = False
    
    def is_enabled(self) -> bool:
        """Check if processor is enabled."""
        return self._enabled

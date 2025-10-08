# QUALIA.CODE v1.1 - IPatternSystemService Interface
from typing import Protocol, Any, Dict, List

class IPatternSystemService(Protocol):
    """Interface for pattern system service."""
    
    def get_active_patterns(self) -> List[Dict[str, Any]]:
        """Get list of currently active patterns."""
        ...
    
    def register_pattern(self, pattern_id: str, pattern_data: Dict[str, Any]) -> None:
        """Register a new pattern."""
        ...

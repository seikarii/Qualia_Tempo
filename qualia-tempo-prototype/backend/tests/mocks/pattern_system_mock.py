"""High-Fidelity Mock for IPatternSystemService"""
from typing import Dict, List, Optional, Any
from backend.services.interfaces.IPatternSystemService import IPatternSystemService


class MockPatternSystemService(IPatternSystemService):
    """High-fidelity mock for IPatternSystemService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.patterns: Dict[str, Dict[str, Any]] = {
            "dash_attack": {"type": "melee", "damage": 50},
            "projectile": {"type": "ranged", "damage": 30}
        }
        self.load_calls: List[str] = []
    
    def load_patterns(self, pattern_file: str) -> bool:
        """Load patterns from file."""
        self.load_calls.append(pattern_file)
        return True
    
    def get_pattern(self, pattern_id: str) -> Optional[Dict[str, Any]]:
        """Get pattern by ID."""
        return self.patterns.get(pattern_id)
    
    def get_patterns_by_type(self, pattern_type: str) -> List[Dict[str, Any]]:
        """Get patterns by type."""
        return [p for p in self.patterns.values() if p.get("type") == pattern_type]
    
    def validate_pattern(self, pattern_data: Dict[str, Any]) -> bool:
        """Validate pattern data."""
        return "type" in pattern_data and "damage" in pattern_data
    
    def get_pattern_count(self) -> int:
        """Get pattern count."""
        return len(self.patterns)

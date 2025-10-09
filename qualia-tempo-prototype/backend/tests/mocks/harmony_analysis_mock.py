"""High-Fidelity Mock for IHarmonyAnalysisService"""
from typing import Dict, List, Any
from backend.services.interfaces.IHarmonyAnalysisService import IHarmonyAnalysisService


class MockHarmonyAnalysisService(IHarmonyAnalysisService):
    """High-fidelity mock for IHarmonyAnalysisService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.analyze_calls: List[List[str]] = []
        self.harmony_score = 0.85
    
    def analyze_harmony(self, notes: List[str]) -> Dict[str, Any]:
        """Analyze harmonic content."""
        self.analyze_calls.append(notes)
        return {
            "harmony_score": self.harmony_score,
            "consonance": 0.90,
            "dissonance": 0.10,
            "key": "C major"
        }
    
    def get_consonance_score(self, notes: List[str]) -> float:
        """Get consonance score."""
        return 0.90
    
    def detect_key(self, notes: List[str]) -> str:
        """Detect musical key."""
        return "C major"

# QUALIA.CODE v1.1 - IHarmonyAnalysisService Contracts
from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class HarmonyAnalysisConfig:
    """
    Configuration contract for HarmonyAnalysisService.
    
    Matches harmony-analysis.yaml structure (8 main sections).
    All sections are Dict[str, Any] to support nested YAML structures.
    """
    musical_notes: Dict[str, Any]        # Note mappings, frequencies, scales
    harmonic_intervals: Dict[str, Any]   # Perfect & imperfect consonances
    chaotic_intervals: Dict[str, Any]    # Strong & moderate dissonances
    chord_patterns: Dict[str, Any]       # Harmonic & chaotic chord patterns
    scoring_weights: Dict[str, Any]      # Song/qualia/timing weights
    thresholds: Dict[str, Any]           # Harmonic/chaotic/neutral thresholds
    analysis_windows: Dict[str, Any]     # Time windows for analysis
    qualia_color_to_note: Dict[str, Any] # RGB color to musical note mapping
    features: Dict[str, bool]            # Feature flags

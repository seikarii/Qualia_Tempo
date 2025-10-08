# QUALIA.CODE v1.1 - IPatternSystemService Contracts
from dataclasses import dataclass, field
from typing import List

@dataclass
class PatternSystemConfig:
    """Configuration contract for PatternSystemService."""
    max_active_patterns: int = 10
    pattern_cache_size: int = 100
    enable_pattern_prediction: bool = True
    default_patterns: List[str] = field(default_factory=list)

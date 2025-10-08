# QUALIA.CODE v1.1 - IQualiaProcessor Contracts
from dataclasses import dataclass

@dataclass
class QualiaProcessorConfig:
    """Configuration contract for QualiaProcessor."""
    processing_enabled: bool = True
    intensity_spike_threshold: float = 0.3
    transcendence_threshold: float = 0.8
    chaos_threshold: float = 0.7
    enable_state_analysis: bool = True
    performance_monitoring: bool = True

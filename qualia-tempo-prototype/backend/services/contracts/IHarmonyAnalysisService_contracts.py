# QUALIA.CODE v1.1 - IHarmonyAnalysisService Contracts
from dataclasses import dataclass

@dataclass
class HarmonyAnalysisConfig:
    """Configuration contract for HarmonyAnalysisService."""
    enable_analysis: bool = True
    sample_rate: int = 44100
    fft_size: int = 2048
    hop_length: int = 512
    min_frequency: float = 20.0
    max_frequency: float = 20000.0

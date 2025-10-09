# QUALIA.CODE v1.1 - IGameStateStreamingService Contracts
from dataclasses import dataclass

@dataclass
class GameStateStreamingServiceConfig:
    """
    Configuration contract for GameStateStreamingService.
    
    Direct configuration injection per QUALIA.CODE §II.2.3 Step 3.
    """
    target_fps: float = 60.0
    enable_delta_compression: bool = True
    max_state_history: int = 100

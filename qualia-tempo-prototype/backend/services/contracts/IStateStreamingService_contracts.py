# QUALIA.CODE v1.1 - IStateStreamingService Contracts
from dataclasses import dataclass

@dataclass
class StateStreamingServiceConfig:
    """
    Configuration contract for StateStreamingService.
    
    Direct configuration injection per QUALIA.CODE §II.2.3 Step 3.
    """
    target_fps: float = 30.0
    enable_streaming: bool = True
    max_queue_size: int = 100

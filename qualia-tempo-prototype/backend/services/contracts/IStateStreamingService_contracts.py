# QUALIA.CODE v1.1 - IStateStreamingService Contracts
from dataclasses import dataclass

@dataclass
class StateStreamingConfig:
    """Configuration contract for StateStreamingService."""
    enable_streaming: bool = True
    throttle_interval_ms: int = 16
    max_queue_size: int = 100
    compression_enabled: bool = False

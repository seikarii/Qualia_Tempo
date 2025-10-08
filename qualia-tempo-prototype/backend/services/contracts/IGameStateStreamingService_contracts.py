# QUALIA.CODE v1.1 - IGameStateStreamingService Contracts
from dataclasses import dataclass

@dataclass
class GameStateStreamingConfig:
    """Configuration contract for GameStateStreamingService."""
    enable_combat_streaming: bool = True
    stream_interval_ms: int = 50
    max_state_history: int = 100
    enable_delta_compression: bool = True

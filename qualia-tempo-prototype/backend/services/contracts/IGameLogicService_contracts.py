# QUALIA.CODE v1.1 - IGameLogicService Contracts
from dataclasses import dataclass

@dataclass
class GameLogicConfig:
    """Configuration contract for GameLogicService."""
    tick_rate: float = 60.0
    enable_combat_mechanics: bool = True
    enable_rhythm_mechanics: bool = True
    debug_mode: bool = False

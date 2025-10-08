# QUALIA.CODE v1.1 - IGameLogicService Contracts
from dataclasses import dataclass
from typing import Dict, List, Any

@dataclass
class GameLogicConfig:
    """
    Configuration contract for GameLogicService.
    
    Matches the structure of game-logic.yaml configuration file.
    All game logic parameters are externalized for easy tuning.
    """
    # Qualia Generation Settings
    qualia_generation: Dict[str, Any]
    
    # Combo System Settings
    combo_system: Dict[str, Any]
    
    # Score Calculation Settings
    scoring: Dict[str, Any]
    
    # Health Management Settings
    health_system: Dict[str, Any]
    
    # Ability Cooldown Settings
    cooldowns: Dict[str, Any]
    
    # Difficulty Settings (Volume-Based)
    difficulty: Dict[str, Any]
    
    # Game State Settings
    game_state: Dict[str, Any]
    
    # Feature Flags
    features: Dict[str, bool]

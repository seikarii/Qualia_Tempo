"""High-Fidelity Mock for IGameLogicService"""
from typing import Dict, List, Any, Optional, Tuple
from backend.services.interfaces.IGameLogicService import IGameLogicService, QualiaEntity


class MockGameLogicService(IGameLogicService):
    """High-fidelity mock for IGameLogicService."""
    
    def __init__(self):
        self.reset()
    
    def reset(self) -> None:
        """Reset mock state."""
        self.player_health = 100.0
        self.boss_health = 1000.0
        self.score = 0
        self.combo = 0
        self.update_calls: List[Tuple[float, float]] = []
    
    def initialize_game(self, player_id: str, boss_id: str, song_duration_sec: float) -> None:
        """Initialize game session."""
        self.player_health = 100.0
        self.boss_health = 1000.0
        self.score = 0
        self.combo = 0
    
    def update_game_state(self, delta_time: float, current_time: float) -> Dict[str, Any]:
        """Update game state."""
        self.update_calls.append((delta_time, current_time))
        return {
            "player_health": self.player_health,
            "boss_health": self.boss_health,
            "score": self.score,
            "combo": self.combo
        }
    
    def apply_damage(self, target: str, amount: float) -> bool:
        """Apply damage to target."""
        if target == "player":
            self.player_health -= amount
        elif target == "boss":
            self.boss_health -= amount
        return True
    
    def get_game_state(self) -> Dict[str, Any]:
        """Get current game state."""
        return {
            "player_health": self.player_health,
            "boss_health": self.boss_health,
            "score": self.score
        }
    
    def process_player_dash(self, player_id: str, position: Dict[str, float], 
                           direction: Dict[str, float], on_beat: bool, 
                           timestamp: float) -> List[QualiaEntity]:
        """Process player dash action."""
        return []
    
    def process_ability_use(
        self,
        player_id: str,
        ability_key: str,
        position: Dict[str, float],
        on_beat: bool,
        timestamp: float
    ) -> Tuple[bool, Optional[QualiaEntity], Optional[str]]:
        """Process ability use."""
        return (True, None, None)
    
    def process_metronome_tick(self, beat_number: int, bpm: float, 
                               timestamp: float) -> List[QualiaEntity]:
        """Process metronome tick."""
        return []
    
    def update_tempo(self, tempo_bpm: float) -> None:
        """Update tempo."""
        pass
    
    def update_volume(self, volume: float) -> None:
        """Update volume."""
        pass
    
    def get_current_combo_multiplier(self) -> float:
        """Get combo multiplier."""
        return 1.0 + (self.combo * 0.1)
    
    def process_boss_attack(self, pattern_id: str, damage: float, 
                           timestamp: float) -> Dict[str, Any]:
        """Process boss attack."""
        return {"success": True}
    
    def check_player_dodge(self, player_pos: Dict[str, float], 
                          attack_pos: Dict[str, float]) -> bool:
        """Check if player dodged attack."""
        return False
